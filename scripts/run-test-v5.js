const fs = require('fs');
const path = require('path');
const { renderCarousel } = require('../services/ai/renderer.js');

const ROOT = __dirname;
const SLIDES_DIR = path.join(ROOT, 'slides');
const ARTIFACT_DIR = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\b0a03e58-6b22-498e-b40e-745a1b5971d0\\test_outputs_v11';

if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
if (!fs.existsSync(SLIDES_DIR)) fs.mkdirSync(SLIDES_DIR);

// Copy the wide AI generated image to the slides folder
const SRC_DIR = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\b0a03e58-6b22-498e-b40e-745a1b5971d0';
fs.copyFileSync(path.join(SRC_DIR, 'slide_final_rich_illustration_1789214102028.jpg'), path.join(SLIDES_DIR, 'slide_1_wide.jpg'));

const mockJsonData = {
    topic: "FD vs Mutual Funds",
    teaching_objective: "Teach the concept of risk vs reward using a wide visual metaphor.",
    format: "COMPARISON",
    visual_style: "Hand-drawn educational",
    slides: [
      { 
        headline: "FD vs Mutual Funds", 
        core_explanation: "FD आपको safe but slow returns देती है। Mutual Funds risk के साथ fast returns देते हैं।", 
        annotation: "Your choice defines your growth.",
        cta: null 
      }
    ],
    caption: "The secret to wealth is patience and time! 🌱🌳"
};

async function run() {
    console.log(`\n\n=== GENERATING V5 FULL-WIDTH LAYOUT ===`);
    
    const imagesMap = {
        1: path.join(SLIDES_DIR, 'slide_1_wide.jpg')
    };

    await renderCarousel(mockJsonData, imagesMap, SLIDES_DIR);

    const postDir = path.join(ARTIFACT_DIR, `post_1`);
    if (!fs.existsSync(postDir)) fs.mkdirSync(postDir);

    fs.copyFileSync(path.join(SLIDES_DIR, 'final_slide_1.jpg'), path.join(postDir, 'final_slide_1.jpg'));
    
    console.log('\n\nV5 Full-Width Illustration test completed!');
}

run().catch(console.error);
