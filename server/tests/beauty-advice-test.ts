import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function testBeautyAdvice() {
    try {
        // Read the test image
        const imagePath = path.join(__dirname, 'test-image.jpg');
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

        // Make request to beauty advice endpoint with updated headers
        const response = await axios.post('http://localhost:5000/api/beauty-advice', {
            userId: 8,  // Updated to match our test user ID
            imageUrl: base64Image,
            prompt: "What makeup would suit me best? Please consider my skin tone and features."
        });

        console.log('✅ Beauty Advice Test Results:');
        console.log('\nAI Advice:');
        console.log(response.data.advice);
        
        console.log('\nVision API Analysis:');
        console.log('Faces:', JSON.stringify(response.data.analysis.faces, null, 2));
        console.log('Labels:', response.data.analysis.labels);

    } catch (error: any) {
        console.error('❌ Test failed:', error.response?.data || error.message);
    }
}

// Run the test
console.log('Starting Beauty Advice API test...');
testBeautyAdvice();
