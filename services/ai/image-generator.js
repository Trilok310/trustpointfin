const fs = require('fs');
const path = require('path');

const CACHE_DIR = path.join(__dirname, '..', '..', 'assets', 'generated');

if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
}

class ImageGenerator {
    constructor(provider = 'MOCK') {
        this.provider = process.env.IMAGE_PROVIDER || provider;
    }

    async generateIllustration(visualSpec, topic, slideIndex) {
        const cacheKey = `${topic.replace(/[^a-zA-Z0-9]/g, '_')}_slide_${slideIndex}.jpg`;
        const cachePath = path.join(CACHE_DIR, cacheKey);

        if (fs.existsSync(cachePath)) {
            console.log(`[Image Generator] Using cached image for slide ${slideIndex}`);
            return cachePath;
        }

        console.log(`[Image Generator] Generating image for slide ${slideIndex} via ${this.provider}...`);
        
        // --- PROVIDER ABSTRACTION ---
        if (this.provider === 'DALLE') {
            if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing!");
            
            console.log(`[Image Generator] Calling DALL-E 3 API...`);
            const response = await fetch("https://api.openai.com/v1/images/generations", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "dall-e-3",
                    prompt: visualSpec.image_generation_prompt,
                    n: 1,
                    size: "1024x1024" // DALL-E 3 default, will be cropped/scaled by renderer CSS
                })
            });
            
            const data = await response.json();
            if (data.error) throw new Error(`DALL-E API Error: ${data.error.message}`);
            
            const imageUrl = data.data[0].url;
            
            // Download the image and save to cache
            const imageRes = await fetch(imageUrl);
            const buffer = await imageRes.arrayBuffer();
            fs.writeFileSync(cachePath, Buffer.from(buffer));
            
            console.log(`[Image Generator] Successfully generated and cached image from DALL-E 3.`);
            return cachePath;
            
        } else if (this.provider === 'IMAGEN') {
            // Implementation for Google Imagen API
            throw new Error("Imagen provider not configured with API keys yet.");
        } else {
            // MOCK PROVIDER (For CI/CD and testing)
            console.log(`[Image Generator] MOCK provider active. Outputting placeholder.`);
            if (!fs.existsSync(cachePath)) {
                 fs.copyFileSync(path.join(process.cwd(), 'mock_image.jpg'), cachePath);
            }
            return cachePath;
        }
    }
}

module.exports = { ImageGenerator };
