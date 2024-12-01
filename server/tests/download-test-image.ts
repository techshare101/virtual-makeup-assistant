import axios from 'axios';
import fs from 'fs';
import path from 'path';

async function downloadTestImage() {
    try {
        // Using a sample image from a free stock photo site
        const imageUrl = 'https://images.pexels.com/photos/2681751/pexels-photo-2681751.jpeg';
        const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        
        const imagePath = path.join(__dirname, 'test-image.jpg');
        fs.writeFileSync(imagePath, response.data);
        
        console.log('✅ Test image downloaded successfully to:', imagePath);
    } catch (error) {
        console.error('❌ Failed to download test image:', error);
    }
}

downloadTestImage();
