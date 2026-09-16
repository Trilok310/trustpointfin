const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const SLIDES_JSON_PATH = path.join(ROOT, 'latest_slides.json');
const HTML_OUT_PATH = path.join(ROOT, 'carousel-temp.html');
const SLIDES_DIR = path.join(ROOT, 'slides');

if (!fs.existsSync(SLIDES_DIR)) {
    fs.mkdirSync(SLIDES_DIR);
} else {
    fs.readdirSync(SLIDES_DIR).forEach(f => {
        if (f.endsWith('.jpg')) fs.unlinkSync(path.join(SLIDES_DIR, f));
    });
}

function buildHTML(data) {
    let slidesHTML = '';
    const format = data.format || 'CAROUSEL';
    const isVertical = ['REEL', 'STORY'].includes(format);
    
    // Fallback if slides aren't present (e.g. reel_script only)
    let slides = data.slides || [];
    if (slides.length === 0) {
        slides = [{ title: data.hook || "TrustPointFin Insights", text: data.reel_script || "" }];
    }

    slides.forEach((slide, index) => {
        const slideNum = index + 1;
        const total = slides.length;
        const isLast = index === total - 1;
        
        let swipeText = '';
        if (format === 'CAROUSEL' && !isLast) swipeText = 'Swipe 👉';
        else if (format === 'CAROUSEL' && isLast) swipeText = 'Save & Share';
        
        const bgClass = index === 0 ? 'bg-primary' : 'bg-analytical';
        
        let contentHTML = `<h1>${slide.title}</h1>\n<p>${slide.text || ''}</p>`;

        // Visual handling based on new schema
        if (slide.visual === 'number') {
            contentHTML = `<div class="big-number">#${slideNum}</div>` + contentHTML;
        }

        // CTA handling
        if (isLast) {
            if (data.cta_type === 'learn_more') {
                contentHTML += `\n<div><span class="cta-btn">Read the Full Article</span></div>`;
            } else if (data.cta_type === 'engagement') {
                contentHTML += `\n<div><span class="cta-btn">Drop a Comment Below 👇</span></div>`;
            } else if (data.cta_type === 'angel_one' || data.cta === 'angel_one') {
                contentHTML += `\n<div><span class="cta-btn">Open Free Demat Account</span></div>`;
            }
        }

        let disclaimerHTML = '';
        if (index === 0 || isLast) {
            disclaimerHTML = `<div class="slide-disclaimer">Disclaimer: Investments in the securities market are subject to market risks.</div>`;
        }

        slidesHTML += `
        <div class="slide ${bgClass}">
            <div class="brand-header">
                <img src="https://trilok310.github.io/trustpointfin/logo.jpg" class="brand-logo" alt="Logo" onerror="this.style.display='none'">
                <span class="brand-text">TrustPointFin</span>
            </div>
            <div class="content" ${index === 0 ? 'style="justify-content: center; text-align: center;"' : ''}>
                ${contentHTML}
            </div>
            <div class="slide-footer">
                <span class="slide-number">${total > 1 ? slideNum + ' / ' + total : ''}</span>
                <span class="swipe">${swipeText}</span>
            </div>
            ${disclaimerHTML}
        </div>`;
    });

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@400;600;700;900&family=Outfit:wght@700&family=Noto+Sans+Devanagari:wght@400;700;900&display=swap" rel="stylesheet">
    <style>
        body { background-color: #f8fafc; color: #0f172a; font-family: 'Inter', 'Noto Sans Devanagari', sans-serif; margin: 0; padding: 0; display: flex; flex-direction: row; }
        .slide { width: 1080px; height: ${isVertical ? 1920 : 1080}px; position: relative; box-sizing: border-box; padding: 70px; display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; }
        
        .slide.bg-primary { background-color: #f8fafc; background-image: radial-gradient(circle at top right, rgba(37, 99, 235, 0.1), transparent 500px); justify-content: center; }
        .slide.bg-analytical { background-color: #f8fafc; background-image: linear-gradient(rgba(0, 0, 0, 0.05) 2px, transparent 2px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 2px, transparent 2px); background-size: 40px 40px; }
        
        .content { position: relative; z-index: 2; display: flex; flex-direction: column; height: 100%; justify-content: center; }
        
        .brand-header { position: absolute; top: 50px; left: 50px; z-index: 3; display: flex; align-items: center; gap: 20px; }
        .brand-logo { height: 70px; border-radius: 12px; background: white; padding: 4px; box-shadow: 0 4px 10px rgba(0,0,0,0.1); }
        .brand-text { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 32px; color: #2563eb; letter-spacing: 2px; text-transform: uppercase; }
        
        .slide-footer { position: absolute; bottom: 50px; left: 50px; right: 50px; display: flex; justify-content: space-between; z-index: 3; font-size: 26px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; }
        .slide-number { color: rgba(0,0,0,0.4); }
        .swipe { color: #2563eb; font-weight: 900; }
        .slide-disclaimer { position: absolute; bottom: 15px; left: 50px; right: 50px; text-align: center; font-size: 14px; font-weight: 400; color: rgba(0,0,0,0.4); z-index: 3; font-family: 'Inter', sans-serif; letter-spacing: 0.5px; }
        
        h1 { font-family: 'Playfair Display', 'Noto Sans Devanagari', serif; font-size: 76px; font-weight: 700; line-height: 1.2; margin-top: 120px; margin-bottom: 30px; color: #0f172a; text-wrap: balance; }
        .bg-primary h1 { margin-top: 0; font-size: 86px; }
        
        p { font-family: 'Inter', 'Noto Sans Devanagari', sans-serif; font-size: 36px; line-height: 1.6; color: #334155; margin-top: 0; margin-bottom: 30px; }
        
        .big-number { font-family: 'Playfair Display', serif; font-size: 120px; color: rgba(37, 99, 235, 0.2); font-weight: 900; line-height: 0.8; margin-bottom: 20px; }
        
        .cta-btn { background: #2563eb; color: #ffffff; padding: 24px 48px; font-weight: 700; display: inline-block; margin-top: 40px; border-radius: 100px; font-size: 32px; text-transform: uppercase; box-shadow: 0 10px 30px rgba(37,99,235,0.2); }
    </style>
</head>
<body>
    ${slidesHTML}
</body>
</html>`;
}

async function main() {
    let data;
    try {
        const raw = fs.readFileSync(SLIDES_JSON_PATH, 'utf-8');
        data = JSON.parse(raw);
    } catch (e) {
        console.error("No valid JSON found, exiting.");
        process.exit(1);
    }

    const format = data.format || 'CAROUSEL';
    const isVertical = ['REEL', 'STORY'].includes(format);
    const numSlides = (data.slides && data.slides.length > 0) ? data.slides.length : 1;

    const fullHTML = buildHTML(data);
    fs.writeFileSync(HTML_OUT_PATH, fullHTML, 'utf-8');
    
    console.log("Generating visual assets with Puppeteer...");
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1080 * numSlides, height: isVertical ? 1920 : 1080, deviceScaleFactor: 1 });
    await page.goto('file://' + HTML_OUT_PATH, { waitUntil: 'networkidle0' });

    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 1000));

    for (let i = 0; i < numSlides; i++) {
        const slidePath = path.join(SLIDES_DIR, `slide_${i + 1}.jpg`);
        await page.screenshot({
            path: slidePath,
            type: 'jpeg',
            quality: 90,
            clip: { x: i * 1080, y: 0, width: 1080, height: isVertical ? 1920 : 1080 }
        });
        console.log(`Saved ${slidePath}`);
    }

    await browser.close();
    console.log("Presentation rendering complete!");
}

main().catch(console.error);
