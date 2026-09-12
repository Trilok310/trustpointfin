const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function renderCarousel(jsonData, imagesMap, outputDir) {
    const HTML_OUT_PATH = path.join(outputDir, 'temp_render.html');
    
    let slidesHTML = '';
    const slides = jsonData.slides || [];
    const theme = { bg: '#fdfbf7', text: '#292524', accent: '#059669', font: "'Comic Neue', 'Outfit', sans-serif" };

    slides.forEach((slide, index) => {
        const slideNum = index + 1;
        const imgPath = imagesMap[slideNum];
        let bgStyle = imgPath && fs.existsSync(imgPath) ? 
            `background-image: url('file:///${imgPath.replace(/\\/g, '/')}');` : '';

        // Safely inline the logo as base64 to ensure Puppeteer renders it
        let logoBase64 = '';
        const logoPath = path.join(process.cwd(), 'tpf-logo.jpg');
        if (fs.existsSync(logoPath)) {
            const logoData = fs.readFileSync(logoPath).toString('base64');
            logoBase64 = `data:image/jpeg;base64,${logoData}`;
        }

        slidesHTML += `
        <div class="slide slide-index-${index}">
            <div class="header">
                <div class="logo-box">
                    ${logoBase64 ? `<img src="${logoBase64}" alt="Logo">` : ''}
                    <span>TrustPointFin</span>
                </div>
                <div class="slide-counter">${slideNum}/${slides.length}</div>
            </div>
            <div class="slide-content">
                <div class="illustration-layout-v5">
                    <div class="text-top">
                        <h1 class="headline">${slide.headline}</h1>
                        ${slide.core_explanation ? `<p class="core-explanation">${slide.core_explanation}</p>` : ''}
                    </div>
                    
                    ${imgPath && fs.existsSync(imgPath) ? `<img class="visual-full-width" src="file:///${imgPath.replace(/\\/g, '/')}" />` : ''}
                    
                    <div class="text-bottom">
                        ${slide.annotation ? `<div class="annotation-box">📌 ${slide.annotation}</div>` : ''}
                        ${slide.cta ? `<div class="slide-cta">${slide.cta}</div>` : ''}
                    </div>
                </div>
            </div>
        </div>`;
    });

    const fullHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=Comic+Neue:wght@700&family=Noto+Sans+Devanagari:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root { --bg: ${theme.bg}; --text: ${theme.text}; --accent: ${theme.accent}; --font: 'Comic Neue', 'Outfit', 'Noto Sans Devanagari', sans-serif; }
        body { margin: 0; padding: 0; display: flex; font-family: var(--font); background: var(--bg); color: var(--text); }
        
        .slide { 
            width: 1080px; height: 1080px; box-sizing: border-box; 
            padding: 40px; display: flex; flex-direction: column; 
            position: relative; flex-shrink: 0; border-right: 1px solid rgba(0,0,0,0.1); 
        }
        
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; font-weight: 700; height: 60px; }
        .logo-box { display: flex; align-items: center; gap: 15px; font-size: 28px; font-weight: 900; color: var(--accent); }
        .logo-box img { height: 45px; width: auto; border-radius: 8px; }
        .slide-counter { opacity: 0.4; font-size: 24px; }
        
        .slide-content { flex: 1; display: flex; flex-direction: column; height: 880px; width: 100%; }
        
        .illustration-layout-v5 { display: flex; flex-direction: column; width: 100%; height: 100%; justify-content: space-between; padding-bottom: 20px; }
        
        .text-top { flex: 0 0 auto; display: flex; flex-direction: column; justify-content: flex-start; text-align: center; margin-top: 10px; }
        
        .visual-full-width { 
            width: 100%;
            height: 560px; /* ~52% of the 1080px canvas */
            border-radius: 24px; 
            object-fit: cover; /* Eliminates all horizontal whitespace */
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            border: 1px solid rgba(0,0,0,0.05);
        }
        
        .text-bottom { flex: 0 0 auto; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; margin-bottom: 10px; }
        
        .headline { font-size: 56px; font-weight: 900; line-height: 1.1; margin: 0 0 15px 0; color: var(--accent); text-wrap: balance; }
        .core-explanation { font-size: 32px; line-height: 1.4; font-weight: 600; opacity: 0.9; margin: 0 auto; max-width: 950px; text-wrap: pretty; }
        
        .annotation-box { background: rgba(0,0,0,0.05); padding: 15px 30px; border-radius: 100px; font-size: 28px; font-weight: 700; color: var(--text); border: 2px solid var(--accent); display: inline-block; }
        .slide-cta { background: var(--accent); color: var(--bg); font-size: 32px; font-weight: 900; padding: 20px 50px; border-radius: 100px; text-align: center; text-transform: uppercase; margin-top: 15px; box-shadow: 0 8px 20px rgba(5, 150, 105, 0.3); }
    </style>
</head>
<body>${slidesHTML}</body>
</html>`;

    fs.writeFileSync(HTML_OUT_PATH, fullHTML, 'utf-8');
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1080 * slides.length, height: 1080, deviceScaleFactor: 1 });
    await page.goto('file://' + HTML_OUT_PATH, { waitUntil: 'networkidle0' });
    
    // Ensure fonts are fully loaded before rendering
    await page.evaluateHandle('document.fonts.ready');

    // Pre-publish validation for missing glyphs (tofu boxes) and sparse layouts
    const validationErrors = await page.evaluate(() => {
        const errors = [];
        const text = document.body.innerText;
        
        if (text.includes('\uFFFD') || text.includes('\u25A1') || text.includes('\u25AF')) {
            errors.push("Missing-glyph/tofu characters detected");
        }
        
        const images = document.querySelectorAll('.visual-full-width');
        images.forEach((img, i) => {
            if (img.clientWidth < 900) errors.push(`Image ${i+1} width is too small (${img.clientWidth}px), violating the 90-95% canvas rule`);
            if (img.clientHeight < 400) errors.push(`Image ${i+1} height is too small (${img.clientHeight}px), violating the 50-60% canvas rule`);
        });

        const headlines = document.querySelectorAll('.headline');
        headlines.forEach((hl, i) => {
            if (!hl.innerText.trim()) errors.push(`Slide ${i+1} has an empty headline, resulting in a sparse layout`);
        });

        return errors;
    });

    if (validationErrors.length > 0) {
        await browser.close();
        throw new Error("PRE-PUBLISH VALIDATION FAILED:\n" + validationErrors.join("\n"));
    }

    for (let i = 0; i < slides.length; i++) {
        const slidePath = path.join(outputDir, `final_slide_${i + 1}.jpg`);
        await page.screenshot({ path: slidePath, type: 'jpeg', quality: 90, clip: { x: i * 1080, y: 0, width: 1080, height: 1080 } });
    }
    await browser.close();
}
module.exports = { renderCarousel };
