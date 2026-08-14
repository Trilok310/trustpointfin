const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const STORY_IMAGE_PATH = path.join(ROOT, 'story.jpg');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data;
}

async function getQuote() {
    console.log("🤖 Asking Gemini for a daily quote/fact...");
    const prompt = `Generate a powerful, short investing quote from a famous investor (like Warren Buffett, Peter Lynch, Rakesh Jhunjhunwala) OR a shocking financial/stock market fact. 
    It must be short enough to fit on an Instagram Story.
    Return ONLY a raw JSON object (no markdown formatting) with these exact keys:
    {
      "text": "The quote or fact text",
      "author": "The author name (or empty string if it's a general fact)",
      "image_query": "1 or 2 word search term for the background image (e.g. 'wallstreet', 'success', 'wealth')"
    }`;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.9 }
        })
    });
    
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    let rawText = data.candidates[0].content.parts[0].text;
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(rawText);
}

function buildStoryHTML(data) {
    const bgUrl = `https://source.unsplash.com/1080x1920/?${encodeURIComponent(data.image_query)},finance,dark`;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@400;600&family=Outfit:wght@700&display=swap" rel="stylesheet">
    <style>
        body { margin: 0; padding: 0; background: #0f172a; color: white; font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; }
        .story { width: 1080px; height: 1920px; position: relative; background-image: url('${bgUrl}'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: center; padding: 80px; box-sizing: border-box; }
        .story::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(15, 23, 42, 0.4), rgba(15, 23, 42, 0.95)); z-index: 1; }
        .content { position: relative; z-index: 2; text-align: center; }
        
        .brand-header { position: absolute; top: 80px; left: 0; right: 0; z-index: 3; display: flex; justify-content: center; align-items: center; gap: 20px; }
        .brand-logo { height: 70px; border-radius: 12px; background: white; padding: 4px; }
        .brand-text { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 32px; color: #ffb703; letter-spacing: 2px; text-transform: uppercase; }
        
        .quote-icon { font-family: 'Playfair Display', serif; font-size: 150px; color: rgba(255,183,3,0.5); line-height: 0; margin-bottom: 60px; }
        .text { font-family: 'Playfair Display', serif; font-size: 80px; font-weight: 700; line-height: 1.3; color: #ffffff; }
        .author { font-family: 'Inter', sans-serif; font-size: 36px; font-weight: 400; color: #ffb703; margin-top: 50px; text-transform: uppercase; letter-spacing: 4px; }
        
        .cta { position: absolute; bottom: 100px; left: 0; right: 0; z-index: 3; text-align: center; }
        .cta-btn { background: #ffb703; color: #0f172a; padding: 24px 60px; font-weight: 700; display: inline-block; border-radius: 100px; font-size: 36px; text-transform: uppercase; letter-spacing: 2px; box-shadow: 0 10px 30px rgba(255,183,3,0.3); }
        .disclaimer { position: absolute; bottom: 30px; left: 50px; right: 50px; text-align: center; font-size: 16px; color: rgba(255,255,255,0.4); z-index: 3; }
    </style>
</head>
<body>
    <div class="story">
        <div class="brand-header">
            <img src="https://trilok310.github.io/trustpointfin/logo.jpg" class="brand-logo" alt="Logo" onerror="this.style.display='none'">
            <span class="brand-text">Trust Point Fin</span>
        </div>
        
        <div class="content">
            <div class="quote-icon">"</div>
            <div class="text">${data.text}</div>
            ${data.author ? `<div class="author">— ${data.author}</div>` : ''}
        </div>
        
        <div class="cta">
            <span class="cta-btn">Link in Bio to Learn More</span>
        </div>
        <div class="disclaimer">Disclaimer: Investments in the securities market are subject to market risks. Read all related documents carefully before investing.</div>
    </div>
</body>
</html>`;
}

async function main() {
    if (!GEMINI_API_KEY) {
        console.error("❌ Missing GEMINI_API_KEY!");
        process.exit(1);
    }

    const data = await getQuote();
    console.log("✅ Got quote:", data);

    const html = buildStoryHTML(data);
    const tempHtmlPath = path.join(ROOT, 'story-temp.html');
    fs.writeFileSync(tempHtmlPath, html, 'utf-8');

    console.log("📸 Launching Puppeteer for Story generation...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
    await page.goto('file://' + tempHtmlPath, { waitUntil: 'networkidle0' });
    await page.evaluate(() => document.fonts.ready);
    
    // Wait slightly to ensure Unsplash background loads
    await new Promise(r => setTimeout(r, 2000));

    await page.screenshot({ path: STORY_IMAGE_PATH, type: 'jpeg', quality: 90 });
    console.log(`✅ Saved Story to ${STORY_IMAGE_PATH}`);

    await browser.close();
    fs.unlinkSync(tempHtmlPath);
}

main().catch(err => {
    console.error("❌ Error generating story:", err);
    process.exit(1);
});
