const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

async function renderCreatives() {
    console.log("🎨 Initializing Dussehra Creatives Rendering...");

    const logoPath = path.join(__dirname, 'tpf-logo.jpg');
    const illustrationPath = path.join(__dirname, 'assets', 'dussehra_illustration.jpg');

    if (!fs.existsSync(logoPath) || !fs.existsSync(illustrationPath)) {
        throw new Error("Missing required assets: tpf-logo.jpg or assets/dussehra_illustration.jpg");
    }

    const logoBase64 = fs.readFileSync(logoPath).toString('base64');
    const logoDataUrl = `data:image/jpeg;base64,${logoBase64}`;

    const illustrationBase64 = fs.readFileSync(illustrationPath).toString('base64');
    const bgDataUrl = `data:image/jpeg;base64,${illustrationBase64}`;

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    // ==========================================
    // 1. RENDER FEED POST (1080 x 1350 - 4:5 Aspect Ratio)
    // ==========================================
    console.log("📸 Rendering 1080x1350 Feed Post...");
    const feedPage = await browser.newPage();
    await feedPage.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });

    const feedHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                width: 1080px;
                height: 1350px;
                background-color: #060b18;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 44px 48px;
            }
            .bg-layer {
                position: absolute;
                top: 0;
                left: 0;
                width: 1080px;
                height: 1350px;
                background-image: url('${bgDataUrl}');
                background-size: cover;
                background-position: center 20%;
                z-index: 1;
            }
            .vignette-top {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 260px;
                background: linear-gradient(to bottom, rgba(5, 10, 24, 0.92) 0%, rgba(5, 10, 24, 0.4) 65%, transparent 100%);
                z-index: 2;
            }
            .vignette-bottom {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 600px;
                background: linear-gradient(to top, rgba(4, 8, 20, 0.98) 0%, rgba(4, 8, 20, 0.88) 55%, rgba(4, 8, 20, 0.2) 85%, transparent 100%);
                z-index: 2;
            }
            .content-top {
                position: relative;
                z-index: 3;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .brand-badge {
                display: flex;
                align-items: center;
                gap: 16px;
                background: rgba(15, 23, 42, 0.75);
                backdrop-filter: blur(14px);
                border: 1px solid rgba(250, 204, 21, 0.25);
                padding: 10px 20px 10px 12px;
                border-radius: 40px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
            }
            .brand-logo {
                width: 48px;
                height: 48px;
                border-radius: 50%;
                border: 2px solid #facc15;
            }
            .brand-text {
                display: flex;
                flex-direction: column;
            }
            .brand-name {
                font-size: 20px;
                font-weight: 800;
                color: #ffffff;
                letter-spacing: -0.3px;
            }
            .brand-sub {
                font-size: 11px;
                color: #fef08a;
                font-weight: 600;
                letter-spacing: 0.5px;
                text-transform: uppercase;
            }
            .festive-tag {
                background: linear-gradient(135deg, #d97706, #b45309);
                color: #ffffff;
                border: 1px solid #fef08a;
                padding: 8px 18px;
                border-radius: 24px;
                font-size: 13px;
                font-weight: 800;
                letter-spacing: 0.8px;
                text-transform: uppercase;
                box-shadow: 0 4px 16px rgba(217, 119, 6, 0.35);
            }

            .content-bottom {
                position: relative;
                z-index: 3;
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .glass-card {
                background: rgba(10, 16, 32, 0.82);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(250, 204, 21, 0.3);
                border-radius: 24px;
                padding: 32px 36px;
                box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
                display: flex;
                flex-direction: column;
                gap: 12px;
            }
            .title-hindi {
                font-size: 28px;
                font-weight: 700;
                color: #facc15;
                letter-spacing: 0.5px;
            }
            .title-english {
                font-size: 42px;
                font-weight: 900;
                background: linear-gradient(135deg, #ffffff 0%, #fef08a 60%, #facc15 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                letter-spacing: -0.8px;
                line-height: 1.15;
            }
            .greeting-body {
                font-size: 19px;
                line-height: 1.5;
                color: #e2e8f0;
                font-weight: 400;
                margin-top: 4px;
            }
            .greeting-body strong {
                color: #fde047;
                font-weight: 700;
            }
            .pillars-row {
                display: flex;
                gap: 12px;
                margin-top: 6px;
            }
            .pillar-pill {
                background: rgba(250, 204, 21, 0.1);
                border: 1px solid rgba(250, 204, 21, 0.25);
                color: #fef08a;
                padding: 6px 14px;
                border-radius: 8px;
                font-size: 13px;
                font-weight: 700;
                letter-spacing: 0.3px;
            }
            .footer-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 4px;
            }
            .footer-note {
                font-size: 13px;
                color: #94a3b8;
                font-weight: 500;
            }
            .footer-url {
                font-size: 14px;
                color: #facc15;
                font-weight: 700;
                letter-spacing: 0.2px;
            }
        </style>
    </head>
    <body>
        <div class="bg-layer"></div>
        <div class="vignette-top"></div>
        <div class="vignette-bottom"></div>

        <div class="content-top">
            <div class="brand-badge">
                <img src="${logoDataUrl}" class="brand-logo" alt="Logo">
                <div class="brand-text">
                    <span class="brand-name">TrustPointFin</span>
                    <span class="brand-sub">Financial Intelligence</span>
                </div>
            </div>
            <div class="festive-tag">✨ Vijayadashami 2026</div>
        </div>

        <div class="content-bottom">
            <div class="glass-card">
                <div class="title-hindi">शुभ विजयादशमी • बुराई पर अच्छाई की विजय</div>
                <h1 class="title-english">Triumph of Financial Wisdom</h1>
                <p class="greeting-body">
                    This Dussehra, slay the modern demons of <strong>Debt, Inflation, and Impulsive Market FOMO</strong>. May the divine arrow of discipline illuminate your path to true long-term financial freedom and prosperity.
                </p>
                <div class="pillars-row">
                    <div class="pillar-pill">🏹 Slay Debt & Speculation</div>
                    <div class="pillar-pill">💡 Champion Knowledge</div>
                    <div class="pillar-pill">📈 Compound with Patience</div>
                </div>
            </div>
            <div class="footer-row">
                <span class="footer-note">Wishing you & your family a prosperous & blessed Dussehra!</span>
                <span class="footer-url">trustpointfin.org</span>
            </div>
        </div>
    </body>
    </html>
    `;

    await feedPage.setContent(feedHtml, { waitUntil: 'domcontentloaded' });
    const feedOutputPath = path.join(__dirname, 'dussehra_feed.jpg');
    await feedPage.screenshot({ path: feedOutputPath, type: 'jpeg', quality: 95 });
    console.log(`✅ Feed Creative saved to: ${feedOutputPath}`);

    // ==========================================
    // 2. RENDER STORY POST (1080 x 1920 - 9:16 Aspect Ratio)
    // ==========================================
    console.log("📱 Rendering 1080x1920 Story Post...");
    const storyPage = await browser.newPage();
    await storyPage.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 2 });

    const storyHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
                width: 1080px;
                height: 1920px;
                background-color: #060b18;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                position: relative;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                padding: 72px 54px;
            }
            .bg-layer {
                position: absolute;
                top: 0;
                left: 0;
                width: 1080px;
                height: 1920px;
                background-image: url('${bgDataUrl}');
                background-size: cover;
                background-position: center;
                z-index: 1;
            }
            .vignette-top {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 320px;
                background: linear-gradient(to bottom, rgba(5, 10, 24, 0.94) 0%, rgba(5, 10, 24, 0.4) 65%, transparent 100%);
                z-index: 2;
            }
            .vignette-bottom {
                position: absolute;
                bottom: 0;
                left: 0;
                right: 0;
                height: 750px;
                background: linear-gradient(to top, rgba(4, 8, 20, 0.98) 0%, rgba(4, 8, 20, 0.88) 55%, rgba(4, 8, 20, 0.2) 85%, transparent 100%);
                z-index: 2;
            }
            .content-top {
                position: relative;
                z-index: 3;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .brand-badge {
                display: flex;
                align-items: center;
                gap: 18px;
                background: rgba(15, 23, 42, 0.8);
                backdrop-filter: blur(16px);
                border: 1px solid rgba(250, 204, 21, 0.3);
                padding: 12px 24px 12px 14px;
                border-radius: 40px;
                box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
            }
            .brand-logo {
                width: 56px;
                height: 56px;
                border-radius: 50%;
                border: 2px solid #facc15;
            }
            .brand-text {
                display: flex;
                flex-direction: column;
            }
            .brand-name {
                font-size: 24px;
                font-weight: 800;
                color: #ffffff;
                letter-spacing: -0.4px;
            }
            .brand-sub {
                font-size: 13px;
                color: #fef08a;
                font-weight: 600;
                letter-spacing: 0.6px;
                text-transform: uppercase;
            }
            .festive-tag {
                background: linear-gradient(135deg, #d97706, #b45309);
                color: #ffffff;
                border: 1px solid #fef08a;
                padding: 10px 22px;
                border-radius: 30px;
                font-size: 15px;
                font-weight: 800;
                letter-spacing: 0.8px;
                text-transform: uppercase;
                box-shadow: 0 6px 20px rgba(217, 119, 6, 0.4);
            }

            .content-bottom {
                position: relative;
                z-index: 3;
                display: flex;
                flex-direction: column;
                gap: 20px;
            }
            .glass-card {
                background: rgba(10, 16, 32, 0.85);
                backdrop-filter: blur(24px);
                border: 1px solid rgba(250, 204, 21, 0.35);
                border-radius: 28px;
                padding: 38px 40px;
                box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
                display: flex;
                flex-direction: column;
                gap: 16px;
            }
            .festive-header-box {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .title-hindi {
                font-size: 30px;
                font-weight: 800;
                color: #facc15;
                letter-spacing: 0.5px;
            }
            .title-english {
                font-size: 48px;
                font-weight: 900;
                background: linear-gradient(135deg, #ffffff 0%, #fef08a 60%, #facc15 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                letter-spacing: -0.9px;
                line-height: 1.15;
            }
            .greeting-body {
                font-size: 21px;
                line-height: 1.55;
                color: #e2e8f0;
                font-weight: 400;
            }
            .greeting-body strong {
                color: #fde047;
                font-weight: 700;
            }
            .demons-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-top: 6px;
            }
            .demon-box {
                background: rgba(255, 255, 255, 0.04);
                border: 1px solid rgba(250, 204, 21, 0.2);
                border-radius: 12px;
                padding: 10px 14px;
                display: flex;
                align-items: center;
                gap: 10px;
                font-size: 15px;
                font-weight: 600;
                color: #fef08a;
            }
            .demon-box span {
                font-size: 18px;
            }
            .footer-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 0 6px;
            }
            .footer-note {
                font-size: 15px;
                color: #94a3b8;
                font-weight: 500;
            }
            .footer-url {
                font-size: 16px;
                color: #facc15;
                font-weight: 800;
                letter-spacing: 0.3px;
            }
        </style>
    </head>
    <body>
        <div class="bg-layer"></div>
        <div class="vignette-top"></div>
        <div class="vignette-bottom"></div>

        <div class="content-top">
            <div class="brand-badge">
                <img src="${logoDataUrl}" class="brand-logo" alt="Logo">
                <div class="brand-text">
                    <span class="brand-name">TrustPointFin</span>
                    <span class="brand-sub">Financial Intelligence</span>
                </div>
            </div>
            <div class="festive-tag">✨ Happy Dussehra</div>
        </div>

        <div class="content-bottom">
            <div class="glass-card">
                <div class="title-hindi">शुभ विजयादशमी • विजय पर्व</div>
                <h1 class="title-english">Victory of Financial Wisdom</h1>
                <p class="greeting-body">
                    As righteousness triumphs over darkness, let wisdom conquer your financial vulnerabilities. Slay the modern demons of <strong>Debt, Inflation, and Impulsive Speculation</strong> with the bow of lifelong discipline.
                </p>
                <div class="demons-grid">
                    <div class="demon-box"><span>🏹</span> Slay High-Interest Debt</div>
                    <div class="demon-box"><span>🛡️</span> Shield with Emergency Fund</div>
                    <div class="demon-box"><span>📈</span> Beat Inflation with Equity</div>
                    <div class="demon-box"><span>💡</span> Conquer Market Fear & FOMO</div>
                </div>
            </div>
            <div class="footer-row">
                <span class="footer-note">TrustPointFin wishes you and your family lasting wealth & happiness!</span>
                <span class="footer-url">trustpointfin.org</span>
            </div>
        </div>
    </body>
    </html>
    `;

    await storyPage.setContent(storyHtml, { waitUntil: 'domcontentloaded' });
    const storyOutputPath = path.join(__dirname, 'dussehra_story.jpg');
    await storyPage.screenshot({ path: storyOutputPath, type: 'jpeg', quality: 95 });
    console.log(`✅ Story Creative saved to: ${storyOutputPath}`);

    // Copy both to artifact directory for presentation
    const artifactDir = 'C:\\Users\\HP\\.gemini\antigravity\\brain\\b0a03e58-6b22-498e-b40e-745a1b5971d0';
    fs.copyFileSync(feedOutputPath, path.join(artifactDir, 'dussehra_feed.jpg'));
    fs.copyFileSync(storyOutputPath, path.join(artifactDir, 'dussehra_story.jpg'));

    await browser.close();
    console.log("🎉 All Dussehra creatives successfully generated!");
}

renderCreatives().catch(err => {
    console.error("❌ Error rendering creatives:", err);
    process.exit(1);
});
