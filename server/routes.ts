import type { Express } from "express";
import axios from 'axios';
import dotenv from "dotenv";
import rateLimit from 'express-rate-limit';
import { AppDataSource } from "./database";
import { User } from "./database/entities/User";
import { Consultation } from "./database/entities/Consultation";
import { analyzeImageWithVision } from './config/google-cloud';

// Load environment variables
dotenv.config();

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1';

// Rate limiter configuration
const beautyAdviceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 50, // limit each IP to 50 requests per windowMs
  message: { error: 'Too many requests, please try again after an hour' }
});

export function registerRoutes(app: Express) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Anthropic API key not found! Please set ANTHROPIC_API_KEY in your .env file");
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error("Google Cloud credentials not found! Please set GOOGLE_APPLICATION_CREDENTIALS in your .env file");
    process.exit(1);
  }

  const anthropicAxios = axios.create({
    baseURL: ANTHROPIC_API_URL,
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    }
  });

  // Get user's consultation history
  app.get('/api/consultations/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: userId },
        relations: ['consultations']
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json(user.consultations);
    } catch (error) {
      console.error('Error fetching consultations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Get consultation history
  app.get('/api/consultation-history/:userId', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'Invalid user ID' });
      }

      const userRepository = AppDataSource.getRepository(User);
      const consultationRepository = AppDataSource.getRepository(Consultation);
      
      // First, ensure the user exists
      let user = await userRepository.findOne({
        where: { id: userId }
      });

      // If user doesn't exist, create them
      if (!user) {
        try {
          user = userRepository.create({
            id: userId,
            email: `user${userId}@example.com`,
            name: `User ${userId}`
          });
          await userRepository.save(user);
          console.log(`Created new user with ID: ${userId}`);
        } catch (err) {
          console.error('Error creating user:', err);
          return res.status(500).json({ error: 'Failed to create user' });
        }
      }

      // Now fetch consultations with better error handling
      try {
        const consultations = await consultationRepository
          .createQueryBuilder('consultation')
          .leftJoinAndSelect('consultation.user', 'user')
          .where('user.id = :userId', { userId })
          .orderBy('consultation.createdAt', 'DESC')
          .getMany();
        
        console.log(`Found ${consultations.length} consultations for user ${userId}`);
        
        // Map the consultations to include only necessary data
        const mappedConsultations = consultations.map(consultation => ({
          id: consultation.id,
          imageUrl: consultation.imageUrl,
          prompt: consultation.prompt,
          advice: consultation.advice,
          createdAt: consultation.createdAt
        }));
        
        res.json(mappedConsultations);
      } catch (err) {
        console.error('Error fetching consultations:', err);
        res.status(500).json({ error: 'Failed to fetch consultations from database' });
      }
    } catch (error) {
      console.error('Error in consultation history endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Login user
  app.post('/api/login', async (req, res) => {
    try {
      const { email } = req.body;

      // Input validation
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      if (typeof email !== 'string') {
        return res.status(400).json({ error: 'Invalid input type' });
      }

      const userRepository = AppDataSource.getRepository(User);

      const user = await userRepository.findOne({
        where: { email }
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found. Please register first.' });
      }

      res.json(user);
    } catch (error) {
      console.error('Error logging in user:', error);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  });

  // Register new user
  app.post('/api/register', async (req, res) => {
    try {
      const { name, email } = req.body;

      // Input validation
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      if (typeof name !== 'string' || typeof email !== 'string') {
        return res.status(400).json({ error: 'Invalid input types' });
      }

      const userRepository = AppDataSource.getRepository(User);

      const existingUser = await userRepository.findOne({
        where: { email }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const user = new User();
      user.name = name;
      user.email = email;

      const savedUser = await userRepository.save(user);
      res.status(201).json(savedUser);
    } catch (error) {
      console.error('Error registering user:', error);
      res.status(500).json({ error: 'Internal server error during registration' });
    }
  });

  // Get beauty advice
  app.post('/api/beauty-advice', beautyAdviceLimiter, async (req, res) => {
    try {
      const { userId, imageUrl, prompt } = req.body;

      // Input validation
      if (!imageUrl || !prompt) {
        return res.status(400).json({ error: 'Image and prompt are required' });
      }

      // Validate image format
      if (!imageUrl.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format' });
      }

      // Extract image data
      const base64Data = imageUrl.split(',')[1];
      if (!base64Data) {
        return res.status(400).json({ error: 'Invalid image data' });
      }

      // Check image size (max 5MB)
      const imageSize = Buffer.from(base64Data, 'base64').length;
      if (imageSize > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image size must be less than 5MB' });
      }

      // Get or create user
      const userRepository = AppDataSource.getRepository(User);
      let user = await userRepository.findOne({
        where: { id: parseInt(userId) }
      });

      if (!user) {
        user = userRepository.create({
          id: parseInt(userId),
          email: `user${userId}@example.com`,
          name: `User ${userId}`
        });
        await userRepository.save(user);
      }

      // Analyze image with Google Cloud Vision
      let imageAnalysis;
      try {
        imageAnalysis = await analyzeImageWithVision(imageUrl);
        if (!imageAnalysis) {
          return res.status(400).json({ error: 'Failed to analyze image' });
        }
        if (imageAnalysis.error) {
          return res.status(400).json({ error: `Image analysis failed: ${imageAnalysis.error}` });
        }
        if (!imageAnalysis.faces || imageAnalysis.faces.length === 0) {
          return res.status(400).json({ error: 'No face detected in the image. Please upload a clear photo of a face.' });
        }
      } catch (error: any) {
        console.error('Error analyzing image:', error);
        return res.status(500).json({ error: 'Failed to analyze image with Vision API' });
      }

      // Get beauty advice from Claude
      try {
        const response = await anthropicAxios.post('/messages', {
          model: 'claude-3-opus-20240229',
          max_tokens: 1024,
          messages: [{
            role: 'user',
            content: `You are a professional makeup artist and beauty consultant. Based on this image analysis: ${JSON.stringify(imageAnalysis)}

User question: ${prompt}

You must follow this EXACT format for your response, using the exact same heading style and emoji placement:

# ✨ Your Personalized Beauty Guide

**Key Features** 🎭
• [One clear observation about their features]
• [Another key observation]
• [Final key observation]

**Makeup Magic** 💄
• [Specific makeup recommendation]
• [Another makeup tip]
• [Final makeup suggestion]

**Skincare Secrets** ✨
• [Important skincare tip]
• [Another skincare recommendation]
• [Final skincare advice]

**Style Stars** 💫
• [Key style recommendation]
• [Another style tip]
• [Final style suggestion]

**Next Steps** 💝
[2-3 sentences with clear, actionable next steps]

Important rules to follow:
1. Use EXACTLY this format with no deviations
2. Each bullet point must be a complete, actionable recommendation
3. Keep the tone friendly but professional
4. Each section should have exactly 3 bullet points
5. Use the exact emojis shown above
6. Do not add any additional sections or headings`
          }]
        });

        if (!response.data.content || !response.data.content[0].text) {
          throw new Error('Invalid response from AI model');
        }

        const advice = response.data.content[0].text;

        // Save consultation
        const consultationRepository = AppDataSource.getRepository(Consultation);
        const consultation = consultationRepository.create({
          user,
          imageUrl,
          prompt,
          advice,
          createdAt: new Date()
        });
        await consultationRepository.save(consultation);

        res.json({ advice });
      } catch (error: any) {
        console.error('Error getting AI advice:', error);
        return res.status(500).json({ error: 'Failed to get beauty advice from AI' });
      }
    } catch (error: any) {
      console.error('Error in beauty advice endpoint:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Delete consultation
  app.delete('/api/consultation/:id', async (req, res) => {
    try {
      const consultationId = parseInt(req.params.id);
      
      if (isNaN(consultationId)) {
        return res.status(400).json({ error: 'Invalid consultation ID' });
      }

      const consultationRepository = AppDataSource.getRepository(Consultation);
      
      const consultation = await consultationRepository.findOne({
        where: { id: consultationId },
        relations: ['user']
      });

      if (!consultation) {
        return res.status(404).json({ error: 'Consultation not found' });
      }

      await consultationRepository.remove(consultation);
      console.log(`Deleted consultation ${consultationId}`);
      
      res.json({ message: 'Consultation deleted successfully' });
    } catch (error) {
      console.error('Error deleting consultation:', error);
      res.status(500).json({ error: 'Failed to delete consultation' });
    }
  });
}
