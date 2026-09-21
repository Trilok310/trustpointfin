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
        const providerUpper = this.provider.toUpperCase();
        if (providerUpper === 'DALLE' || providerUpper === 'OPENAI') {
            if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing!");
            
            const modelName = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst';
            console.log(`[Image Generator] Calling OpenAI API with model: ${modelName}...`);
            
            const makeRequest = async (modelToUse) => {
                return await fetch("https://api.openai.com/v1/images/generations", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: modelToUse,
                        prompt: visualSpec.image_generation_prompt.substring(0, 4000), // Updated for modern limits
                        n: 1,
                        size: "1024x1024"
                    })
                });
            };

            let response = await makeRequest(modelName);
            let data;
            
            try {
                data = await response.json();
            } catch (e) {
                throw new Error(`OpenAI Image API returned invalid JSON (HTTP ${response.status} ${response.statusText}).`);
            }
            
            console.log(`[Image Generator] OpenAI HTTP Status: ${response.status} ${response.statusText}`);
            
            // Redacted logging of response structure
            const safeData = { ...data };
            if (safeData.data && Array.isArray(safeData.data)) {
                safeData.data = safeData.data.map(item => {
                    const safeItem = { ...item };
                    if (safeItem.b64_json) safeItem.b64_json = "[REDACTED_BASE64_STRING]";
                    return safeItem;
                });
            }
            console.log(`[Image Generator] OpenAI Response Structure: ${JSON.stringify(safeData, null, 2)}`);

            if (data.error) {
                throw new Error(`OpenAI Image API Error: ${data.error.message || JSON.stringify(data.error)}`);
            }
            
            if (!data.data || !data.data[0]) {
                throw new Error("OpenAI Image API returned unexpected format (missing data.data[0]).");
            }
            
            const item = data.data[0];
            
            if (item.b64_json) {
                const buffer = Buffer.from(item.b64_json, 'base64');
                fs.writeFileSync(cachePath, buffer);
                console.log(`[Image Generator] Successfully decoded and cached base64 image from ${modelName}.`);
                return cachePath;
            } else if (item.url) {
                const imageRes = await fetch(item.url);
                if (!imageRes.ok) {
                    throw new Error(`Failed to download image from OpenAI URL (HTTP ${imageRes.status})`);
                }
                const buffer = await imageRes.arrayBuffer();
                fs.writeFileSync(cachePath, Buffer.from(buffer));
                console.log(`[Image Generator] Successfully downloaded and cached image using ${modelName}.`);
                return cachePath;
            } else {
                throw new Error("OpenAI Image API response contained neither 'url' nor 'b64_json'.");
            }
            
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
