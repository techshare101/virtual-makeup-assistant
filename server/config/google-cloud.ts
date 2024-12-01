import vision from '@google-cloud/vision';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the Vision client with credentials from environment variable
export const visionClient = new vision.ImageAnnotatorClient({
    keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// Helper function to analyze image with Google Cloud Vision
export async function analyzeImageWithVision(imageUrl: string) {
    try {
        // Remove data:image/jpeg;base64, prefix
        const base64Image = imageUrl.split(',')[1];
        const request = {
            image: {
                content: base64Image
            },
            features: [
                { type: 'FACE_DETECTION' },
                { type: 'LANDMARK_DETECTION' },
                { type: 'LABEL_DETECTION' }
            ]
        };

        const [result] = await visionClient.annotateImage(request);
        
        if (result.error) {
            console.error('Vision API error:', result.error);
            return null;
        }
        
        return {
            faces: result.faceAnnotations || [],
            landmarks: result.landmarkAnnotations || [],
            labels: result.labelAnnotations || [],
            error: null
        };
    } catch (error: any) {
        console.error('Error analyzing image with Vision API:', error);
        return {
            faces: [],
            landmarks: [],
            labels: [],
            error: error.message || 'Failed to analyze image'
        };
    }
}
