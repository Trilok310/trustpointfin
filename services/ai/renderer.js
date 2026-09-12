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
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&family=Comic+Neue:wght@700&display=swap" rel="stylesheet">
    <style>
        :root { --bg: ${theme.bg}; --text: ${theme.text}; --accent: ${theme.accent}; --font: ${theme.font}; }
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
        
        .illustration-layout-v5 { display: flex; flex-direction: column; width: 100%; height: 100%; justify-content: center; gap: 30px; }
        
        .text-top { flex: 0 0 auto; display: flex; flex-direction: column; justify-content: center; text-align: center; }
        
        .visual-full-width { 
            width: 100%;
            height: auto; /* Mathematically ensures NO empty space above/below the artwork */
            max-height: 600px;
            border-radius: 24px; 
            object-fit: contain;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        
        .text-bottom { flex: 0 0 auto; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        
        .headline { font-size: 56px; font-weight: 900; line-height: 1.1; margin: 0 0 15px 0; color: var(--accent); }
        .core-explanation { font-size: 32px; line-height: 1.4; font-weight: 600; opacity: 0.9; margin: 0; max-width: 900px; margin: 0 auto; }
        
        .annotation-box { background: rgba(0,0,0,0.05); padding: 15px 25px; border-radius: 100px; font-size: 28px; font-weight: 700; color: var(--text); border: 2px solid var(--accent); display: inline-block; }
        .slide-cta { background: var(--accent); color: var(--bg); font-size: 32px; font-weight: 900; padding: 20px 40px; border-radius: 100px; text-align: center; text-transform: uppercase; margin-top: 10px; }
    </style>
</head>
<body>${slidesHTML}</body>
</html>`;

    fs.writeFileSync(HTML_OUT_PATH, fullHTML, 'utf-8');
    const browser = await puppeteer.launch({ headless: "new", args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1080 * slides.length, height: 1080, deviceScaleFactor: 1 });
    await page.goto('file://' + HTML_OUT_PATH, { waitUntil: 'networkidle0' });

    for (let i = 0; i < slides.length; i++) {
        const slidePath = path.join(outputDir, `final_slide_${i + 1}.jpg`);
        await page.screenshot({ path: slidePath, type: 'jpeg', quality: 90, clip: { x: i * 1080, y: 0, width: 1080, height: 1080 } });
    }
    await browser.close();
}
module.exports = { renderCarousel };
