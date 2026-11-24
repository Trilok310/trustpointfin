/**
 * TrustPoint Finance - Institutional SFT Carousel Renderer
 * scripts/renderers/render-sft-carousel.js
 * 
 * Renders high-resolution 1080 x 1350 px (4:5 Portrait) dark-mode JPEG slides
 * for Instagram & Facebook carousel publishing.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '../..');
const SLIDES_DIR = path.join(ROOT, 'slides');
const ARTIFACT_DIR = 'C:/Users/HP/.gemini/antigravity/brain/b0a03e58-6b22-498e-b40e-745a1b5971d0';

function generateSlideHtml(slide, totalSlides, symbol) {
  const slideNum = slide.slideIndex;

  let bodyContent = '';

  if (slideNum === 1) {
    // Hero Hook Slide
    bodyContent = `
      <div class="my-auto py-6">
        <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/90 border border-slate-700 text-slate-300 text-sm font-semibold mb-6">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-emerald-400 font-bold">${symbol}</span> • NSE Delivery Anomaly
        </div>

        <div class="text-slate-400 text-sm uppercase tracking-widest font-bold mb-2">Institutional Capital Absorption</div>
        <div class="text-6xl font-black text-emerald-400 tracking-tight glow-emerald my-2 mono">
          ₹2,660.4 CR
        </div>
        
        <h1 class="text-3xl font-extrabold text-white leading-tight mt-6">
          ${slide.headline}
        </h1>

        <p class="text-slate-300 text-lg leading-relaxed mt-4 font-medium">
          ${slide.subheadline}
        </p>

        <!-- Stat Highlight Box -->
        <div class="grid grid-cols-2 gap-4 mt-8">
          <div class="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl text-center">
            <div class="text-xs text-slate-400 uppercase font-semibold">Institutional Delivery Ratio</div>
            <div class="text-3xl text-emerald-400 font-black mono mt-1">57.53%</div>
            <div class="text-xs text-slate-500 mt-1">Normal baseline: 35–45%</div>
          </div>
          <div class="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl text-center">
            <div class="text-xs text-slate-400 uppercase font-semibold">Day Price Movement</div>
            <div class="text-3xl text-rose-400 font-black mono mt-1">-3.33%</div>
            <div class="text-xs text-slate-500 mt-1">Retail panic selling session</div>
          </div>
        </div>
      </div>
    `;
  } else if (slideNum === 2) {
    // The Liquidity Trap Slide
    bodyContent = `
      <div class="my-auto py-6 space-y-6">
        <div>
          <div class="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Auction Market Mechanics</div>
          <h2 class="text-4xl font-black text-white leading-tight">${slide.headline}</h2>
        </div>

        <p class="text-slate-300 text-lg leading-relaxed font-medium">
          ${slide.body}
        </p>

        <!-- Visual Flow Comparison -->
        <div class="space-y-4 my-6">
          <div class="bg-rose-950/30 border border-rose-500/30 p-5 rounded-2xl">
            <div class="text-rose-400 font-bold text-sm uppercase flex items-center gap-2 mb-1">
              <span>🛑</span> Retail Participant Action
            </div>
            <div class="text-slate-200 text-base leading-relaxed">
              Panic dumping into breakdown support. Triggered by negative news and retail fear.
            </div>
          </div>

          <div class="bg-emerald-950/30 border border-emerald-500/30 p-5 rounded-2xl">
            <div class="text-emerald-400 font-bold text-sm uppercase flex items-center gap-2 mb-1">
              <span>⚡</span> Institutional Algorithm Action
            </div>
            <div class="text-slate-200 text-base leading-relaxed">
              Passive limit-order absorption. Accumulating ₹2,660 Cr in demat custody without lifting market ask prices.
            </div>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 font-mono">
          Asymmetric Factor: FIIs currently hold 79.87% net short hedges in Index Futures vs Retail 70.17% long.
        </div>
      </div>
    `;
  } else if (slideNum === 3) {
    // Quantitative Footprint Slide
    bodyContent = `
      <div class="my-auto py-6 space-y-6">
        <div>
          <div class="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">NSE Full Bhavcopy Verification</div>
          <h2 class="text-4xl font-black text-white leading-tight">${slide.headline}</h2>
        </div>

        <p class="text-slate-300 text-base leading-relaxed">
          ${slide.body}
        </p>

        <!-- Metrics Grid -->
        <div class="grid grid-cols-2 gap-4 my-6">
          <div class="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl">
            <div class="text-xs text-slate-400 uppercase font-semibold">Closing Price</div>
            <div class="text-3xl font-black text-white mono mt-1">₹817.80</div>
            <div class="text-xs text-rose-400 font-semibold mt-1">Day Change: -3.33%</div>
          </div>

          <div class="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl">
            <div class="text-xs text-slate-400 uppercase font-semibold">Delivery Percentage</div>
            <div class="text-3xl font-black text-emerald-400 mono mt-1">57.53%</div>
            <div class="text-xs text-emerald-400/80 font-semibold mt-1">+15% Above Baseline</div>
          </div>

          <div class="bg-slate-900/90 border border-slate-800 p-6 rounded-2xl col-span-2">
            <div class="text-xs text-slate-400 uppercase font-semibold">Total Demat Capital Committed</div>
            <div class="text-4xl font-black text-blue-400 mono mt-1">₹2,660.40 Crore</div>
            <div class="text-xs text-slate-400 mt-1">Actual shares settled in custodial accounts, not intraday churn.</div>
          </div>
        </div>

        <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-300 leading-relaxed">
          💡 <strong class="text-emerald-400">Order Flow Insight:</strong> When price hits fresh swing lows but delivery volume surges to multi-month highs, selling pressure is being absorbed by institutional balance sheets.
        </div>
      </div>
    `;
  } else if (slideNum === 4) {
    // SFT Playbook Slide
    bodyContent = `
      <div class="my-auto py-6 space-y-6">
        <div>
          <div class="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Execution Protocol</div>
          <h2 class="text-4xl font-black text-white leading-tight">${slide.headline}</h2>
        </div>

        <p class="text-slate-300 text-base leading-relaxed">
          ${slide.body}
        </p>

        <div class="space-y-4 my-6">
          <div class="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center flex-shrink-0 mono text-lg">1</div>
            <div>
              <div class="text-white font-bold text-base">Value Area Acceptance</div>
              <div class="text-slate-400 text-xs mt-1 leading-relaxed">Wait for a daily session close back above the Point of Control (POC). Never rush into a falling knife.</div>
            </div>
          </div>

          <div class="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center flex-shrink-0 mono text-lg">2</div>
            <div>
              <div class="text-white font-bold text-base">Volume Profile Support</div>
              <div class="text-slate-400 text-xs mt-1 leading-relaxed">Ensure Low Volume Nodes (LVN) below the price serve as clean rejection zones on subsequent retests.</div>
            </div>
          </div>

          <div class="bg-slate-900/90 border border-slate-800 p-5 rounded-2xl flex items-start gap-4">
            <div class="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 font-bold flex items-center justify-center flex-shrink-0 mono text-lg">3</div>
            <div>
              <div class="text-white font-bold text-base">Invalidation Discipline</div>
              <div class="text-slate-400 text-xs mt-1 leading-relaxed">If price breaks decisively below the day's absorption low (₹810) on expanding volume, the thesis is invalidated.</div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (slideNum === 5) {
    // Slide 5: CTA & Summary
    bodyContent = `
      <div class="my-auto py-6 space-y-6 text-center">
        <div class="w-20 h-20 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center text-3xl font-black">
          TP
        </div>

        <div>
          <div class="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">TrustPoint Finance Research</div>
          <h2 class="text-4xl font-black text-white leading-tight">Trade with Institutional Market Intelligence</h2>
        </div>

        <p class="text-slate-300 text-base max-w-lg mx-auto leading-relaxed">
          Stop trading on noisy retail tips. Upgrade to real order flow, auction market structure, and daily delivery absorption models.
        </p>

        <!-- CTA Cards -->
        <div class="space-y-3 max-w-md mx-auto my-6 text-left">
          <div class="bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-2xl flex items-center gap-3">
            <span class="text-2xl">📩</span>
            <div class="text-xs text-slate-200">
              <strong class="text-emerald-400 text-sm block">Comment "FLOW" Below</strong>
              We will DM you our complete Auction Market Theory Checklist PDF.
            </div>
          </div>

          <div class="bg-blue-950/40 border border-blue-500/40 p-4 rounded-2xl flex items-center gap-3">
            <span class="text-2xl">🔗</span>
            <div class="text-xs text-slate-200">
              <strong class="text-blue-400 text-sm block">Link in Bio</strong>
              Connect with our financial research desk & open an institutional Demat account.
            </div>
          </div>
        </div>

        <div class="pt-4 text-[11px] text-slate-500 leading-relaxed max-w-lg mx-auto">
          Authorised Person of Angel One Ltd. (SEBI Reg. No. INZ000161534). Compiled for educational and quantitative research purposes only.
        </div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      margin: 0;
      padding: 0;
      background: #080c14;
      color: #f8fafc;
      width: 1080px;
      height: 1350px;
      overflow: hidden;
      box-sizing: border-box;
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .glow-emerald { text-shadow: 0 0 35px rgba(16, 185, 129, 0.45); }
    .glow-blue { text-shadow: 0 0 35px rgba(59, 130, 246, 0.45); }
  </style>
</head>
<body class="p-14 flex flex-col justify-between relative">

  <!-- Ambient Glow Effects -->
  <div class="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
  <div class="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

  <!-- Header -->
  <header class="flex items-center justify-between z-10 border-b border-slate-800/80 pb-6">
    <div class="flex items-center gap-3">
      <span class="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-extrabold tracking-wider uppercase">
        ${slide.tag}
      </span>
    </div>
    <div class="flex items-center gap-4">
      <div class="text-sm font-extrabold tracking-widest text-slate-400 uppercase">
        TRUSTPOINT<span class="text-emerald-400">FIN</span>
      </div>
      <div class="text-xs px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-400 font-mono font-bold">
        ${slideNum}/${totalSlides}
      </div>
    </div>
  </header>

  <!-- Main Body Content -->
  <main class="flex-grow flex flex-col justify-center z-10">
    ${bodyContent}
  </main>

  <!-- Footer -->
  <footer class="z-10 border-t border-slate-800/80 pt-5 flex items-center justify-between text-xs text-slate-500 font-medium">
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
      <span>SEBI Reg. Partner • Angel One</span>
    </div>
    <div class="text-emerald-400 font-bold flex items-center gap-1.5">
      ${slideNum < totalSlides ? 'Swipe for Breakdown &rarr;' : 'Save this Post • Share with a Trader'}
    </div>
  </footer>

</body>
</html>`;
}

async function renderCarouselSlides() {
  const pendingFile = path.join(__dirname, '../synthesizers/out/social-pending.json');
  if (!fs.existsSync(pendingFile)) {
    throw new Error('social-pending.json not found. Run synthesize-social.js first.');
  }

  const carouselData = JSON.parse(fs.readFileSync(pendingFile, 'utf-8'));
  const slides = carouselData.slides;

  if (!fs.existsSync(SLIDES_DIR)) fs.mkdirSync(SLIDES_DIR, { recursive: true });
  if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  console.log(`[Renderer] Launching Puppeteer to render ${slides.length} slides at 1080x1350...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });

  const generatedFiles = [];

  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i];
    const html = generateSlideHtml(slide, slides.length, carouselData.symbol);

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 600)); // allow layout settle

    const filename = `final_slide_${i + 1}.jpg`;
    const outputPath = path.join(SLIDES_DIR, filename);
    const artifactPath = path.join(ARTIFACT_DIR, filename);

    await page.screenshot({
      path: outputPath,
      type: 'jpeg',
      quality: 95
    });

    // Also copy to artifact directory for instant viewing
    fs.copyFileSync(outputPath, artifactPath);

    console.log(`[Renderer] ✅ Rendered: ${filename} (1080x1350)`);
    generatedFiles.push({ filename, path: outputPath, artifactPath });
  }

  await browser.close();
  console.log(`[Renderer] 🎉 Successfully rendered all ${slides.length} JPEG slides!`);
  return generatedFiles;
}

if (require.main === module) {
  renderCarouselSlides()
    .then(files => {
      console.log('\nGenerated files in slides/ directory:');
      files.forEach(f => console.log(`- ${f.filename}`));
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { renderCarouselSlides };
