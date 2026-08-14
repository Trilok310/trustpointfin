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

function buildHTML(slides) {
    let slidesHTML = '';
    let chartScripts = '';

    slides.forEach((slide, index) => {
        const slideNum = index + 1;
        const total = slides.length;
        const isLast = index === total - 1;
        const swipeText = isLast ? '' : 'Swipe ➔';
        const bgClass = slide.type === 'bg-image' ? 'bg-image' : 'bg-analytical';
        
        let bgStyle = '';
        if (slide.type === 'bg-image' && slide.image_query) {
            bgStyle = `style="background-image: url('https://source.unsplash.com/1080x1080/?${encodeURIComponent(slide.image_query)},finance');"`;
        } else if (slide.type === 'bg-image') {
            bgStyle = `style="background-image: url('https://source.unsplash.com/1080x1080/?finance,success');"`;
        }

        let contentHTML = `<h1>${slide.title}</h1>\n<p>${slide.text}</p>`;

        if (slide.chart) {
            contentHTML += `\n<div class="chart-container"><canvas id="chart${slideNum}"></canvas></div>`;
            chartScripts += `
                new Chart(document.getElementById('chart${slideNum}').getContext('2d'), {
                    type: '${slide.chart.type}',
                    data: ${JSON.stringify({ labels: slide.chart.labels, datasets: slide.chart.datasets })},
                    options: {
                        responsive: true, maintainAspectRatio: false, animation: false,
                        plugins: { legend: { labels: { color: '#cbd5e1', padding: 10, font: { family: "'Inter', sans-serif" } } } },
                        scales: {
                            y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#cbd5e1' } },
                            x: { grid: { display: false }, ticks: { color: '#cbd5e1' } }
                        }
                    }
                });
            `;
        }

        if (slide.table) {
            let tableHTML = `<table class="data-table"><tr>`;
            slide.table.headers.forEach(h => tableHTML += `<th>${h}</th>`);
            tableHTML += `</tr>`;
            slide.table.rows.forEach(row => {
                tableHTML += `<tr>`;
                row.forEach(cell => tableHTML += `<td>${cell}</td>`);
                tableHTML += `</tr>`;
            });
            tableHTML += `</table>`;
            contentHTML += `\n${tableHTML}`;
        }

        if (slide.is_cta) {
            contentHTML += `\n<div><span class="cta-btn">Link in Bio to Read More</span></div>`;
        }

        slidesHTML += `
        <div class="slide ${bgClass}" ${bgStyle}>
            <div class="brand-header">
                <img src="https://trilok310.github.io/trustpointfin/logo.jpg" class="brand-logo" alt="Logo" onerror="this.style.display='none'">
                <span class="brand-text">Trust Point Fin</span>
            </div>
            <div class="content" ${slide.type === 'bg-image' ? 'style="justify-content: center;"' : ''}>
                ${contentHTML}
            </div>
            <div class="slide-footer">
                <span class="slide-number">${slideNum} / ${total}</span>
                <span class="swipe">${swipeText}</span>
            </div>
        </div>`;
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700&family=Inter:wght@400;500;600&family=Outfit:wght@700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { background-color: #0f172a; color: white; font-family: 'Inter', sans-serif; margin: 0; padding: 0; display: flex; flex-direction: row; }
        .slide { width: 1080px; height: 1080px; position: relative; box-sizing: border-box; padding: 70px; display: flex; flex-direction: column; overflow: hidden; flex-shrink: 0; }
        .slide.bg-analytical { background-color: #0f172a; background-image: linear-gradient(rgba(255, 255, 255, 0.03) 2px, transparent 2px), linear-gradient(90deg, rgba(255, 255, 255, 0.03) 2px, transparent 2px); background-size: 40px 40px; }
        .slide.bg-image { background-size: cover; background-position: center; justify-content: center; }
        .slide.bg-image::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: linear-gradient(to bottom, rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.95)); z-index: 1; }
        .content { position: relative; z-index: 2; display: flex; flex-direction: column; height: 100%; }
        .brand-header { position: absolute; top: 50px; left: 50px; z-index: 3; display: flex; align-items: center; gap: 20px; }
        .brand-logo { height: 70px; border-radius: 12px; background: white; padding: 4px; }
        .brand-text { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 32px; color: #ffb703; letter-spacing: 2px; text-transform: uppercase; }
        .slide-footer { position: absolute; bottom: 50px; left: 50px; right: 50px; display: flex; justify-content: space-between; z-index: 3; font-size: 26px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; }
        .slide-number { color: rgba(255,255,255,0.4); }
        .swipe { color: #ffb703; }
        h1 { font-family: 'Playfair Display', serif; font-size: 76px; font-weight: 700; line-height: 1.15; margin-top: 120px; margin-bottom: 24px; color: #ffffff; }
        .slide.bg-image h1 { margin-top: 0; }
        .highlight { color: #ffb703; font-style: italic; }
        p { font-family: 'Inter', sans-serif; font-size: 32px; line-height: 1.5; color: #cbd5e1; margin-top: 0; margin-bottom: 30px; }
        .data-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 28px; background: rgba(255, 255, 255, 0.03); border-radius: 16px; overflow: hidden; }
        .data-table th, .data-table td { padding: 24px 32px; text-align: left; border-bottom: 2px solid rgba(255,255,255,0.08); }
        .data-table th { color: #ffb703; font-weight: 600; text-transform: uppercase; font-size: 24px; letter-spacing: 2px; background: rgba(0,0,0,0.2); }
        .data-table tr:last-child td { border-bottom: none; }
        .chart-container { flex-grow: 1; position: relative; width: 100%; margin-top: 20px; padding-bottom: 30px; }
        .cta-btn { background: #ffb703; color: #0f172a; padding: 24px 48px; font-weight: 700; display: inline-block; margin-top: 40px; border-radius: 12px; font-size: 36px; text-transform: uppercase; }
    </style>
</head>
<body>
    ${slidesHTML}
    <script>
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.font.size = 24;
        Chart.defaults.color = '#94a3b8';
        ${chartScripts}
    </script>
</body>
</html>`;
}

async function main() {
    if (!fs.existsSync(SLIDES_JSON_PATH)) {
        console.error("❌ latest_slides.json not found!");
        process.exit(1);
    }

    const slides = JSON.parse(fs.readFileSync(SLIDES_JSON_PATH, 'utf-8'));
    const html = buildHTML(slides);
    fs.writeFileSync(HTML_OUT_PATH, html, 'utf-8');
    console.log("✅ Wrote carousel template to", HTML_OUT_PATH);

    console.log("📸 Launching Puppeteer to capture 1080x1080 slides...");
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    await page.setViewport({ width: 1080 * slides.length, height: 1080, deviceScaleFactor: 1 });
    await page.goto('file://' + HTML_OUT_PATH, { waitUntil: 'networkidle0' });

    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 1000)); // wait for chart.js render

    for (let i = 0; i < slides.length; i++) {
        const slidePath = path.join(SLIDES_DIR, `slide_${i + 1}.jpg`);
        await page.screenshot({
            path: slidePath,
            type: 'jpeg',
            quality: 90,
            clip: { x: i * 1080, y: 0, width: 1080, height: 1080 }
        });
        console.log(`✅ Saved ${slidePath}`);
    }

    await browser.close();
    console.log("🎉 Carousel generation complete!");
}

main().catch(err => {
    console.error("❌ Error generating carousel:", err);
    process.exit(1);
});
