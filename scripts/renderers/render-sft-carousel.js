/**
 * TrustPoint Finance - Premium Institutional SFT Carousel Renderer
 * scripts/renderers/render-sft-carousel.js
 * 
 * Generates world-class 1080 x 1350 px (4:5 Portrait) visual infographics
 * featuring real TrustPoint logo, multi-color depth gradients, SVG charts,
 * orderflow diagrams, and delivery gauges.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '../..');
const SLIDES_DIR = path.join(ROOT, 'slides');
const ARTIFACT_DIR = 'C:/Users/HP/.gemini/antigravity/brain/b0a03e58-6b22-498e-b40e-745a1b5971d0';

// Read logo and encode as base64
let logoBase64 = '';
const logoPath = path.join(ROOT, 'tpf-logo.jpg');
if (fs.existsSync(logoPath)) {
  const logoBuf = fs.readFileSync(logoPath);
  logoBase64 = `data:image/jpeg;base64,${logoBuf.toString('base64')}`;
}

function generateSlideHtml(slideNum, symbol = 'HDFCBANK') {
  let content = '';

  if (slideNum === 1) {
    // ==========================================
    // SLIDE 1: HERO HOOK WITH GAUGE & SPARKLINE
    // ==========================================
    content = `
      <div class="flex-grow flex flex-col justify-between py-2">
        <!-- Top Tag & Company Pill -->
        <div class="flex items-center justify-between">
          <div class="inline-flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs font-black tracking-widest uppercase">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            NSE BHAVCOPY ANOMALY
          </div>
          <div class="px-3.5 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80 text-xs font-mono text-slate-300 font-bold">
            ${symbol} • NSE CASH
          </div>
        </div>

        <!-- Big Headline Block -->
        <div class="space-y-2 mt-4">
          <div class="text-xs uppercase tracking-widest text-slate-400 font-bold">Institutional Capital Inflow</div>
          <div class="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 mono tracking-tight">
            ₹2,660.40 CR
          </div>
          <h1 class="text-3xl font-extrabold text-white leading-tight">
            Why Smart Money Absorbed HDFCBANK While Retail Panic Sold
          </h1>
          <p class="text-slate-300 text-sm leading-relaxed">
            Price dipped <span class="text-rose-400 font-bold mono">-3.33%</span> to ₹817.80, but delivery spiked to an abnormal <span class="text-emerald-400 font-bold mono">57.53%</span>.
          </p>
        </div>

        <!-- VISUAL INFOGRAPHIC: Price Dip vs Delivery Spike -->
        <div class="bg-gradient-to-br from-slate-900/90 to-slate-950/90 border border-slate-800/90 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
          <div class="flex items-center justify-between mb-4">
            <div class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              Order Flow Dynamics (Price vs Custodial Delivery)
            </div>
            <div class="text-[11px] font-mono text-slate-500">23-Nov-2026 Session</div>
          </div>

          <!-- SVG Chart: Price Fall vs Massive Volume Spike -->
          <svg class="w-full h-44" viewBox="0 0 500 160">
            <defs>
              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#10b981" stop-opacity="0.9" />
                <stop offset="100%" stop-color="#047857" stop-opacity="0.2" />
              </linearGradient>
              <linearGradient id="normalVol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#64748b" stop-opacity="0.5" />
                <stop offset="100%" stop-color="#334155" stop-opacity="0.1" />
              </linearGradient>
            </defs>

            <!-- Background Grid -->
            <line x1="0" y1="40" x2="500" y2="40" stroke="#1e293b" stroke-dasharray="4,4" />
            <line x1="0" y1="90" x2="500" y2="90" stroke="#1e293b" stroke-dasharray="4,4" />
            <line x1="0" y1="140" x2="500" y2="140" stroke="#334155" />

            <!-- Price Line (Falling) -->
            <path d="M 30,30 L 110,38 L 190,32 L 270,55 L 350,85 L 450,110" fill="none" stroke="#f43f5e" stroke-width="4" stroke-linecap="round" />
            <!-- Price Points -->
            <circle cx="30" cy="30" r="4" fill="#f43f5e" />
            <circle cx="450" cy="110" r="6" fill="#f43f5e" />
            <text x="400" y="130" fill="#f43f5e" font-size="12" font-family="'JetBrains Mono'" font-weight="bold">₹817.8 (-3.3%)</text>

            <!-- Normal Daily Delivery Bars -->
            <rect x="70" y="95" width="22" height="45" rx="4" fill="url(#normalVol)" />
            <rect x="150" y="100" width="22" height="40" rx="4" fill="url(#normalVol)" />
            <rect x="230" y="90" width="22" height="50" rx="4" fill="url(#normalVol)" />
            <rect x="310" y="85" width="22" height="55" rx="4" fill="url(#normalVol)" />

            <!-- TODAY'S ABNORMAL DELIVERY SPIKE -->
            <rect x="435" y="15" width="32" height="125" rx="6" fill="url(#volGrad)" stroke="#34d399" stroke-width="1.5" />
            
            <!-- Callout on Top of Spike -->
            <rect x="340" y="10" width="115" height="26" rx="6" fill="#064e3b" stroke="#10b981" stroke-width="1" />
            <text x="348" y="27" fill="#6ee7b7" font-size="11" font-family="'JetBrains Mono'" font-weight="bold">57.53% DELIVERY</text>
          </svg>
        </div>

        <!-- 2 Data Pill Cards -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-xl">
              📈
            </div>
            <div>
              <div class="text-[11px] text-slate-400 uppercase font-semibold">Delivery % vs 30D Avg</div>
              <div class="text-xl font-black text-emerald-400 mono">+19.3% Above Norm</div>
            </div>
          </div>

          <div class="bg-slate-900/80 border border-slate-800 p-4 rounded-2xl flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xl">
              💼
            </div>
            <div>
              <div class="text-[11px] text-slate-400 uppercase font-semibold">Demat Capital Transferred</div>
              <div class="text-xl font-black text-blue-400 mono">₹2,660.40 Crore</div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (slideNum === 2) {
    // ==========================================
    // SLIDE 2: THE LIQUIDITY TRAP DIAGRAM
    // ==========================================
    content = `
      <div class="flex-grow flex flex-col justify-between py-2">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
            AUCTION MARKET THEORY
          </div>
          <h2 class="text-3xl font-extrabold text-white">The Anatomy of an Institutional Absorption</h2>
          <p class="text-slate-300 text-xs mt-1">Retail panic supply gets channeled straight into smart money custodial vaults.</p>
        </div>

        <!-- VISUAL INFOGRAPHIC: Liquidity Pool Waterfall -->
        <div class="space-y-3 my-2">
          
          <!-- Layer 1: Retail Panic Pool -->
          <div class="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-4 relative">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-extrabold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🛑</span> Retail Sell-Side Liquidity Pool
              </span>
              <span class="text-[11px] text-rose-300 font-mono">Panic Stop-Loss Dump</span>
            </div>
            <p class="text-xs text-slate-300 leading-relaxed">
              Breakout and momentum retail traders place market-sell orders as stock breaks below recent support at ₹825.
            </p>
          </div>

          <!-- Connecting Arrows (SVG) -->
          <div class="flex justify-center items-center py-0.5">
            <svg width="40" height="28" viewBox="0 0 40 28">
              <path d="M 20,2 L 20,22 M 14,16 L 20,22 L 26,16" stroke="#fb7185" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
            </svg>
          </div>

          <!-- Layer 2: Institutional Limit Absorption Block -->
          <div class="bg-emerald-950/40 border-2 border-emerald-500/50 rounded-2xl p-5 shadow-xl shadow-emerald-500/10">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚡</span> Smart Money Passive Limit Block (₹815 - ₹818)
              </span>
              <span class="text-[11px] text-emerald-300 font-mono font-bold">Absorption Active</span>
            </div>
            <p class="text-xs text-slate-200 leading-relaxed font-medium">
              Institutional algorithms match incoming market sell orders with passive buy limit bids. The price doesn't bounce immediately — the float is quietly locked into physical delivery.
            </p>
          </div>

        </div>

        <!-- FII vs Retail Derivatives Asymmetry Bar -->
        <div class="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>Macro Position Asymmetry (Index Futures)</span>
            <span class="text-amber-400 font-mono">+50.04% Divergence Spread</span>
          </div>

          <!-- Bar 1: FII -->
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>FIIs (Hedged / Defensive)</span>
              <span class="text-rose-400 font-bold">79.87% Short</span>
            </div>
            <div class="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
              <div class="bg-rose-500 h-full rounded-full" style="width: 79.87%;"></div>
            </div>
          </div>

          <!-- Bar 2: Retail -->
          <div class="space-y-1">
            <div class="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>Retail Clients (Crowded Long)</span>
              <span class="text-emerald-400 font-bold">70.17% Long</span>
            </div>
            <div class="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden flex">
              <div class="bg-emerald-500 h-full rounded-full" style="width: 70.17%;"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (slideNum === 3) {
    // ==========================================
    // SLIDE 3: COMPARATIVE BAR CHART INFOGRAPHIC
    // ==========================================
    content = `
      <div class="flex-grow flex flex-col justify-between py-2">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">
            QUANTITATIVE VERIFICATION
          </div>
          <h2 class="text-3xl font-extrabold text-white">Delivery Volume vs Intraday Churn</h2>
          <p class="text-slate-300 text-xs mt-1">Isolating permanent portfolio allocation from speculative day trading.</p>
        </div>

        <!-- INFOGRAPHIC: Visual Comparative Bars (SVG) -->
        <div class="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl">
          <div class="text-xs font-bold text-slate-300 mb-6 uppercase tracking-wider">
            NSE Bhavcopy: Delivery Ratio Comparison
          </div>

          <!-- Visual Bar 1: Baseline -->
          <div class="space-y-2 mb-6">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-slate-400">30-Day Historical Average</span>
              <span class="text-slate-300 font-bold">38.20%</span>
            </div>
            <div class="w-full bg-slate-800 h-7 rounded-xl overflow-hidden flex items-center p-1">
              <div class="bg-slate-600 h-full rounded-lg" style="width: 38.2%;"></div>
            </div>
          </div>

          <!-- Visual Bar 2: Today's Spike -->
          <div class="space-y-2 mb-6">
            <div class="flex items-center justify-between text-xs font-mono">
              <span class="text-emerald-400 font-bold">Yesterday's Session Spike</span>
              <span class="text-emerald-400 font-black text-sm">57.53% (+50.6% Surge)</span>
            </div>
            <div class="w-full bg-slate-800 h-9 rounded-xl overflow-hidden flex items-center p-1 border border-emerald-500/40">
              <div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-lg shadow-lg shadow-emerald-500/30" style="width: 57.53%;"></div>
            </div>
          </div>

          <!-- Capital Split Donut Graphic Representation -->
          <div class="grid grid-cols-2 gap-4 pt-3 border-t border-slate-800">
            <div class="bg-slate-950 p-4 rounded-xl text-center">
              <div class="text-[10px] text-slate-400 uppercase font-semibold">Demat Delivery Capital</div>
              <div class="text-2xl font-black text-emerald-400 mono mt-0.5">₹2,660.4 Cr</div>
              <div class="text-[10px] text-emerald-500/80 font-mono mt-0.5">57.5% of Volume</div>
            </div>

            <div class="bg-slate-950 p-4 rounded-xl text-center">
              <div class="text-[10px] text-slate-400 uppercase font-semibold">Intraday Speculation</div>
              <div class="text-2xl font-black text-slate-400 mono mt-0.5">₹1,964.8 Cr</div>
              <div class="text-[10px] text-slate-500 font-mono mt-0.5">Squared off by 3:30 PM</div>
            </div>
          </div>
        </div>

        <div class="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 text-xs text-slate-300 leading-relaxed">
          💡 <strong class="text-emerald-400">Institutional Rule:</strong> Intraday churning causes noise. Only capital that leaves the exchange clearinghouse and enters demat accounts represents smart-money sponsorship.
        </div>
      </div>
    `;
  } else if (slideNum === 4) {
    // ==========================================
    // SLIDE 4: CONNECTED 3-STEP ROADMAP
    // ==========================================
    content = `
      <div class="flex-grow flex flex-col justify-between py-2">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            EXECUTION PLAYBOOK
          </div>
          <h2 class="text-3xl font-extrabold text-white">How Pro Desks Trade Absorption</h2>
          <p class="text-slate-300 text-xs mt-1">Never blindly catch a falling knife. Wait for auction market structure confirmation.</p>
        </div>

        <!-- CONNECTED STEP-BY-STEP ROADMAP -->
        <div class="space-y-4 my-2">
          
          <!-- Node 1 -->
          <div class="flex items-start gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative">
            <div class="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black flex items-center justify-center flex-shrink-0 mono text-base">
              01
            </div>
            <div>
              <div class="text-white font-bold text-sm">Value Area Acceptance</div>
              <div class="text-slate-400 text-xs mt-1 leading-relaxed">
                Do not enter during the red candle. Wait for a subsequent daily session close above the Point of Control (POC) at ₹822.
              </div>
            </div>
          </div>

          <!-- Node 2 -->
          <div class="flex items-start gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative">
            <div class="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-400 font-black flex items-center justify-center flex-shrink-0 mono text-base">
              02
            </div>
            <div>
              <div class="text-white font-bold text-sm">Volume Profile Support Retest</div>
              <div class="text-slate-400 text-xs mt-1 leading-relaxed">
                Ensure low volume nodes (LVN) created during the sell-off act as price rejection floors rather than resistance.
              </div>
            </div>
          </div>

          <!-- Node 3 -->
          <div class="flex items-start gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative">
            <div class="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 font-black flex items-center justify-center flex-shrink-0 mono text-base">
              03
            </div>
            <div>
              <div class="text-white font-bold text-sm">Mathematical Invalidation Guardrail</div>
              <div class="text-slate-400 text-xs mt-1 leading-relaxed">
                Trade thesis is invalidated if price breaks below the absorption low of ₹810 on expanding sell-side volume.
              </div>
            </div>
          </div>

        </div>

        <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-400 font-mono text-center">
          Risk:Reward Ratio on Confirmed Absorption Setups: 1 : 3.4
        </div>
      </div>
    `;
  } else if (slideNum === 5) {
    // ==========================================
    // SLIDE 5: EXECUTIVE DESK CARD & CTA
    // ==========================================
    content = `
      <div class="flex-grow flex flex-col justify-between py-2 text-center">
        <!-- Logo & Title -->
        <div class="space-y-3">
          ${logoBase64 ? `<img src="${logoBase64}" class="w-20 h-20 rounded-2xl mx-auto border-2 border-emerald-500/40 shadow-xl shadow-emerald-500/20">` : ''}
          <div class="text-xs font-bold text-emerald-400 uppercase tracking-widest">TrustPoint Finance Research Desk</div>
          <h2 class="text-3xl font-black text-white leading-tight">Trade with Institutional Market Intelligence</h2>
          <p class="text-slate-300 text-xs max-w-md mx-auto leading-relaxed">
            Stop relying on noisy retail tips. Upgrade your trading with real-time order flow, Bhavcopy delivery models, and auction market structure.
          </p>
        </div>

        <!-- 2 Visual Action Cards -->
        <div class="space-y-3 max-w-md mx-auto my-3 text-left w-full">
          <div class="bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/40 p-4 rounded-2xl flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl flex-shrink-0">
              📩
            </div>
            <div>
              <div class="text-sm font-bold text-emerald-400">Comment "FLOW" Below</div>
              <div class="text-xs text-slate-300">We will DM you our complete Auction Market Theory Checklist PDF.</div>
            </div>
          </div>

          <div class="bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/40 p-4 rounded-2xl flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl flex-shrink-0">
              🔗
            </div>
            <div>
              <div class="text-sm font-bold text-blue-400">Link in Bio</div>
              <div class="text-xs text-slate-300">Connect directly with our research desk & open an institutional Demat account.</div>
            </div>
          </div>
        </div>

        <!-- Compliance & Regulatory Footer -->
        <div class="pt-2 text-[10px] text-slate-500 leading-relaxed max-w-md mx-auto border-t border-slate-800/80">
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
      background: radial-gradient(circle at 80% 20%, #0d1e3a 0%, #080f1d 45%, #04070e 100%);
      color: #f8fafc;
      width: 1080px;
      height: 1350px;
      overflow: hidden;
      box-sizing: border-box;
      position: relative;
    }
    .mono { font-family: 'JetBrains Mono', monospace; }
    .glow-emerald { text-shadow: 0 0 35px rgba(16, 185, 129, 0.45); }
    .grid-overlay {
      background-image: linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
      background-size: 40px 40px;
    }
  </style>
</head>
<body class="p-12 flex flex-col justify-between grid-overlay">

  <!-- Ambient Glow Effects -->
  <div class="absolute -top-32 -right-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>
  <div class="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none"></div>

  <!-- Header with Real Logo -->
  <header class="flex items-center justify-between z-10 border-b border-slate-800/80 pb-4">
    <div class="flex items-center gap-3">
      ${logoBase64 ? `<img src="${logoBase64}" class="w-10 h-10 rounded-xl border border-emerald-500/30">` : ''}
      <div>
        <div class="text-sm font-extrabold tracking-wider text-white">
          TRUSTPOINT<span class="text-emerald-400">FIN</span>
        </div>
        <div class="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
          QUANTITATIVE RESEARCH DESK
        </div>
      </div>
    </div>
    
    <div class="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-mono text-xs font-bold">
      Slide 0${slideNum} / 05
    </div>
  </header>

  <!-- Main Infographic Content -->
  <main class="flex-grow flex flex-col justify-center z-10">
    ${content}
  </main>

  <!-- Footer with Partner Seal -->
  <footer class="z-10 border-t border-slate-800/80 pt-4 flex items-center justify-between text-xs text-slate-400 font-medium">
    <div class="flex items-center gap-2">
      <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
      <span class="font-bold text-slate-300">Authorised Person • Angel One Ltd.</span>
      <span class="text-[10px] text-slate-500 font-mono">(SEBI Reg. INZ000161534)</span>
    </div>
    <div class="text-emerald-400 font-bold flex items-center gap-1.5">
      ${slideNum < 5 ? 'Swipe Next &rarr;' : 'Save Post • Share with a Trader'}
    </div>
  </footer>

</body>
</html>`;
}

async function renderCarouselSlides() {
  if (!fs.existsSync(SLIDES_DIR)) fs.mkdirSync(SLIDES_DIR, { recursive: true });
  if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

  console.log('[Renderer] Launching Puppeteer to render 5 premium infographic slides at 1080x1350...');
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
    await new Promise(r => setTimeout(r, 600)); // allow font and svg render

    const filename = `final_slide_${i}.jpg`;
    const outputPath = path.join(SLIDES_DIR, filename);
    const artifactPath = path.join(ARTIFACT_DIR, filename);

    await page.screenshot({
      path: outputPath,
      type: 'jpeg',
      quality: 95
    });

    fs.copyFileSync(outputPath, artifactPath);

    console.log(`[Renderer] ✅ Rendered Infographic: ${filename} (1080x1350)`);
    generatedFiles.push({ filename, path: outputPath, artifactPath });
  }

  await browser.close();
  console.log(`[Renderer] 🎉 Successfully rendered all 5 premium infographic JPEG slides!`);
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
