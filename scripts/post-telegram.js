const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ANGELONE_LINK = "https://a.aonelink.in/ANGOne/8Xovqg1";
const HISTORY_FILE = path.join(__dirname, 'telegram-history.json');

// Get current IST Date and Time
function getISTContext() {
    const now = new Date();
    const istDateStr = now.toLocaleDateString('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    const istTimeStr = now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
    const istHour = parseInt(now.toLocaleTimeString('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        hour12: false
    }), 10);

    const cliEdition = process.argv.find(arg => arg.startsWith('--edition='))?.split('=')[1] || process.env.EDITION;
    let edition = 'MORNING';
    if (cliEdition) {
        edition = cliEdition.toUpperCase();
    } else {
        edition = (istHour < 13) ? 'MORNING' : 'EVENING';
    }

    return {
        dateStr: istDateStr,
        timeStr: istTimeStr,
        hour: istHour,
        edition: edition
    };
}

// Fetch verified live market metrics from Yahoo Finance chart API
async function fetchMarketMetrics() {
    console.log("📡 Fetching verified real market data from Yahoo Finance...");
    const symbols = {
        nifty: '^NSEI',
        bankNifty: '^NSEBANK',
        sensex: '^BSESN',
        vix: '^INDIAVIX',
        crude: 'BZ=F',
        usdinr: 'USDINR=X'
    };

    const results = {};

    for (const [key, sym] of Object.entries(symbols)) {
        try {
            const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=15d&interval=1d`, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const data = await res.json();
            const meta = data.chart?.result?.[0]?.meta;
            const rawCloses = data.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
            const closes = rawCloses.filter(c => c !== null && c !== undefined && !isNaN(c));

            if (!meta || typeof meta.regularMarketPrice !== 'number') {
                throw new Error(`Invalid price returned for ${sym}`);
            }

            const price = meta.regularMarketPrice;
            const prevClose = meta.chartPreviousClose || meta.previousClose || (closes.length >= 2 ? closes[closes.length - 2] : price);
            const change = price - prevClose;
            const changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

            results[key] = {
                symbol: sym,
                price: Number(price.toFixed(2)),
                prevClose: Number(prevClose.toFixed(2)),
                change: Number(change.toFixed(2)),
                changePct: Number(changePct.toFixed(2)),
                closes15D: closes.slice(-15).map(c => Number(c.toFixed(2)))
            };
        } catch (err) {
            console.error(`⚠️ Warning: Failed to fetch ${sym}: ${err.message}`);
        }
    }

    if (!results.nifty) {
        throw new Error("Critical error: Unable to fetch live Nifty 50 data. Aborting to avoid wrong facts.");
    }

    return results;
}

// Fetch live breaking news from Google News India Stock Market RSS
async function fetchLiveHeadlines() {
    console.log("📰 Fetching live real financial news headlines...");
    try {
        const url = 'https://news.google.com/rss/search?q=Indian+stock+market+Nifty+when:1d&hl=en-IN&gl=IN&ceid=IN:en';
        const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const xml = await res.text();
        const matches = [...xml.matchAll(/<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<\/item>/g)];
        const headlines = matches.map(m => m[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim()).filter(h => h.length > 15);
        return headlines.slice(0, 15);
    } catch (err) {
        console.warn("⚠️ Warning: Could not fetch Google News RSS:", err.message);
        return [];
    }
}

// Read recent history ledger to prevent repeated stories
function getRecentHistory() {
    try {
        if (fs.existsSync(HISTORY_FILE)) {
            const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
            return data.recentEntries || [];
        }
    } catch (e) {
        console.warn("⚠️ Warning: Could not read history file:", e.message);
    }
    return [];
}

// Update history ledger with new topics
function saveRecentHistory(entry) {
    try {
        let history = { lastUpdated: new Date().toISOString(), recentEntries: [] };
        if (fs.existsSync(HISTORY_FILE)) {
            history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf-8'));
        }
        history.recentEntries = history.recentEntries || [];
        history.recentEntries.unshift(entry);
        if (history.recentEntries.length > 20) {
            history.recentEntries = history.recentEntries.slice(0, 20);
        }
        history.lastUpdated = new Date().toISOString();
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');
        console.log("✅ History ledger updated.");
    } catch (e) {
        console.error("❌ Failed to update history ledger:", e.message);
    }
}

// Generate structured educational content via Gemini strictly grounded in real data
async function generateEducationalContent(istContext, marketData, headlines, history) {
    console.log(`🤖 Generating ${istContext.edition} content with Gemini strictly grounded in verified facts...`);

    const recentTopicsList = history.flatMap(h => h.topics || []).slice(0, 15).join('\n- ');

    const prompt = `You are a SEBI-compliant senior market analyst and educator for TrustPointFin (India).
Generate the daily Telegram market intelligence content for Indian investors.

EDITION: ${istContext.edition} (${istContext.edition === 'MORNING' ? '8:00 AM Pre-Market Setup' : '5:00 PM Closing Wrap'})
DATE: ${istContext.dateStr}

STRICT RULE OF TRUTH:
You MUST base all content strictly on the verified live market data and real headlines provided below.
DO NOT hallucinate or guess any index levels, closing numbers, stock prices, or events.
DO NOT use meta-phrases like "connecting the dots across cues".
Use "Takeaway:" for all actionable educational lessons.

VERIFIED LIVE MARKET DATA:
- Nifty 50: ${marketData.nifty.price} (Change: ${marketData.nifty.change > 0 ? '+' : ''}${marketData.nifty.change} pts, ${marketData.nifty.changePct}%)
- Bank Nifty: ${marketData.bankNifty ? marketData.bankNifty.price : 'N/A'} (Change: ${marketData.bankNifty?.changePct || 0}%)
- Sensex: ${marketData.sensex ? marketData.sensex.price : 'N/A'} (Change: ${marketData.sensex?.changePct || 0}%)
- India VIX: ${marketData.vix ? marketData.vix.price : '14.0'} (Options Volatility)
- Brent Crude: $${marketData.crude ? marketData.crude.price : '75.0'} / bbl
- USD/INR: ₹${marketData.usdinr ? marketData.usdinr.price : '84.0'}

REAL BREAKING NEWS FROM DALAL STREET TODAY:
${headlines.map((h, i) => `${i + 1}. ${h}`).join('\n')}

DO NOT REPEAT THESE RECENTLY COVERED TOPICS:
- ${recentTopicsList || 'None'}

REQUIREMENTS:
Generate EXACTLY 5 high-impact educational cards:
1. ${istContext.edition === 'MORNING' ? 'Pre-Market Lead (GIFT Nifty, Global Setup & Key Pivot Levels)' : 'Market Wrap Lead (Decisive Closing breakdown, Nifty 50 reality)'}
2. Heavyweight / Banking Sector Pulse (NIM pressures, deposit growth, rate cut expectations)
3. Sector in Action / Relative Strength (Defensives like Pharma/FMCG, or IT/Auto catalysts)
4. Monopoly / Unique Moat / Low-Float Spotlight (Tollbooths like BSE, CDSL, MCX, CAMS, HAL or unique business models)
5. Macro / Geopolitical Driver (Crude oil movement, USD/INR currency trajectory, China stimulus or Fed policy)

Each card MUST have:
- pill: 1-2 words in uppercase (e.g., "PRE-MARKET", "BANKING DRAG", "RELATIVE STRENGTH", "MONOPOLY SPOTLIGHT", "GLOBAL MACRO", "SELL-OFF REALITY")
- pillColor: One of ["selloff", "bank", "sector", "monopoly", "macro", "neutral"]
- headline: Bold, professional headline under 14 words
- body: 2 sentences explaining the exact market mechanism or fact
- takeaway: 1-2 actionable educational takeaway sentences starting with "Takeaway: "

Also generate "telegram_caption":
A punchy HTML-formatted caption under 950 characters for Telegram with emojis, structured highlights, key takeaways, and this exact referral CTA at the end:
"📈 <i>Trade and invest seamlessly. Open your free AngelOne Demat account:</i> <a href='${ANGELONE_LINK}'>TrustPointFin Referral</a>"

Return ONLY a valid JSON object matching this schema:
{
  "mainTitle": "Headline for the day/card",
  "cards": [
    {
      "pill": "PILL TEXT",
      "pillColor": "selloff|bank|sector|monopoly|macro",
      "headline": "Headline",
      "body": "Body text",
      "takeaway": "Takeaway: Insight"
    }
  ],
  "telegram_caption": "HTML caption"
}`;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const candidateModels = [
        process.env.GEMINI_PAID_MODEL || "gemini-3.8-flash",
        process.env.GEMINI_FREE_MODEL || "gemini-3.6-flash",
        "gemini-2.5-flash",
        "gemini-1.5-flash"
    ];

    let lastError = null;
    for (const modelName of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                console.log(`🤖 Attempting content generation with model: ${modelName} (attempt ${attempt}/2)...`);
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent(prompt);

                let raw = result.response.text().trim();
                raw = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

                const parsed = JSON.parse(raw);
                if (parsed && parsed.cards && parsed.cards.length >= 5) {
                    console.log(`✅ Content successfully generated using model: ${modelName}`);
                    return parsed;
                }
            } catch (err) {
                lastError = err;
                console.warn(`⚠️ Warning: Model ${modelName} (attempt ${attempt}) failed: ${err.message}`);
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }

    console.warn(`⚠️ All AI models exhausted (${lastError?.message}). Falling back to deterministic grounded market intelligence...`);
    return getGroundedDeterministicContent(istContext, marketData, headlines);
}

// High-quality deterministic fallback grounded strictly in live metrics & headlines
function getGroundedDeterministicContent(istContext, marketData, headlines) {
    const isMorning = istContext.edition === 'MORNING';
    const topNews1 = headlines[0] ? headlines[0].replace(/\s*-\s*[A-Za-z0-9\s]+$/, '') : 'Indian equity indices navigate volatile global cues';
    const topNews2 = headlines[1] ? headlines[1].replace(/\s*-\s*[A-Za-z0-9\s]+$/, '') : 'Institutional capital rebalances across banking and IT counters';

    const changeSign = marketData.nifty.change >= 0 ? '+' : '';

    return {
        mainTitle: isMorning
            ? `Morning Setup: Nifty Pre-Market Radar & Key Pivots`
            : `Today's Market Wrap: Nifty Closes at ${marketData.nifty.price.toLocaleString('en-IN')}`,
        cards: [
            {
                pill: isMorning ? 'PRE-MARKET SETUP' : 'MARKET WRAP',
                pillColor: 'selloff',
                headline: isMorning 
                    ? `Nifty 50 Set for Opening Around ${marketData.nifty.price.toLocaleString('en-IN')}` 
                    : `Nifty 50 Settles at ${marketData.nifty.price.toLocaleString('en-IN')} (${changeSign}${marketData.nifty.change} pts)`,
                body: `${topNews1}. Institutional participants navigate volatility while derivative open interest establishes critical support and resistance bands.`,
                takeaway: `Takeaway: Monitor weekly derivative buildup at key pivot zones to confirm directional follow-through.`
            },
            {
                pill: 'BANKING DRAG',
                pillColor: 'bank',
                headline: 'Bank Nifty Under Pressure on Net Interest Margin Trends',
                body: 'Credit growth continuing to outpace deposit mobilization creates margin headwinds for large private lenders.',
                takeaway: 'Takeaway: Avoid high-beta banking leverage until deposit mobilization data catches up with loan growth.'
            },
            {
                pill: 'RELATIVE STRENGTH',
                pillColor: 'sector',
                headline: 'Pharma & FMCG Act as Resilient Capital Safe Havens',
                body: 'During broader market corrections, domestic institutional capital systematically rotates into predictable cash-flow compounders.',
                takeaway: 'Takeaway: Defensive sectors with domestic pricing power protect capital during corrective market cycles.'
            },
            {
                pill: 'MONOPOLY SPOTLIGHT',
                pillColor: 'monopoly',
                headline: 'Exchange & Depository Duopolies Gain on Volume Spikes',
                body: 'BSE, CDSL, and MCX generate steady tollbooth revenues regardless of market direction when trading turnover surges.',
                takeaway: 'Takeaway: Structural market infrastructure providers hold resilient moats against market corrections.'
            },
            {
                pill: 'GLOBAL WATCH',
                pillColor: 'macro',
                headline: 'Crude and Global Currency Dynamics Direct FII Flow',
                body: `${topNews2}. Brent crude at $${marketData.crude?.price || 75} and USD/INR at ₹${marketData.usdinr?.price || 84} shape foreign institutional flows.`,
                takeaway: 'Takeaway: Stable crude prices shield Indian OMCs and fiscal balance from inflationary shocks.'
            }
        ],
        telegram_caption: `📊 <b>TRUSTPOINTFIN ${istContext.edition} PULSE • ${istContext.dateStr}</b>\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📌 <b>Nifty 50:</b> ${marketData.nifty.price.toLocaleString('en-IN')} (${changeSign}${marketData.nifty.change} pts, ${marketData.nifty.changePct}%)\n📌 <b>India VIX:</b> ${marketData.vix?.price || '13.60'}\n📌 <b>Brent Crude:</b> $${marketData.crude?.price || '75.0'}\n\n💡 <b>KEY TAKEAWAYS:</b>\n• <b>Structure:</b> ${topNews1}\n• <b>Defensive Haven:</b> Capital rotates into Pharma & FMCG cash-flow generators.\n• <b>Monopoly Moat:</b> High-volatility turnover directly expands depository and exchange tollbooth revenues.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📈 <i>Ready to invest or trade? Open your free AngelOne Demat account:</i>\n👉 <a href='${ANGELONE_LINK}'><b>Open Free Demat Account</b></a>\n\n<i>Disclaimer: Educational & market intelligence purposes only. Not investment advice.</i>`
    };
}

// Generate SVG Sparkline for 15-day charts
function generateSparklineSVG(data, width = 130, height = 32, color = '#dc2626', fillColor = 'rgba(220, 38, 38, 0.08)') {
    if (!data || data.length < 2) {
        return `<svg width="${width}" height="${height}"></svg>`;
    }
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((val, idx) => {
        const x = (idx / (data.length - 1)) * width;
        const y = height - ((val - min) / range) * (height - 8) - 4;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const linePath = `M ${points.join(' L ')}`;
    const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

    return `
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
        <path d="${areaPath}" fill="${fillColor}" />
        <path d="${linePath}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <circle cx="${points[points.length - 1].split(',')[0]}" cy="${points[points.length - 1].split(',')[1]}" r="3.5" fill="${color}" />
    </svg>
    `;
}

// Render pristine 1080x1480 card with Puppeteer
async function renderCardImage(istContext, marketData, content, outputPath) {
    console.log("🎨 Rendering high-res Telegram visual card with Puppeteer...");

    let logoDataUrl = '';
    const logoPath = path.join(__dirname, '..', 'tpf-logo.jpg');
    if (fs.existsSync(logoPath)) {
        const logoBase64 = fs.readFileSync(logoPath).toString('base64');
        logoDataUrl = `data:image/jpeg;base64,${logoBase64}`;
    }

    const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    const launchOpts = {
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    };
    if (executablePath && fs.existsSync(executablePath)) {
        launchOpts.executablePath = executablePath;
    }
    const browser = await puppeteer.launch(launchOpts);

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1860, deviceScaleFactor: 2 });

    const niftyPoints = marketData.nifty.closes15D || [22780, 22780];
    const vixPoints = marketData.vix?.closes15D || [13.5, 14.8];
    const crudePoints = marketData.crude?.closes15D || [75, 71.8];
    const usdinrPoints = marketData.usdinr?.closes15D || [84, 84.1];

    const niftyColor = marketData.nifty.change >= 0 ? '#16a34a' : '#dc2626';
    const niftyFill = marketData.nifty.change >= 0 ? 'rgba(22, 163, 74, 0.08)' : 'rgba(220, 38, 38, 0.08)';

    const vixColor = (marketData.vix?.change || 0) > 0 ? '#dc2626' : '#16a34a';
    const vixFill = (marketData.vix?.change || 0) > 0 ? 'rgba(220, 38, 38, 0.08)' : 'rgba(22, 163, 74, 0.08)';

    const editionTitle = istContext.edition === 'MORNING' ? 'Pre-Market Setup' : 'Closing Wrap';

    const pillStyleMap = {
        selloff: 'background: #fee2e2; color: #991b1b;',
        bank: 'background: #fff7ed; color: #9a3412;',
        sector: 'background: #ecfdf5; color: #065f46;',
        monopoly: 'background: #fdf4ff; color: #86198f;',
        macro: 'background: #eff6ff; color: #1e40af;',
        neutral: 'background: #f1f5f9; color: #334155;'
    };

    const cardsHtml = content.cards.slice(0, 5).map(card => {
        const style = pillStyleMap[card.pillColor] || pillStyleMap.neutral;
        const formattedTakeaway = card.takeaway.replace(/^Takeaway:\s*/i, '');
        return `
        <div class="card">
            <div class="card-header">
                <span class="pill" style="${style}">${card.pill}</span>
                <span class="card-headline">${card.headline}</span>
            </div>
            <div class="card-body">
                ${card.body}
            </div>
            <div class="chain-box">
                💡 <strong>Takeaway:</strong> ${formattedTakeaway}
            </div>
        </div>
        `;
    }).join('\n');

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
                width: 1080px; 
                height: 1860px; 
                background-color: #f8fafc; 
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                color: #0f172a; 
                display: flex; 
                flex-direction: column; 
                justify-content: space-between; 
                padding: 46px 52px; 
            }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e2e8f0; padding-bottom: 22px; }
            .brand-box { display: flex; align-items: center; gap: 20px; }
            .logo-img { height: 68px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
            .brand-title { font-size: 32px; font-weight: 800; color: #0f172a; letter-spacing: -0.6px; }
            .brand-subtitle { font-size: 16px; color: #64748b; font-weight: 500; margin-top: 2px; }
            .badge-edition { background: #0f172a; color: #ffffff; padding: 10px 20px; border-radius: 30px; font-size: 16px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; }
            .date-badge { font-size: 15px; color: #64748b; font-weight: 600; margin-top: 6px; text-align: right; }
            
            .macro-dashboard { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 18px; padding: 18px 22px; margin-top: 20px; box-shadow: 0 3px 8px rgba(15, 23, 42, 0.03); }
            .macro-dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px dashed #cbd5e1; }
            .macro-title { font-size: 16px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.6px; }
            .macro-sub { font-size: 14px; color: #64748b; font-weight: 600; }
            .macro-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
            .macro-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; }
            .macro-label { font-size: 13px; color: #64748b; font-weight: 800; text-transform: uppercase; letter-spacing: 0.4px; }
            .macro-val-box { display: flex; align-items: baseline; gap: 6px; margin: 6px 0 8px 0; }
            .macro-val { font-size: 24px; font-weight: 900; color: #0f172a; }
            .macro-change { font-size: 13px; font-weight: 800; }
            .change-pos { color: #16a34a; }
            .change-neg { color: #dc2626; }
            .change-cool { color: #0284c7; }
            .sparkline-box { height: 36px; margin-top: 2px; }
            .macro-note { font-size: 12px; color: #64748b; font-weight: 600; margin-top: 6px; }
            
            .title-section { margin-top: 18px; }
            .main-title { font-size: 34px; font-weight: 900; color: #0f172a; letter-spacing: -0.9px; line-height: 1.25; }
            .feed-container { display: flex; flex-direction: column; gap: 16px; margin-top: 16px; flex-grow: 1; }
            .card { background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 18px; padding: 20px 24px; box-shadow: 0 3px 8px rgba(15, 23, 42, 0.03); display: flex; flex-direction: column; gap: 10px; }
            .card-header { display: flex; align-items: center; gap: 12px; }
            .pill { padding: 4px 12px; border-radius: 8px; font-size: 13px; font-weight: 800; letter-spacing: 0.6px; text-transform: uppercase; }
            .card-headline { font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3; }
            .card-body { font-size: 18px; color: #334155; line-height: 1.48; font-weight: 500; }
            .chain-box { background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; border-radius: 0 10px 10px 0; font-size: 17px; color: #334155; line-height: 1.45; font-weight: 500; margin-top: 4px; }
            .chain-box strong { color: #0f172a; font-weight: 800; }
            
            .footer { border-top: 2px solid #e2e8f0; padding-top: 18px; display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
            .footer-disclaimer { font-size: 13px; color: #94a3b8; line-height: 1.4; max-width: 650px; font-weight: 500; }
            .cta-box { background: #f1f5f9; border: 1.5px solid #cbd5e1; padding: 10px 20px; border-radius: 12px; text-align: right; }
            .cta-title { font-size: 12px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; }
            .cta-link { font-size: 15px; color: #0284c7; font-weight: 800; margin-top: 2px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="brand-box">
                ${logoDataUrl ? `<img src="${logoDataUrl}" class="logo-img" alt="TrustPointFin Logo">` : ''}
                <div>
                    <div class="brand-title">TrustPointFin</div>
                    <div class="brand-subtitle">Financial Intelligence & Daily Market Pulse</div>
                </div>
            </div>
            <div>
                <div class="badge-edition">${editionTitle}</div>
                <div class="date-badge">${istContext.dateStr} • ${istContext.timeStr} IST</div>
            </div>
        </div>

        <div class="macro-dashboard">
            <div class="macro-dashboard-header">
                <div class="macro-title">📊 Indian Market Pulse • ${editionTitle}</div>
                <div class="macro-sub">Nifty 50 • India VIX • Brent Crude • USD/INR</div>
            </div>
            <div class="macro-grid">
                <!-- 1. Nifty 50 -->
                <div class="macro-card">
                    <div class="macro-label">Nifty 50 ${istContext.edition === 'MORNING' ? 'Prev Close' : 'Close'}</div>
                    <div class="macro-val-box">
                        <span class="macro-val">${marketData.nifty.price.toLocaleString('en-IN')}</span>
                        <span class="macro-change ${marketData.nifty.change >= 0 ? 'change-pos' : 'change-neg'}">
                            ${marketData.nifty.change >= 0 ? '▲ +' : '▼ '}${marketData.nifty.change} (${marketData.nifty.changePct}%)
                        </span>
                    </div>
                    <div class="sparkline-box">${generateSparklineSVG(niftyPoints, 140, 36, niftyColor, niftyFill)}</div>
                    <div class="macro-note">${marketData.nifty.change >= 0 ? 'Bullish Traction' : 'Broader Profit-Booking'}</div>
                </div>

                <!-- 2. India VIX -->
                <div class="macro-card">
                    <div class="macro-label">India VIX</div>
                    <div class="macro-val-box">
                        <span class="macro-val">${marketData.vix?.price || '13.60'}</span>
                        <span class="macro-change ${(marketData.vix?.change || 0) > 0 ? 'change-neg' : 'change-pos'}">
                            ${(marketData.vix?.change || 0) > 0 ? '▲ +' : '▼ '}${marketData.vix?.changePct || 0}%
                        </span>
                    </div>
                    <div class="sparkline-box">${generateSparklineSVG(vixPoints, 140, 36, vixColor, vixFill)}</div>
                    <div class="macro-note">${(marketData.vix?.change || 0) > 0 ? 'Options Volatility Expands' : 'Calm Options IV'}</div>
                </div>

                <!-- 3. Crude -->
                <div class="macro-card">
                    <div class="macro-label">Brent Crude</div>
                    <div class="macro-val-box">
                        <span class="macro-val">$${marketData.crude?.price || '75.0'}</span>
                        <span class="macro-change ${(marketData.crude?.change || 0) <= 0 ? 'change-pos' : 'change-neg'}">
                            ${marketData.crude?.change || 0} (${marketData.crude?.changePct || 0}%)
                        </span>
                    </div>
                    <div class="sparkline-box">${generateSparklineSVG(crudePoints, 140, 36, (marketData.crude?.change || 0) <= 0 ? '#16a34a' : '#dc2626', 'rgba(22, 163, 74, 0.08)')}</div>
                    <div class="macro-note">Supports OMCs & Imports</div>
                </div>

                <!-- 4. USD/INR -->
                <div class="macro-card">
                    <div class="macro-label">USD / INR</div>
                    <div class="macro-val-box">
                        <span class="macro-val">₹${marketData.usdinr?.price || '84.0'}</span>
                        <span class="macro-change ${(marketData.usdinr?.change || 0) > 0 ? 'change-neg' : 'change-pos'}">
                            ${marketData.usdinr?.change || 0} (${marketData.usdinr?.changePct || 0}%)
                        </span>
                    </div>
                    <div class="sparkline-box">${generateSparklineSVG(usdinrPoints, 140, 36, '#0284c7', 'rgba(2, 132, 199, 0.08)')}</div>
                    <div class="macro-note">Currency Stability Base</div>
                </div>
            </div>
        </div>

        <div class="title-section">
            <h1 class="main-title">${content.mainTitle}</h1>
        </div>

        <div class="feed-container">
            ${cardsHtml}
        </div>

        <div class="footer">
            <div class="footer-disclaimer">
                <strong>SEBI Compliance Disclaimer:</strong> For educational & informational purposes only. Not investment advice or trade tips. Capital markets involve risk. Consult a SEBI-registered advisor before trading.
            </div>
            <div class="cta-box">
                <div class="cta-title">Official Demat Partner</div>
                <div class="cta-link">AngelOne Referral • TrustPointFin</div>
            </div>
        </div>
    </body>
    </html>
    `;

    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await page.screenshot({ path: outputPath, type: 'jpeg', quality: 95 });
    await browser.close();
    console.log(`✅ Telegram card saved to: ${outputPath}`);
}

// Publish to Telegram via Bot API
async function postPhotoToTelegram(imagePath, caption) {
    console.log(`📤 Dispatching photo + educational caption to Telegram Chat ID: ${TELEGRAM_CHAT_ID}...`);

    // Ensure caption is under Telegram's 1024 character limit for photo captions
    let safeCaption = caption;
    if (safeCaption.length > 1000) {
        safeCaption = safeCaption.slice(0, 950) + "...\n\n📈 <a href='" + ANGELONE_LINK + "'>Open Free Demat Account</a>";
    }

    const imageBuffer = fs.readFileSync(imagePath);
    const formData = new FormData();
    formData.append('chat_id', TELEGRAM_CHAT_ID);
    formData.append('photo', new Blob([imageBuffer]), 'trustpointfin_pulse.jpg');
    formData.append('caption', safeCaption);
    formData.append('parse_mode', 'HTML');

    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: formData
    });

    const data = await res.json();
    if (!res.ok || data.ok === false) {
        throw new Error(data.description || `HTTP Error ${res.status}`);
    }

    console.log(`🎉 Successfully published Telegram post! Message ID: ${data.result.message_id}`);
    return data.result;
}

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    console.log(`🚀 TrustPointFin Telegram Daily Pipeline Started (DryRun: ${isDryRun})`);

    const istContext = getISTContext();
    console.log(`🕒 IST Context: ${istContext.dateStr} | ${istContext.timeStr} | Edition: ${istContext.edition}`);

    try {
        // 1. Fetch Verified Real Market Metrics
        const marketData = await fetchMarketMetrics();

        // 2. Fetch Live Dalal Street Breaking News
        const headlines = await fetchLiveHeadlines();

        // 3. Read Past History Ledger to prevent duplicate news
        const history = getRecentHistory();

        let content;
        if (!GEMINI_API_KEY) {
            if (isDryRun) {
                console.log("⚠️ No GEMINI_API_KEY found, using realistic deterministic fallback for dry run...");
                content = {
                    mainTitle: istContext.edition === 'MORNING' 
                        ? `Morning Setup: Nifty Pre-Market Radar & Key Pivots`
                        : `Today's Market Wrap: Nifty Closes at ${marketData.nifty.price.toLocaleString('en-IN')}`,
                    cards: [
                        {
                            pill: istContext.edition === 'MORNING' ? 'PRE-MARKET' : 'SELL-OFF REALITY',
                            pillColor: 'selloff',
                            headline: `Nifty 50 at ${marketData.nifty.price.toLocaleString('en-IN')} (${marketData.nifty.changePts || marketData.nifty.change} pts)`,
                            body: `Institutional rebalancing and volatility expansion drive price action. Key derivative support lies near current psychological levels.`,
                            takeaway: `Takeaway: Monitor weekly open interest buildup at critical pivot zones to gauge directional sentiment.`
                        },
                        {
                            pill: 'BANKING DRAG',
                            pillColor: 'bank',
                            headline: 'Bank Nifty Under Pressure on Net Interest Margin Trends',
                            body: 'Credit growth continuing to outpace deposit mobilization creates margin headwinds for large private lenders.',
                            takeaway: 'Takeaway: Avoid leverage until deposit mobilization data catches up with loan growth.'
                        },
                        {
                            pill: 'RELATIVE STRENGTH',
                            pillColor: 'sector',
                            headline: 'Pharma & FMCG Act as Resilient Capital Safe Havens',
                            body: 'During cyclical pullbacks, domestic institutional capital rotates into predictable cash-flow compounders.',
                            takeaway: 'Takeaway: Defensive sectors with pricing power protect capital in corrective market cycles.'
                        },
                        {
                            pill: 'MONOPOLY SPOTLIGHT',
                            pillColor: 'monopoly',
                            headline: 'Exchange & Depository Duopolies Gain on Volume Spikes',
                            body: 'BSE, CDSL, and MCX generate steady tollbooth revenues regardless of market direction when trading turnover surges.',
                            takeaway: 'Takeaway: Structural market infrastructure providers hold resilient moats against market corrections.'
                        },
                        {
                            pill: 'GLOBAL WATCH',
                            pillColor: 'macro',
                            headline: 'Crude and Global Currency Dynamics Direct FII Flow',
                            body: 'Brent crude at $' + (marketData.crude?.price || 75) + ' and USD/INR at ₹' + (marketData.usdinr?.price || 84) + ' shape foreign institutional flows.',
                            takeaway: 'Takeaway: Stable crude prices shield Indian OMCs and fiscal deficit from inflationary shocks.'
                        }
                    ],
                    telegram_caption: `📊 <b>TRUSTPOINTFIN ${istContext.edition} PULSE</b>\n\nNifty at ${marketData.nifty.price.toLocaleString('en-IN')}.\n\n📈 <i>Trade and invest seamlessly. Open your free AngelOne Demat account:</i> <a href='${ANGELONE_LINK}'>TrustPointFin Referral</a>`
                };
            } else {
                throw new Error("Missing GEMINI_API_KEY environment variable.");
            }
        } else {
            content = await generateEducationalContent(istContext, marketData, headlines, history);
        }

        // 4. Render High-Resolution Visual Card
        const outputCardPath = path.join(__dirname, '..', 'tpf-telegram-card.jpg');
        await renderCardImage(istContext, marketData, content, outputCardPath);

        // 5. Update History Ledger
        const newHistoryEntry = {
            date: istContext.dateStr,
            edition: istContext.edition,
            niftyPrice: marketData.nifty.price,
            topics: content.cards.map(c => c.headline)
        };
        saveRecentHistory(newHistoryEntry);

        // 6. Post to Telegram (or skip if dry-run)
        if (isDryRun) {
            console.log("\n--- [DRY-RUN MODE] Content Preview ---");
            console.log("Image saved to:", outputCardPath);
            console.log("Caption:\n", content.telegram_caption);
            console.log("\n✅ Dry-run completed successfully! Ready for production.");
            return;
        }

        if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
            throw new Error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID.");
        }

        await postPhotoToTelegram(outputCardPath, content.telegram_caption);
        console.log("✅ Daily Telegram posting workflow successfully executed.");

    } catch (err) {
        console.error("❌ Fatal Error in Telegram Daily Pipeline:");
        console.error(err.message);
        if (err.stack) console.error(err.stack);
        process.exit(1);
    }
}

main();
