const fs = require('fs');
const path = require('path');
const { generateSocialContent } = require("../services/ai/content-generator.js");
const { ImageGenerator } = require("../services/ai/image-generator.js");

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const SLIDES_JSON_PATH = path.join(ROOT, 'latest_slides.json');
const SOCIAL_PATH = path.join(ROOT, 'latest_social_media.md');
const SLIDES_DIR = path.join(ROOT, 'slides');

// 1. Prevent silent fallbacks by strictly deleting old social content
if (fs.existsSync(SLIDES_JSON_PATH)) fs.unlinkSync(SLIDES_JSON_PATH);
if (fs.existsSync(SOCIAL_PATH)) fs.unlinkSync(SOCIAL_PATH);
if (!fs.existsSync(SLIDES_DIR)) {
    fs.mkdirSync(SLIDES_DIR);
} else {
    fs.readdirSync(SLIDES_DIR).forEach(f => {
        if (f.startsWith('slide_') || f.startsWith('final_slide_')) {
            fs.unlinkSync(path.join(SLIDES_DIR, f));
        }
    });
}

async function selectSourceArticle() {
    const statePath = path.join(ROOT, '.current_topic_state.json');
    
    if (!fs.existsSync(statePath)) {
        throw new Error("No .current_topic_state.json found! Cannot proceed with social generation. Article publishing must succeed first.");
    }
    
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (state.publication_status !== "SUCCESS") {
        throw new Error(`Article publication status is '${state.publication_status}', expected 'SUCCESS'! Halting social generation.`);
    }

    const selectedFile = state.filename;
    const title = state.title;

    if (!fs.existsSync(path.join(ROOT, selectedFile))) {
        throw new Error(`The verified article file ${selectedFile} is missing from disk!`);
    }

    console.log(`\n==========================================`);
    console.log(`📌 STRICT SOCIAL SOURCE SELECTION`);
    console.log(`==========================================`);
    console.log(`- SOURCE FILE: ${selectedFile}`);
    console.log(`- SOURCE TITLE: ${title}`);
    console.log(`- SOURCE PATH: /${selectedFile}`);
    console.log(`- PUBLICATION STATUS: ${state.publication_status}`);
    console.log(`==========================================\n`);

    return { filename: selectedFile, title };
}

async function main() {
    try {
        console.log("🚀 Initializing Social Media Pipeline...");
        const article = await selectSourceArticle();
        
        console.log(`🧠 Generating V11 Carousel Content for: "${article.title}"`);
        
        const stateManager = require('./state-manager.js');
        stateManager.updateState({ social_generation_status: 'GENERATING' });
        const articleHtml = fs.readFileSync(path.join(ROOT, article.filename), 'utf8');
        const socialData = await generateSocialContent(article.title, articleHtml);
        stateManager.updateState({ social_generation_status: 'SUCCESS', social_compliance_status: 'SUCCESS' });
    
        
        // Strict Validation Check
        if (socialData.topic !== article.title) {
            console.log(`⚠️ Note: AI adjusted topic from "${article.title}" to "${socialData.topic}"`);
        }
        
        fs.writeFileSync(SLIDES_JSON_PATH, JSON.stringify(socialData, null, 2), "utf-8");
        
        const imageGen = new ImageGenerator(process.env.IMAGE_PROVIDER || 'MOCK');
        for (let i = 0; i < socialData.slides.length; i++) {
            const slide = socialData.slides[i];
            const slideNum = i + 1;
            
            if (slide.visual_spec) {
                console.log(`📸 Generating illustration for Slide ${slideNum}...`);
                const imgPath = await imageGen.generateIllustration(slide.visual_spec, socialData.topic, slideNum);
                fs.copyFileSync(imgPath, path.join(SLIDES_DIR, `slide_${slideNum}_illustration.jpg`));
            }
        }
        
        const socialMarkdown = `# Social Media Posts\n*Generated for article: "${article.title}"*\n\n---\n\n## 📝 Caption\n\n${socialData.caption}\n\n---\n*Article URL: https://trilok310.github.io/trustpointfin/${article.filename}*\n`;
        fs.writeFileSync(SOCIAL_PATH, socialMarkdown, "utf-8");
        
        console.log("✅ V11 Social JSON and Illustrations successfully prepared.");
    } catch (err) {
        console.error("❌ CRITICAL FAILURE in Social Pipeline:", err.message);
        process.exit(1); // Force GitHub Action to fail
    }
}

main();
