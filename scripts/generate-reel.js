const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const REEL_DIR = path.join(ROOT, 'reel_slides');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!fs.existsSync(REEL_DIR)) {
    fs.mkdirSync(REEL_DIR);
} else {
    fs.readdirSync(REEL_DIR).forEach(f => {
        if (f.endsWith('.jpg')) fs.unlinkSync(path.join(REEL_DIR, f));
    });
}

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function getReelConcept() {
    console.log("🤖 Asking Gemini for a 3-part Reel concept...");
    const prompt = `Generate a 3-part educational financial concept (e.g. "3 Rules of Risk Management", "What is CAN SLIM?", "Power of Compounding").
    It must be punchy and easy to read on a fast 15-second TikTok/Reel.
    Return ONLY a raw JSON array of 3 slide objects (no markdown formatting). Each object must have these exact keys:
    {
      "title": "Large bold heading",
      "text": "Short descriptive text (max 15 words)",
      "image_query": "1 or 2 word search term for the background (e.g. 'chart', 'growth', 'money')"
    }`;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    const result = await model.generateContent(prompt);
    
    let rawText = result.response.text();
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(rawText);
}

function buildReelHTML(slides) {
    let slidesHTML = '';

    slides.forEach((slide, index) => {
        const slideNum = index + 1;
        const total = slides.length;
        const bgUrl = `https://source.unsplash.com/1080x1920/?${encodeURIComponent(slide.image_query)},finance,dark`;

        slidesHTML += `
        <div class="slide" style="background-image: url('${bgUrl}');">
            <div class="brand-header">
                <img src="https://trilok310.github.io/trustpointfin/logo.jpg" class="brand-logo" alt="Logo" onerror="this.style.display='none'">
                <span class="brand-text">Trust Point Fin</span>
            </div>
            
            <div class="content">
                <div class="step-badge">STEP ${slideNum}</div>
                <div class="title">${slide.title}</div>
                <div class="text">${slide.text}</div>
            </div>
            
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${(slideNum / total) * 100}%"></div>
            </div>
            <div class="disclaimer">Disclaimer: Investments in the securities market are subject to market risks. Read all related documents carefully before investing.</div>
        </div>`;
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@400;700;900&family=Outfit:wght@700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; background: #0f172a; display: flex; flex-direction: row; }
        .slide { width: 1080px; height: 1920px; position: relative; background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 80px; box-sizing: border-box; flex-shrink: 0; }
        .slide::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.95)); z-index: 1; }
        
        .brand-header { position: absolute; top: 80px; left: 0; right: 0; z-index: 3; display: flex; justify-content: center; align-items: center; gap: 20px; }
        .brand-logo { height: 70px; border-radius: 12px; background: white; padding: 4px; }
        .brand-text { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 32px; color: #ffb703; letter-spacing: 2px; text-transform: uppercase; }
        
        .content { position: relative; z-index: 2; text-align: center; margin-top: -100px; }
        
        .step-badge { font-family: 'Inter', sans-serif; font-weight: 900; font-size: 36px; color: #0f172a; background: #ffb703; padding: 10px 30px; border-radius: 100px; display: inline-block; margin-bottom: 40px; letter-spacing: 2px; }
        .title { font-family: 'Playfair Display', serif; font-size: 90px; font-weight: 700; line-height: 1.2; color: #ffffff; margin-bottom: 30px; text-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .text { font-family: 'Inter', sans-serif; font-size: 40px; font-weight: 400; color: #cbd5e1; line-height: 1.5; padding: 0 40px; }
        
        .progress-bar { position: absolute; bottom: 120px; left: 80px; right: 80px; height: 10px; background: rgba(255,255,255,0.2); border-radius: 10px; z-index: 3; overflow: hidden; }
        .progress-fill { height: 100%; background: #ffb703; border-radius: 10px; }
        .disclaimer { position: absolute; bottom: 30px; left: 50px; right: 50px; text-align: center; font-size: 16px; color: rgba(255,255,255,0.4); z-index: 3; font-family: 'Inter', sans-serif; }
    </style>
</head>
<body>
    ${slidesHTML}
</body>
</html>`;
}

async function main() {
    if (!GEMINI_API_KEY) {
        console.error("❌ Missing GEMINI_API_KEY!");
        process.exit(1);
    }

    const slides = await getReelConcept();
    console.log(`✅ Got ${slides.length} reel slides from Gemini.`);

    const html = buildReelHTML(slides);
    const tempHtmlPath = path.join(ROOT, 'reel-temp.html');
    fs.writeFileSync(tempHtmlPath, html, 'utf-8');

    console.log("📸 Launching Puppeteer for Reel frames generation...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1080 * slides.length, height: 1920, deviceScaleFactor: 1 });
    await page.goto('file://' + tempHtmlPath, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    
    await new Promise(r => setTimeout(r, 2000)); // Unsplash load time

    for (let i = 0; i < slides.length; i++) {
        const slidePath = path.join(REEL_DIR, `reel_${i + 1}.jpg`);
        await page.screenshot({
            path: slidePath,
            type: 'jpeg',
            quality: 90,
            clip: { x: i * 1080, y: 0, width: 1080, height: 1920 }
        });
        console.log(`✅ Saved Reel frame to ${slidePath}`);
    }

    await browser.close();
    fs.unlinkSync(tempHtmlPath);
}

main().catch(err => {
    console.error("❌ Error generating reel frames:", err);
    process.exit(1);
});
