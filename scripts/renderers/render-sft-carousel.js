/**
 * TrustPoint Finance - Mobile-Optimized Institutional SFT Carousel Renderer
 * scripts/renderers/render-sft-carousel.js
 * 
 * Rebuilt with true 1080x1350 mobile-first typography and layout:
 * - Scaled for smartphone screens (titles 48px, body 24px, metrics 72px)
 * - Large 60px logo badge in header
 * - Dominant 700px central infographic on every slide
 * - Generous 64px padding and balanced vertical hierarchy
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '../..');
const SLIDES_DIR = path.join(ROOT, 'slides');
const ARTIFACT_DIR = 'C:/Users/HP/.gemini/antigravity/brain/b0a03e58-6b22-498e-b40e-745a1b5971d0';

// Read logo as base64
let logoBase64 = '';
const logoPath = path.join(ROOT, 'tpf-logo.jpg');
if (fs.existsSync(logoPath)) {
  const logoBuf = fs.readFileSync(logoPath);
  logoBase64 = `data:image/jpeg;base64,${logoBuf.toString('base64')}`;
}

function generateSlideHtml(slideNum, symbol = 'HDFCBANK') {
  let mainContent = '';

  if (slideNum === 1) {
    // ========================================================
    // SLIDE 1: HERO HOOK (Big Impact Number + Delivery Gauge)
    // ========================================================
    mainContent = `
      <div class="flex flex-col justify-between h-full py-4">
        
        <!-- Header Tag & Title -->
        <div class="space-y-4">
          <div class="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 text-lg font-black tracking-wider uppercase">
            <span class="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-pulse"></span>
            NSE BHAVCOPY ANOMALY • ${symbol}
          </div>
          
          <h1 class="text-5xl font-black text-white leading-tight">
            Why Did Smart Money Buy <span class="text-emerald-400">₹2,660 CR</span> While Retail Panic Sold?
          </h1>
          
          <p class="text-slate-300 text-2xl font-medium leading-relaxed">
            Price dipped <span class="text-rose-400 font-bold mono">-3.33%</span>, but delivery spiked to an abnormal <span class="text-emerald-400 font-bold mono">57.53%</span>.
          </p>
        </div>

        <!-- Central Infographic: Delivery Dial / Gauge & Volume Spike -->
        <div class="bg-gradient-to-b from-slate-900/90 to-slate-950/95 border-2 border-slate-800 rounded-3xl p-8 shadow-2xl relative">
          
          <div class="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
            <div class="text-lg font-bold text-slate-300 uppercase tracking-wider flex items-center gap-3">
              <span class="w-3 h-3 rounded-full bg-emerald-400"></span>
              Institutional Delivery Surge vs Baseline
            </div>
            <div class="text-sm font-mono text-emerald-400 font-bold bg-emerald-950/80 px-3 py-1 rounded-md border border-emerald-500/30">
              HIGH CONVICTION
            </div>
          </div>

          <!-- Visual Comparison Bars -->
          <div class="space-y-6">
            <!-- Normal -->
            <div class="space-y-2">
              <div class="flex justify-between text-xl font-mono">
                <span class="text-slate-400">Normal 30-Day Delivery</span>
                <span class="text-slate-300 font-bold">38.20%</span>
              </div>
              <div class="w-full bg-slate-800 h-10 rounded-2xl overflow-hidden p-1 flex items-center">
                <div class="bg-slate-600 h-full rounded-xl" style="width: 38.2%;"></div>
              </div>
            </div>

            <!-- Spike -->
            <div class="space-y-2">
              <div class="flex justify-between text-xl font-mono">
                <span class="text-emerald-400 font-bold">Yesterday's Absorption Spike</span>
                <span class="text-emerald-400 font-black text-2xl">57.53% (+50.6% Surge)</span>
              </div>
              <div class="w-full bg-slate-800 h-14 rounded-2xl overflow-hidden p-1.5 flex items-center border-2 border-emerald-500/50">
                <div class="bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 h-full rounded-xl shadow-lg shadow-emerald-500/40" style="width: 57.53%;"></div>
              </div>
            </div>
          </div>

          <!-- Bottom Capital Callout -->
          <div class="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-slate-800">
            <div class="bg-slate-950 p-5 rounded-2xl text-center border border-slate-800/80">
              <div class="text-sm uppercase text-slate-400 font-bold">Demat Physical Delivery</div>
              <div class="text-3xl font-black text-emerald-400 mono mt-1">₹2,660.40 CR</div>
              <div class="text-xs text-slate-500 mt-1">Shares locked into custody</div>
            </div>
            <div class="bg-slate-950 p-5 rounded-2xl text-center border border-slate-800/80">
              <div class="text-sm uppercase text-slate-400 font-bold">Intraday Scalp Churn</div>
              <div class="text-3xl font-black text-slate-400 mono mt-1">₹1,964.80 CR</div>
              <div class="text-xs text-slate-500 mt-1">Canceled out by 3:30 PM</div>
            </div>
          </div>
        </div>

        <!-- Takeaway Pill -->
        <div class="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-5 flex items-center gap-4">
          <div class="text-3xl">💡</div>
          <div class="text-lg text-slate-200 leading-snug">
            <strong class="text-emerald-400">Order Flow Reality:</strong> While retail dumped on support breaks, institutions absorbed over 57% of total volume into long-term custody.
          </div>
        </div>

      </div>
    `;
  } else if (slideNum === 2) {
    // ========================================================
    // SLIDE 2: THE LIQUIDITY TRAP DIAGRAM
    // ========================================================
    mainContent = `
      <div class="flex flex-col justify-between h-full py-4">
        
        <div class="space-y-4">
          <div class="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 text-lg font-black tracking-wider uppercase">
            AUCTION MARKET MECHANICS
          </div>
          
          <h2 class="text-5xl font-black text-white leading-tight">
            Retail Sees Panic. <br>Smart Money Sees Wholesale Value.
          </h2>
        </div>

        <!-- Visual Flow Diagram: Retail Liquidity Cascade into Institutional Block -->
        <div class="space-y-6 my-2">
          
          <!-- Box 1: Retail Stop Run -->
          <div class="bg-gradient-to-r from-rose-950/40 to-slate-900 border-2 border-rose-500/40 rounded-3xl p-7 relative">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xl font-black text-rose-400 uppercase tracking-wider flex items-center gap-3">
                <span class="text-2xl">🛑</span> Retail Panic Sell-Side Liquidity
              </span>
              <span class="text-base text-rose-300 font-mono font-bold">Market Sell Orders</span>
            </div>
            <p class="text-lg text-slate-300 leading-relaxed font-medium">
              Retail traders dump holdings at market bid prices as the stock breaks down below ₹825, fearing further collapse.
            </p>
          </div>

          <!-- Big Visual Downward Cascade Arrows -->
          <div class="flex justify-center items-center py-1">
            <div class="px-6 py-2 rounded-full bg-slate-800 border border-slate-700 text-sm font-mono text-slate-400 flex items-center gap-2">
              <span>⬇️</span> INCOMING SELL LIQUIDITY IS ABSORBED <span>⬇️</span>
            </div>
          </div>

          <!-- Box 2: Institutional Limit Absorption -->
          <div class="bg-gradient-to-r from-emerald-950/50 to-slate-900 border-2 border-emerald-500/60 rounded-3xl p-7 shadow-2xl shadow-emerald-500/10">
            <div class="flex items-center justify-between mb-3">
              <span class="text-xl font-black text-emerald-400 uppercase tracking-wider flex items-center gap-3">
                <span class="text-2xl">⚡</span> Institutional Passive Limit Block (₹815 - ₹818)
              </span>
              <span class="text-base text-emerald-300 font-mono font-bold">Absorption Active</span>
            </div>
            <p class="text-lg text-slate-200 leading-relaxed font-medium">
              Institutional algorithms match incoming sell market orders with passive buy limit bids. Float is quietly transferred into demat custody without lifting prices.
            </p>
          </div>

        </div>

        <!-- Macro Derivatives Bar -->
        <div class="bg-slate-900 border-2 border-slate-800 rounded-3xl p-6 space-y-4">
          <div class="flex justify-between items-center">
            <span class="text-base font-bold text-slate-300 uppercase tracking-wider">Index Derivatives Asymmetry Spread</span>
            <span class="text-base font-bold text-amber-400 font-mono">+50.04% Spread</span>
          </div>
          
          <div class="space-y-3">
            <div class="flex justify-between text-base font-mono">
              <span class="text-slate-400">FIIs (Hedging Portfolios)</span>
              <span class="text-rose-400 font-bold">79.87% Short</span>
            </div>
            <div class="w-full bg-slate-800 h-4 rounded-full overflow-hidden">
              <div class="bg-rose-500 h-full rounded-full" style="width: 79.87%;"></div>
            </div>

            <div class="flex justify-between text-base font-mono pt-1">
              <span class="text-slate-400">Retail Clients (Crowded Long)</span>
              <span class="text-emerald-400 font-bold">70.17% Long</span>
            </div>
            <div class="w-full bg-slate-800 h-4 rounded-full overflow-hidden">
              <div class="bg-emerald-500 h-full rounded-full" style="width: 70.17%;"></div>
            </div>
          </div>
        </div>

      </div>
    `;
  } else if (slideNum === 3) {
    // ========================================================
    // SLIDE 3: QUANTITATIVE FOOTPRINT METRICS
    // ========================================================
    mainContent = `
      <div class="flex flex-col justify-between h-full py-4">
        
        <div class="space-y-4">
          <div class="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-blue-500/20 border-2 border-blue-500/40 text-blue-400 text-lg font-black tracking-wider uppercase">
            QUANTITATIVE VERIFICATION
          </div>
          
          <h2 class="text-5xl font-black text-white leading-tight">
            The Mathematical Footprint: Delivery vs Speculation
          </h2>
          
          <p class="text-slate-300 text-2xl font-medium leading-relaxed">
            Data straight from the official NSE Bhavcopy for the trading session.
          </p>
        </div>

        <!-- 4-Grid Metric Cards (Large & Readable) -->
        <div class="grid grid-cols-2 gap-6 my-auto">
          
          <div class="bg-slate-900 border-2 border-slate-800 p-8 rounded-3xl space-y-2">
            <div class="text-base uppercase text-slate-400 font-bold">Closing Price</div>
            <div class="text-5xl font-black text-white mono">₹817.80</div>
            <div class="text-base text-rose-400 font-bold font-mono">-3.33% Correction</div>
          </div>

          <div class="bg-slate-900 border-2 border-emerald-500/40 p-8 rounded-3xl space-y-2 bg-gradient-to-br from-emerald-950/20 to-slate-900">
            <div class="text-base uppercase text-emerald-400 font-bold">Delivery Ratio</div>
            <div class="text-5xl font-black text-emerald-400 mono">57.53%</div>
            <div class="text-base text-emerald-300 font-bold font-mono">+19.3% Above 30D Avg</div>
          </div>

          <div class="bg-slate-900 border-2 border-blue-500/40 p-8 rounded-3xl space-y-2 col-span-2 bg-gradient-to-br from-blue-950/20 to-slate-900">
            <div class="text-base uppercase text-blue-400 font-bold">Total Custodial Capital Deployed</div>
            <div class="text-6xl font-black text-blue-400 mono">₹2,660.40 Crore</div>
            <div class="text-lg text-slate-300 mt-2 font-medium">
              Physical shares permanently credited into investor Demat accounts — not speculative day trading.
            </div>
          </div>

        </div>

        <!-- Rule Card -->
        <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 text-lg text-slate-300 leading-relaxed">
          💡 <strong class="text-emerald-400">Order Flow Principle:</strong> When price hits fresh swing lows but delivery volume surges to multi-month highs, selling pressure is being absorbed by institutional balance sheets.
        </div>

      </div>
    `;
  } else if (slideNum === 4) {
    // ========================================================
    // SLIDE 4: CONNECTED 3-STEP ROADMAP
    // ========================================================
    mainContent = `
      <div class="flex flex-col justify-between h-full py-4">
        
        <div class="space-y-4">
          <div class="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 text-lg font-black tracking-wider uppercase">
            EXECUTION PLAYBOOK
          </div>
          
          <h2 class="text-5xl font-black text-white leading-tight">
            How Institutional Desks Trade Absorption Setups
          </h2>
          
          <p class="text-slate-300 text-2xl font-medium leading-relaxed">
            Never catch a falling knife. The professional playbook follows 3 strict rules:
          </p>
        </div>

        <!-- 3 Stepper Nodes -->
        <div class="space-y-5 my-auto">
          
          <div class="flex items-start gap-6 bg-slate-900 border-2 border-slate-800 rounded-3xl p-7">
            <div class="w-16 h-16 rounded-2xl bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-400 font-black flex items-center justify-center flex-shrink-0 text-2xl mono">
              01
            </div>
            <div class="space-y-1">
              <div class="text-2xl font-extrabold text-white">Value Area Acceptance</div>
              <div class="text-lg text-slate-300 leading-relaxed">
                Do not buy during the red drop. Wait for a subsequent session close above the Point of Control (POC) at ₹822.
              </div>
            </div>
          </div>

          <div class="flex items-start gap-6 bg-slate-900 border-2 border-slate-800 rounded-3xl p-7">
            <div class="w-16 h-16 rounded-2xl bg-blue-500/20 border-2 border-blue-500/40 text-blue-400 font-black flex items-center justify-center flex-shrink-0 text-2xl mono">
              02
            </div>
            <div class="space-y-1">
              <div class="text-2xl font-extrabold text-white">Volume Profile Support Retest</div>
              <div class="text-lg text-slate-300 leading-relaxed">
                Confirm that the low volume nodes (LVN) created during the sell-off hold as price rejection floors.
              </div>
            </div>
          </div>

          <div class="flex items-start gap-6 bg-slate-900 border-2 border-slate-800 rounded-3xl p-7">
            <div class="w-16 h-16 rounded-2xl bg-rose-500/20 border-2 border-rose-500/40 text-rose-400 font-black flex items-center justify-center flex-shrink-0 text-2xl mono">
              03
            </div>
            <div class="space-y-1">
              <div class="text-2xl font-extrabold text-white">Strict Invalidation Level</div>
              <div class="text-lg text-slate-300 leading-relaxed">
                Thesis is invalidated immediately if price breaks below the absorption low of ₹810 on expanding volume.
              </div>
            </div>
          </div>

        </div>

        <div class="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 text-center text-base font-mono text-slate-400">
          Typical Risk-to-Reward Ratio on Confirmed Setups: 1 : 3.4
        </div>

      </div>
    `;
  } else if (slideNum === 5) {
    // ========================================================
    // SLIDE 5: EXECUTIVE DESK CARD & ACTION
    // ========================================================
    mainContent = `
      <div class="flex flex-col justify-between h-full py-4 text-center">
        
        <div class="space-y-4">
          ${logoBase64 ? `<img src="${logoBase64}" class="w-24 h-24 rounded-3xl mx-auto border-2 border-emerald-500/50 shadow-2xl shadow-emerald-500/20">` : ''}
          
          <div class="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-black tracking-widest uppercase">
            TRUSTPOINT FINANCE RESEARCH DESK
          </div>
          
          <h2 class="text-5xl font-black text-white leading-tight">
            Trade with Institutional Market Intelligence
          </h2>
          
          <p class="text-slate-300 text-2xl max-w-2xl mx-auto leading-relaxed">
            Stop trading on noisy retail tips. Upgrade to order flow, Bhavcopy delivery models, and auction market structure.
          </p>
        </div>

        <!-- 2 Big Action Cards -->
        <div class="space-y-5 max-w-xl mx-auto w-full my-auto text-left">
          
          <div class="bg-gradient-to-r from-emerald-950/60 to-slate-900 border-2 border-emerald-500/40 p-6 rounded-3xl flex items-center gap-6">
            <div class="text-5xl flex-shrink-0">📩</div>
            <div>
              <div class="text-2xl font-black text-emerald-400">Comment "FLOW" Below</div>
              <div class="text-base text-slate-300 mt-1">We will DM you our complete Auction Market Theory Checklist PDF.</div>
            </div>
          </div>

          <div class="bg-gradient-to-r from-blue-950/60 to-slate-900 border-2 border-blue-500/40 p-6 rounded-3xl flex items-center gap-6">
            <div class="text-5xl flex-shrink-0">🔗</div>
            <div>
              <div class="text-2xl font-black text-blue-400">Link in Bio</div>
              <div class="text-base text-slate-300 mt-1">Connect with our financial research desk & open an institutional Demat account.</div>
            </div>
          </div>

        </div>

        <div class="text-sm text-slate-500 leading-relaxed max-w-xl mx-auto border-t border-slate-800 pt-4">
          TrustPoint Finance is an Authorised Person of Angel One Ltd. (SEBI Reg. No. INZ000161534). Compiled strictly for educational, quantitative market structure, and statistical research purposes.
        </div>

      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;600;700;800;900&family=JetBrains+Mono:wght@600;700;800&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      margin: 0;
      padding: 0;
      background: radial-gradient(circle at 80% 15%, #0f2347 0%, #091224 45%, #04070e 100%);
      color: #f8fafc;
      width: 1080px;
      height: 1350px;
      overflow: hidden;
      box-sizing: border-box;
      position: relative;
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="p-16 flex flex-col justify-between">

  <!-- TOP HEADER (Clean, Prominent Branding) -->
  <header class="flex items-center justify-between border-b-2 border-slate-800 pb-5">
    <div class="flex items-center gap-4">
      ${logoBase64 ? `<img src="${logoBase64}" class="w-14 h-14 rounded-2xl border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/20">` : ''}
      <div>
        <div class="text-2xl font-black tracking-wider text-white">
          TRUSTPOINT<span class="text-emerald-400">FIN</span>
        </div>
        <div class="text-xs text-slate-400 font-mono tracking-widest uppercase font-bold">
          QUANTITATIVE RESEARCH DESK
        </div>
      </div>
    </div>
    
    <div class="px-5 py-2 rounded-xl bg-slate-900 border-2 border-slate-800 text-slate-300 font-mono text-base font-bold">
      Slide 0${slideNum} / 05
    </div>
  </header>

  <!-- MAIN BODY -->
  <main class="flex-grow flex flex-col justify-between my-4">
    ${mainContent}
  </main>

  <!-- BOTTOM FOOTER -->
  <footer class="border-t-2 border-slate-800 pt-5 flex items-center justify-between text-base text-slate-400 font-medium">
    <div class="flex items-center gap-3">
      <span class="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
      <span class="font-bold text-slate-200">Authorised Person • Angel One Ltd.</span>
      <span class="text-xs text-slate-500 font-mono">(SEBI Reg. INZ000161534)</span>
    </div>
    <div class="text-emerald-400 font-black text-lg flex items-center gap-2">
      ${slideNum < 5 ? 'Swipe Next &rarr;' : 'Save Post • Share with a Trader'}
    </div>
  </footer>

</body>
</html>`;
}

async function renderCarouselSlides() {
  if (!fs.existsSync(SLIDES_DIR)) fs.mkdirSync(SLIDES_DIR, { recursive: true });
  if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  console.log('[Renderer] Launching Puppeteer to render 5 mobile-scaled slides at 1080x1350...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });

  const generatedFiles = [];

  for (let i = 1; i <= 5; i++) {
    const html = generateSlideHtml(i, 'HDFCBANK');

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 600));

    const filename = `final_slide_${i}.jpg`;
    const outputPath = path.join(SLIDES_DIR, filename);
    const artifactPath = path.join(ARTIFACT_DIR, filename);

    await page.screenshot({
      path: outputPath,
      type: 'jpeg',
      quality: 95
    });

    fs.copyFileSync(outputPath, artifactPath);

    console.log(`[Renderer] ✅ Rendered Mobile Slide: ${filename} (1080x1350)`);
    generatedFiles.push({ filename, path: outputPath, artifactPath });
  }

  await browser.close();
  console.log(`[Renderer] 🎉 Successfully rendered all 5 mobile-scaled JPEG slides!`);
  return generatedFiles;
}

if (require.main === module) {
  renderCarouselSlides()
    .then(files => {
      console.log('\nGenerated premium files in slides/ directory:');
      files.forEach(f => console.log(`- ${f.filename}`));
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { renderCarouselSlides };
