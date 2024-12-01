import { visionClient } from '../config/google-cloud';

async function testVisionAPI() {
    try {
        console.log('Testing Google Cloud Vision API connection...');
        
        // Simple base64 test image (1x1 pixel)
        const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
        
        const request = {
            image: {
                content: base64Image
            },
            features: [
                { type: 'LABEL_DETECTION' }
            ]
        };

        console.log('Sending request to Vision API...');
        const [result] = await visionClient.annotateImage(request);
        
        if (result.error) {
            console.error('❌ Vision API returned an error:', result.error);
            process.exit(1);
        }
        
        console.log('✅ Successfully connected to Google Cloud Vision API');
        console.log('API Response:', JSON.stringify(result, null, 2));
        
    } catch (error: any) {
        console.error('❌ Error testing Vision API:', error);
        if (error.message.includes('Could not load the default credentials')) {
            console.error('💡 Make sure GOOGLE_APPLICATION_CREDENTIALS is set correctly and points to your credentials file');
        }
        process.exit(1);
    }
}

testVisionAPI();
