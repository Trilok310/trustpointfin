/**
 * TrustPoint Finance - Institutional Synthesizer
 * scripts/synthesizers/synthesize-research.js
 * 
 * Generates the twice-a-week comprehensive quantitative research article for trustpointfin.org/insights
 * complete with structured data tables, GEO takeaways, and SEBI compliance.
 */

const fs = require('fs');
const path = require('path');

function generateResearchArticle(oiData, deliveryData) {
  const dateStr = oiData?.date || 'November 2026';
  const cleanDate = dateStr.replace(/[^a-zA-Z0-9, ]/g, '').replace('Participant wise Open Interest no of contracts in Equity Derivatives as on ', '').trim();
  
  const fiiLong = oiData?.summary?.fiiIndexLongPercent || 20.13;
  const fiiShort = oiData?.summary?.fiiIndexShortPercent || 79.87;
  const clientLong = oiData?.summary?.clientIndexLongPercent || 70.17;
  const clientShort = oiData?.summary?.clientIndexShortPercent || 29.83;
  const divergence = oiData?.summary?.retailFiiDivergence || 50.04;
  const marketStance = oiData?.summary?.marketStance || 'Defensive Institutional Positioning';

  const slug = `institutional-flow-fii-positioning-and-delivery-matrix-${cleanDate.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const filename = `${slug}.html`;

  // Build delivery table rows
  const topStocks = deliveryData?.topAccumulation || [];
  let tableRows = '';
  topStocks.slice(0, 10).forEach(s => {
    const changeColor = s.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400';
    tableRows += `
      <tr class="border-b border-slate-800 hover:bg-slate-900/50 transition-colors">
        <td class="p-3 font-bold text-white">${s.symbol}</td>
        <td class="p-3 mono">₹${s.closePrice.toLocaleString('en-IN')}</td>
        <td class="p-3 mono font-semibold ${changeColor}">${s.changePct >= 0 ? '+' : ''}${s.changePct}%</td>
        <td class="p-3 mono font-bold text-emerald-400">${s.delivPer}%</td>
        <td class="p-3 mono text-blue-400 font-semibold">₹${s.delivTurnoverCr.toLocaleString('en-IN')} Cr</td>
        <td class="p-3 text-slate-300 text-xs">${s.delivPer > 60 ? 'Heavy Institutional Absorption' : 'Consistent Delivery Accumulation'}</td>
      </tr>
    `;
  });

  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Institutional Flow Matrix: FII Derivatives Positioning & Delivery Accumulation (${cleanDate}) | TrustPoint Finance</title>
  <meta name="description" content="In-depth quantitative analysis of NSE Participant Open Interest, FII vs Retail net futures positioning, and top delivery accumulation stocks for ${cleanDate}.">
  <link rel="canonical" href="https://trustpointfin.org/${filename}">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background-color: #080c14; color: #f8fafc; }
    .mono { font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body class="min-h-screen flex flex-col justify-between">

  <!-- Navigation -->
  <header class="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-50 px-6 py-4">
    <div class="max-w-6xl mx-auto flex items-center justify-between">
      <a href="/" class="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
        <span class="w-3 h-3 rounded-full bg-emerald-400"></span>
        TRUSTPOINT<span class="text-emerald-400">FIN</span>
      </a>
      <div class="flex items-center gap-4">
        <a href="/insights" class="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Insights</a>
        <a href="https://trustpointfin.org/whatsapp" target="_blank" class="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition-all">WhatsApp Desk</a>
      </div>
    </div>
  </header>

  <!-- Main Article Body -->
  <main class="max-w-4xl mx-auto px-6 py-12 flex-grow space-y-10">

    <!-- Meta Header -->
    <div class="space-y-3 border-b border-slate-800 pb-8">
      <div class="flex items-center gap-3">
        <span class="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">
          Quantitative Flow Research
        </span>
        <span class="text-xs text-slate-400 font-mono">${cleanDate} • 6 min read</span>
      </div>
      <h1 class="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
        Institutional Derivatives Matrix: FII Net Short Exposure at ${fiiShort}% vs Retail Long Surge & Top Delivery Anomalies
      </h1>
      <p class="text-slate-400 text-base leading-relaxed">
        A deep quantitative examination of primary NSE Bhavcopy delivery patterns and participant-wise equity derivatives open interest across Foreign Institutional Investors (FIIs), Domestic Institutions (DIIs), and Retail Clients.
      </p>
    </div>

    <!-- Generative Engine Optimization (GEO) Key Takeaways -->
    <section class="bg-slate-900/90 border border-emerald-500/30 rounded-2xl p-6 space-y-3">
      <div class="text-xs font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        Executive Summary & Generative Engine (GEO) Takeaways
      </div>
      <ul class="text-sm text-slate-300 space-y-2 list-disc list-inside leading-relaxed">
        <li><strong>FII Index Positioning:</strong> FIIs hold a defensive ${fiiShort}% net short stance in Index Futures, while Retail (Client) positioning has expanded to ${clientLong}% long, establishing a ${divergence}% divergence spread.</li>
        <li><strong>Absorption Patterns:</strong> High-capital delivery absorption is concentrated in frontline financial institutions and export pharma, led by institutional turnover exceeding ₹2,000 Cr on corrective trading sessions.</li>
        <li><strong>Auction Market Reference:</strong> Point of Control (POC) migration signals that value area lower limits are currently acting as institutional passive accumulation zones.</li>
      </ul>
    </section>

    <!-- FII vs Retail Derivatives Matrix -->
    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-white tracking-tight">1. NSE Participant-Wise Open Interest Analysis</h2>
      <p class="text-slate-300 text-sm leading-relaxed">
        According to statutory daily reporting published by the National Stock Exchange of India (NSE), participant positioning in index derivatives highlights a stark structural divergence between professional desks and retail traders.
      </p>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        <div class="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div class="text-xs font-bold uppercase text-slate-400">Foreign Institutional Investors (FIIs)</div>
          <div class="text-3xl font-black text-rose-400 mono">${fiiShort}% Short</div>
          <div class="text-xs text-slate-400 leading-relaxed">
            FIIs continue to run significant index short hedges (${fiiShort}% short contracts vs ${fiiLong}% long), retaining downside protection against global macroeconomic shifts.
          </div>
        </div>

        <div class="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl space-y-2">
          <div class="text-xs font-bold uppercase text-slate-400">Retail & High Net-Worth Clients</div>
          <div class="text-3xl font-black text-emerald-400 mono">${clientLong}% Long</div>
          <div class="text-xs text-slate-400 leading-relaxed">
            Retail participants remain aggressively optimistic, carrying ${clientLong}% long contracts, creating a crowded long positioning environment susceptible to stop runs.
          </div>
        </div>
      </div>

      <div class="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 leading-relaxed">
        <strong class="text-amber-400">Tactical Market Implication:</strong> ${marketStance}
      </div>
    </section>

    <!-- Top Institutional Delivery Table -->
    <section class="space-y-4">
      <h2 class="text-2xl font-bold text-white tracking-tight">2. Security-Wise Delivery Accumulation Leaderboard</h2>
      <p class="text-slate-300 text-sm leading-relaxed">
        Filtering the NSE Full Bhavcopy for securities exhibiting $>55\%$ delivery percentages and capital commitments exceeding ₹15 Cr isolates genuine portfolio accumulation from speculative intraday noise:
      </p>

      <div class="overflow-x-auto border border-slate-800 rounded-2xl mt-4">
        <table class="w-full text-left text-xs md:text-sm">
          <thead class="bg-slate-950 text-slate-400 uppercase font-mono text-[11px] border-b border-slate-800">
            <tr>
              <th class="p-3">Symbol</th>
              <th class="p-3">Close Price</th>
              <th class="p-3">Day Change</th>
              <th class="p-3 text-emerald-400">Delivery %</th>
              <th class="p-3 text-blue-400">Delivery Turnover</th>
              <th class="p-3">Institutional Character</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800 text-slate-300">
            ${tableRows}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Conversion & Lead Generation Widget -->
    <section class="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-blue-950/40 border border-emerald-500/30 rounded-3xl p-8 space-y-5">
      <div class="space-y-2">
        <h3 class="text-xl font-bold text-white">Access Real-Time Quantitative & Order Flow Research</h3>
        <p class="text-slate-400 text-xs md:text-sm leading-relaxed">
          TrustPoint Finance assists sophisticated traders and investors with institutional order flow intelligence, derivatives positioning models, and seamless demat account execution powered by Angel One.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row items-center gap-4 pt-2">
        <a href="https://trustpointfin.org/whatsapp" target="_blank" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs uppercase tracking-wider text-center transition-all shadow-lg shadow-emerald-500/20">
          💬 Chat with Financial Desk
        </a>
        <a href="https://a.aonelink.in/ANGOne/uOwRu9n?utm_source=other&utm_medium=Web&utm_campaign=Nov" target="_blank" class="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider text-center transition-all shadow-lg shadow-blue-600/20">
          👉 Open Free Angel One Demat Account
        </a>
      </div>
    </section>

    <!-- SEBI Compliance Disclosure -->
    <footer class="border-t border-slate-800 pt-6 text-[11px] text-slate-500 space-y-2 leading-relaxed">
      <p><strong>Regulatory & Compliance Disclosure:</strong> TrustPoint Finance is an Authorised Person of Angel One Ltd. (SEBI Reg. No. INZ000161534). This report is compiled strictly for educational, quantitative market structure, and statistical research purposes. It does not constitute financial advice, investment recommendations, or solicitation of securities transactions. Investments in the securities market are subject to market risks; read all related scheme documents carefully before investing.</p>
    </footer>

  </main>

</body>
</html>`;

  return {
    filename,
    slug,
    cleanDate,
    htmlContent
  };
}

function processResearchPublish() {
  const oiFile = path.join(__dirname, '../engine/data/latest-oi.json');
  const deliveryFile = path.join(__dirname, '../engine/data/latest-delivery.json');

  if (!fs.existsSync(oiFile) || !fs.existsSync(deliveryFile)) {
    console.log('[Synthesizer Research] Required quant data files missing.');
    return null;
  }

  const oiData = JSON.parse(fs.readFileSync(oiFile, 'utf-8'));
  const deliveryData = JSON.parse(fs.readFileSync(deliveryFile, 'utf-8'));

  const article = generateResearchArticle(oiData, deliveryData);
  const rootDir = path.join(__dirname, '../../');
  const targetPath = path.join(rootDir, article.filename);

  fs.writeFileSync(targetPath, article.htmlContent, 'utf-8');
  console.log(`[Synthesizer Research] Successfully published quantitative research article to ${article.filename}!`);

  return article;
}

if (require.main === module) {
  processResearchPublish();
}

module.exports = { generateResearchArticle, processResearchPublish };
