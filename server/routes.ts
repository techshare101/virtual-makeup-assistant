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
      if (!userId || !imageUrl || !prompt) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      try {
        // Validate image size (max 20MB)
        const base64Size = imageUrl.length * 3 / 4;
        if (base64Size > 20 * 1024 * 1024) {
          return res.status(400).json({ error: 'Image size too large. Please use an image under 20MB.' });
        }

        // Analyze image with Google Cloud Vision
        const visionAnalysis = await analyzeImageWithVision(imageUrl);
        
        if (!visionAnalysis || visionAnalysis.error) {
          console.warn('Vision API analysis failed:', visionAnalysis?.error);
          return res.status(500).json({ error: 'Failed to analyze image' });
        }

        // Extract relevant information from Vision API results
        const faceDetails = visionAnalysis.faces.map(face => {
          const emotions: string[] = [];
          if (face.joyLikelihood === 'VERY_LIKELY' || face.joyLikelihood === 'LIKELY') emotions.push('joy');
          if (face.sorrowLikelihood === 'VERY_LIKELY' || face.sorrowLikelihood === 'LIKELY') emotions.push('sorrow');
          return {
            emotions,
            confidence: face.detectionConfidence
          };
        });

        // Enhance the prompt with vision analysis
        const enhancedPrompt = `${prompt}\n\nImage Analysis:\n- Found ${faceDetails.length} face(s)\n- Detected emotions: ${faceDetails.map(f => f.emotions.join(', ')).join('; ')}\n- Key features: ${visionAnalysis.labels.join(', ')}`;

        try {
          // Convert data URL to base64
          const base64Image = imageUrl.split(',')[1];
          
          console.log('Making request to Anthropic API...');
          console.log('Request URL:', `${ANTHROPIC_API_URL}/messages`);
          console.log('Headers:', {
            'x-api-key': 'present',
            'anthropic-version': anthropicAxios.defaults.headers['anthropic-version'],
            'Content-Type': anthropicAxios.defaults.headers['Content-Type']
          });

          const requestBody = {
            model: 'claude-3-opus-20240229',
            system: "You are a professional beauty consultant. Analyze the image and provide specific, actionable beauty advice based on the user's features and any concerns they mention.",
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: enhancedPrompt
                  },
                  {
                    type: 'image',
                    source: {
                      type: 'base64',
                      media_type: 'image/jpeg',
                      data: base64Image
                    }
                  }
                ]
              }
            ],
            max_tokens: 1000,
            temperature: 0.7,
            top_p: 0.95
          };

          try {
            console.log('Sending request to Anthropic API...');
            console.log('Request structure:', {
              model: requestBody.model,
              system: requestBody.system,
              messageCount: requestBody.messages.length,
              hasImage: !!requestBody.messages[0].content[1].source.data
            });

            const response = await anthropicAxios.post('/messages', requestBody, {
              timeout: 60000, // Increase timeout to 60 seconds
              headers: {
                'x-api-key': process.env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            });
            
            if (!response.data) {
              console.error('Empty response from Anthropic API');
              throw new Error('Empty response from Anthropic API');
            }
            
            console.log('Anthropic API Response:', {
              status: response.status,
              statusText: response.statusText,
              data: response.data
            });

            if (!response.data.content?.[0]?.text) {
              console.error('Invalid response format:', JSON.stringify(response.data, null, 2));
              throw new Error('Invalid response format from Anthropic API');
            }

            const advice = response.data.content[0].text;

            // Save consultation
            const consultation = new Consultation();
            consultation.userId = userId;
            consultation.imageUrl = imageUrl;
            consultation.prompt = prompt;
            consultation.advice = advice;
            
            const consultationRepository = AppDataSource.getRepository(Consultation);
            await consultationRepository.save(consultation);

            res.json({
              advice,
              consultation_id: consultation.id
            });
          } catch (error: any) {
            console.error('Anthropic API Error Details:', {
              message: error.message,
              response: {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
              },
              request: {
                method: error.config?.method,
                url: error.config?.url,
                headers: {
                  ...error.config?.headers,
                  'x-api-key': 'present' // Hide actual key
                }
              }
            });
            
            if (error.code === 'ECONNABORTED') {
              return res.status(504).json({ 
                error: 'Request timeout',
                details: 'The request to the Anthropic API timed out. Please try again.'
              });
            }
            
            if (error.response?.status === 401) {
              return res.status(401).json({ 
                error: 'Authentication error',
                details: 'Invalid API key or authentication failed'
              });
            } else if (error.response?.status === 429) {
              return res.status(429).json({ 
                error: 'Rate limit exceeded',
                details: 'Please try again later'
              });
            } else {
              return res.status(500).json({ 
                error: 'Failed to generate beauty advice',
                details: error.response?.data?.error?.message || error.message || 'Unknown error'
              });
            }
          }
        } catch (error) {
          console.error('Error processing image:', error);
          return res.status(500).json({ error: 'Failed to process image' });
        }
      } catch (error) {
        console.error('Error processing image:', error);
        return res.status(500).json({ error: 'Failed to process image' });
      }
    } catch (error) {
      console.error('Server error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
}
