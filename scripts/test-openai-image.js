const fs = require('fs');
const path = require('path');
const { ImageGenerator } = require('../services/ai/image-generator.js');

async function verifyImage(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
    }

    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
        throw new Error(`File is empty: ${filePath}`);
    }

    // Read magic bytes to determine format
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    let format = "Unknown";
    const hex = buffer.toString('hex').toUpperCase();
    
    if (hex.startsWith('FFD8FF')) format = 'JPEG';
    else if (hex.startsWith('89504E47')) format = 'PNG';
    else if (hex.startsWith('52494646') && hex.substring(16, 24) === '57454250') format = 'WebP'; // RIFF...WEBP

    if (format === 'Unknown') {
        throw new Error(`Invalid image format. Magic bytes: ${hex}`);
    }

    return { size: stats.size, format };
}

async function runSmokeTest() {
    console.log("🚀 Starting OpenAI Image Smoke Test...");
    
    try {
        // Enforce OpenAI provider for the smoke test
        process.env.IMAGE_PROVIDER = "OPENAI";
        
        const generator = new ImageGenerator();
        
        const visualSpec = {
            image_generation_prompt: "A high-quality, professional educational illustration depicting trading psychology. A person analyzing a glowing chart, with calm blue and green tones, no text, clean corporate aesthetic, modern minimalist."
        };
        const topic = "smoke_test_trading_psychology";
        const slideIndex = 1;
        
        // Ensure cache is clear so we actually hit the API
        const cachePath = path.join(__dirname, '..', 'assets', 'generated', `${topic}_slide_${slideIndex}.jpg`);
        if (fs.existsSync(cachePath)) {
            fs.unlinkSync(cachePath);
        }

        console.log("🧠 Triggering image generation...");
        const resultPath = await generator.generateIllustration(visualSpec, topic, slideIndex);
        
        console.log(`✅ Image generated and saved to: ${resultPath}`);
        
        console.log("🔍 Verifying image integrity...");
        const integrity = await verifyImage(resultPath);
        
        console.log(`✅ Image Integrity Verified!`);
        console.log(`   - Format: ${integrity.format}`);
        console.log(`   - Size: ${(integrity.size / 1024).toFixed(2)} KB`);
        
        console.log("\n🎉 Smoke test passed successfully!");
        process.exit(0);
    } catch (e) {
        console.error("\n❌ Smoke Test Failed:");
        console.error(e.message);
        process.exit(1);
    }
}

runSmokeTest();
