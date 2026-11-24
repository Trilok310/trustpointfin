/**
 * TrustPoint Finance - Institutional Quant Engine
 * scripts/engine/fetch-exchange-filings.js
 * 
 * Fetches real-time statutory corporate announcements directly from the National Stock Exchange (NSE)
 * using headless browser automation with zero third-party paid API requirements.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const HIGH_IMPACT_KEYWORDS = [
  'order', 'contract', 'award', 'bag', 'bags',
  'acquisition', 'acquire', 'merger', 'demerger', 'amalgamation',
  'usfda', 'patent', 'approval', 'licence', 'license',
  'capex', 'commissioning', 'expansion', 'facility',
  'buyback', 'dividend', 'joint venture', 'mou'
];

async function fetchLiveExchangeFilings() {
  console.log('[NSE Catalysts] Launching headless engine to fetch live exchange filings...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36');

    console.log('[NSE Catalysts] Navigating to NSE corporate announcements...');
    await page.goto('https://www.nseindia.com/companies-listing/corporate-filings-announcements', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Wait for session and initial network to settle
    await new Promise(r => setTimeout(r, 2500));

    // Fetch official announcements API through page context
    const rawAnnouncements = await page.evaluate(async () => {
      try {
        const res = await fetch('/api/corporate-announcements?index=equities');
        return await res.json();
      } catch (e) {
        return { error: e.message };
      }
    });

    if (!Array.isArray(rawAnnouncements)) {
      throw new Error(`Failed to retrieve announcements array: ${JSON.stringify(rawAnnouncements)}`);
    }

    console.log(`[NSE Catalysts] Retrieved ${rawAnnouncements.length} live corporate filings.`);

    // Filter and score for high-impact catalysts
    const processed = [];
    for (const item of rawAnnouncements) {
      const text = `${item.desc || ''} ${item.attmntText || ''}`.toLowerCase();
      const matchedKeywords = HIGH_IMPACT_KEYWORDS.filter(kw => text.includes(kw));

      // Extract rupee amounts if any (e.g. Rs 500 Cr, INR 26,000 Crore, etc.)
      const amountMatch = text.match(/(?:rs\.?|inr|₹)\s*([\d,]+(?:\.\d+)?)\s*(?:cr|crore|lakh|million|billion)?/i);

      if (matchedKeywords.length > 0) {
        processed.push({
          symbol: item.symbol,
          companyName: item.companyName || item.symbol,
          category: item.desc,
          headline: item.attmntText || item.desc,
          timestamp: item.an_dt,
          attachmentUrl: item.attmnt ? `https://archives.nseindia.com/corporate/${item.attmnt}` : null,
          matchedKeywords,
          extractedAmount: amountMatch ? amountMatch[0] : null,
          isHighImpact: matchedKeywords.length >= 2 || (amountMatch !== null)
        });
      }
    }

    // Sort by high-impact first, then latest timestamp
    processed.sort((a, b) => (b.isHighImpact ? 1 : 0) - (a.isHighImpact ? 1 : 0));

    const result = {
      scannedAt: new Date().toISOString(),
      totalScanned: rawAnnouncements.length,
      catalystCount: processed.length,
      catalysts: processed
    };

    const outDir = path.join(__dirname, 'data');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'latest-catalysts.json'), JSON.stringify(result, null, 2));

    console.log(`[NSE Catalysts] Saved ${processed.length} filtered catalysts to scripts/engine/data/latest-catalysts.json`);
    return result;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  fetchLiveExchangeFilings()
    .then(data => {
      console.log('\n=== LIVE HIGH-IMPACT CATALYSTS ===');
      console.log(`Found ${data.catalystCount} filings matching catalyst criteria:`);
      data.catalysts.slice(0, 5).forEach((c, i) => {
        console.log(`\n${i + 1}. [${c.symbol}] ${c.category} (${c.timestamp})`);
        console.log(`   Headline: ${c.headline.slice(0, 140)}...`);
        console.log(`   Keywords: ${c.matchedKeywords.join(', ')} | High Impact: ${c.isHighImpact}`);
      });
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { fetchLiveExchangeFilings };
