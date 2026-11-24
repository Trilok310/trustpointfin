/**
 * TrustPoint Finance - Institutional Quant Engine
 * scripts/engine/fetch-nse-delivery.js
 * 
 * Downloads and parses NSE Full Bhavcopy (sec_bhavdata_full_DDMMYYYY.csv)
 * to uncover real institutional delivery accumulation and anomalies.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': '*/*'
      }
    }, (res) => {
      if (res.statusCode !== 200) {
        return resolve({ status: res.statusCode, data: null });
      }
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve({ status: 200, data: Buffer.concat(chunks).toString('utf-8') }));
    }).on('error', reject);
  });
}

function formatDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}${m}${y}`;
}

function parseBhavcopy(csvText, minTurnoverCr = 15, minDeliveryPct = 55) {
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return null;

  // Header: SYMBOL, SERIES, DATE1, PREV_CLOSE, OPEN_PRICE, HIGH_PRICE, LOW_PRICE, LAST_PRICE, CLOSE_PRICE, AVG_PRICE, TTL_TRD_QNTY, TURNOVER_LACS, NO_OF_TRADES, DELIV_QTY, DELIV_PER
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const symbol = cols[0];
    const series = cols[1];
    
    // Only equity series
    if (series !== 'EQ') continue;

    const date = cols[2];
    const prevClose = parseFloat(cols[3]) || 0;
    const openPrice = parseFloat(cols[4]) || 0;
    const highPrice = parseFloat(cols[5]) || 0;
    const lowPrice = parseFloat(cols[6]) || 0;
    const closePrice = parseFloat(cols[8]) || 0;
    const turnoverLacs = parseFloat(cols[11]) || 0;
    const noOfTrades = parseInt(cols[12], 10) || 0;
    const delivQty = parseInt(cols[13], 10) || 0;
    const delivPer = parseFloat(cols[14]) || 0;

    const turnoverCr = parseFloat((turnoverLacs / 100).toFixed(2));
    const delivTurnoverCr = parseFloat(((turnoverCr * delivPer) / 100).toFixed(2));
    const changePct = prevClose > 0 ? parseFloat((((closePrice - prevClose) / prevClose) * 100).toFixed(2)) : 0;

    if (turnoverCr >= minTurnoverCr && delivPer >= minDeliveryPct) {
      records.push({
        symbol,
        date,
        closePrice,
        changePct,
        turnoverCr,
        delivQty,
        delivPer,
        delivTurnoverCr,
        noOfTrades
      });
    }
  }

  // Sort by Delivery Turnover (highest institutional capital committed)
  records.sort((a, b) => b.delivTurnoverCr - a.delivTurnoverCr);

  return {
    date: records[0]?.date || 'Recent Session',
    totalScannedEquities: lines.length - 1,
    highConvictionCount: records.length,
    topAccumulation: records.slice(0, 15)
  };
}

async function fetchLatestDeliveryData(targetDate = null) {
  let curr = targetDate ? new Date(targetDate) : new Date();

  // If before 6:45 PM IST, step back to previous trading day
  const istHours = curr.getUTCHours() + 5.5;
  if (!targetDate && istHours < 18.75) {
    curr.setDate(curr.getDate() - 1);
  }

  for (let attempt = 0; attempt < 7; attempt++) {
    const day = curr.getDay();
    if (day === 0) curr.setDate(curr.getDate() - 2);
    else if (day === 6) curr.setDate(curr.getDate() - 1);

    const dateStr = formatDate(curr);
    const url = `https://archives.nseindia.com/products/content/sec_bhavdata_full_${dateStr}.csv`;
    console.log(`[NSE Delivery] Checking ${dateStr} at ${url}...`);

    try {
      const res = await fetchBuffer(url);
      if (res.status === 200 && res.data) {
        console.log(`[NSE Delivery] Successfully retrieved Bhavcopy for ${dateStr}!`);
        const parsed = parseBhavcopy(res.data);
        if (parsed) {
          const outDir = path.join(__dirname, 'data');
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.join(outDir, 'latest-delivery.json'), JSON.stringify(parsed, null, 2));
          console.log(`[NSE Delivery] Saved top ${parsed.topAccumulation.length} stocks to scripts/engine/data/latest-delivery.json`);
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`[NSE Delivery] Attempt failed for ${dateStr}:`, e.message);
    }

    curr.setDate(curr.getDate() - 1);
  }

  throw new Error('[NSE Delivery] Could not locate valid Bhavcopy file in the past 7 days.');
}

if (require.main === module) {
  fetchLatestDeliveryData()
    .then(data => {
      console.log('\n=== TOP INSTITUTIONAL DELIVERY ACCUMULATION ===');
      console.log('Date:', data.date);
      console.table(data.topAccumulation.slice(0, 8), ['symbol', 'closePrice', 'changePct', 'delivPer', 'delivTurnoverCr']);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { fetchLatestDeliveryData, parseBhavcopy };
