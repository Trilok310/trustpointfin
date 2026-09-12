const fs = require('fs');
const path = require('path');
const { renderCarousel } = require('../services/ai/renderer.js');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const SLIDES_DIR = path.join(ROOT, 'slides');
const SLIDES_JSON_PATH = path.join(ROOT, 'latest_slides.json');

if (!fs.existsSync(SLIDES_DIR)) fs.mkdirSync(SLIDES_DIR);

// Clean up old final slides
fs.readdirSync(SLIDES_DIR).forEach(f => { 
    if (f.startsWith('final_slide_')) fs.unlinkSync(path.join(SLIDES_DIR, f)); 
});

async function main() {
    const rawData = fs.readFileSync(process.argv[2] || SLIDES_JSON_PATH, 'utf-8');
    const data = JSON.parse(rawData);
    
    // Construct images map (assuming image-generator has placed slide_X_illustration.jpg in slides/)
    const imagesMap = {};
    const numSlides = data.slides ? data.slides.length : 0;
    for (let i = 1; i <= numSlides; i++) {
        imagesMap[i] = path.join(SLIDES_DIR, `slide_${i}_illustration.jpg`);
    }

    console.log("V11 Rendering Engine: Starting generation...");
    await renderCarousel(data, imagesMap, SLIDES_DIR);
    console.log("Visual engine successfully rendered V11 full-width illustrated slides.");
}

main().catch(console.error);
