/**
 * TrustPoint Finance - Institutional Quant Engine
 * scripts/engine/fetch-nse-oi.js
 * 
 * Fetches and analyzes daily NSE Participant-wise Open Interest (FII, DII, Pro, Client)
 * directly from NSE primary archives without third-party paid APIs.
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

function parseParticipantCsv(csvText) {
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 6) return null;

  // Header is line 1
  // Data rows are Client (line 2), DII (3), FII (4), Pro (5), TOTAL (6)
  const result = {
    date: lines[0].replace(/[^a-zA-Z0-9, ]/g, '').trim(),
    participants: {}
  };

  for (let i = 2; i <= 5; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const type = cols[0]; // Client, DII, FII, Pro
    
    const futIdxLong = parseInt(cols[1], 10) || 0;
    const futIdxShort = parseInt(cols[2], 10) || 0;
    const futStockLong = parseInt(cols[3], 10) || 0;
    const futStockShort = parseInt(cols[4], 10) || 0;

    const optIdxCallLong = parseInt(cols[5], 10) || 0;
    const optIdxPutLong = parseInt(cols[6], 10) || 0;
    const optIdxCallShort = parseInt(cols[7], 10) || 0;
    const optIdxPutShort = parseInt(cols[8], 10) || 0;

    const totalIdxFut = futIdxLong + futIdxShort;
    const longRatio = totalIdxFut > 0 ? ((futIdxLong / totalIdxFut) * 100).toFixed(2) : 0;
    const shortRatio = totalIdxFut > 0 ? ((futIdxShort / totalIdxFut) * 100).toFixed(2) : 0;
    const netIdxFut = futIdxLong - futIdxShort;

    result.participants[type] = {
      indexFutures: {
        long: futIdxLong,
        short: futIdxShort,
        total: totalIdxFut,
        net: netIdxFut,
        longPercent: parseFloat(longRatio),
        shortPercent: parseFloat(shortRatio)
      },
      stockFutures: {
        long: futStockLong,
        short: futStockShort,
        net: futStockLong - futStockShort
      },
      indexOptions: {
        callLong: optIdxCallLong,
        putLong: optIdxPutLong,
        callShort: optIdxCallShort,
        putShort: optIdxPutShort,
        netCalls: optIdxCallLong - optIdxCallShort,
        netPuts: optIdxPutLong - optIdxPutShort
      }
    };
  }

  // Calculate Smart Money Divergence Index
  const fiiLongRatio = result.participants['FII']?.indexFutures?.longPercent || 0;
  const clientLongRatio = result.participants['Client']?.indexFutures?.longPercent || 0;
  const divergence = parseFloat((clientLongRatio - fiiLongRatio).toFixed(2));

  let narrative = '';
  if (fiiLongRatio < 30 && clientLongRatio > 65) {
    narrative = 'Extreme Smart Money Trap Setup: FIIs heavily net short in Index Futures while Retail is aggressively long. High vulnerability to downward pressure or sharp short-covering traps.';
  } else if (fiiLongRatio > 65 && clientLongRatio < 40) {
    narrative = 'Strong Institutional Accumulation: FIIs dominate long positioning while Retail is positioned defensively or short. Trend continuation favoured.';
  } else {
    narrative = 'Balanced / Rangebound Positioning: No extreme positioning asymmetry between FII and Retail participants.';
  }

  result.summary = {
    fiiIndexLongPercent: fiiLongRatio,
    fiiIndexShortPercent: 100 - fiiLongRatio,
    clientIndexLongPercent: clientLongRatio,
    clientIndexShortPercent: 100 - clientLongRatio,
    retailFiiDivergence: divergence,
    marketStance: narrative
  };

  return result;
}

async function fetchLatestParticipantOI(targetDate = null) {
  let curr = targetDate ? new Date(targetDate) : new Date();

  // If before 6:30 PM IST today, step back to yesterday's data
  const istHours = curr.getUTCHours() + 5.5;
  if (!targetDate && istHours < 18.5) {
    curr.setDate(curr.getDate() - 1);
  }

  // Try up to 7 previous days to find the most recent trading session
  for (let attempt = 0; attempt < 7; attempt++) {
    // Skip weekends (0 is Sunday, 6 is Saturday)
    const day = curr.getDay();
    if (day === 0) curr.setDate(curr.getDate() - 2);
    else if (day === 6) curr.setDate(curr.getDate() - 1);

    const dateStr = formatDate(curr);
    const url = `https://archives.nseindia.com/content/nsccl/fao_participant_oi_${dateStr}.csv`;
    console.log(`[NSE OI] Checking ${dateStr} at ${url}...`);

    try {
      const res = await fetchBuffer(url);
      if (res.status === 200 && res.data) {
        console.log(`[NSE OI] Successfully retrieved Participant OI for ${dateStr}!`);
        const parsed = parseParticipantCsv(res.data);
        if (parsed) {
          const outDir = path.join(__dirname, 'data');
          if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
          fs.writeFileSync(path.join(outDir, 'latest-oi.json'), JSON.stringify(parsed, null, 2));
          console.log(`[NSE OI] Saved parsed data to scripts/engine/data/latest-oi.json`);
          return parsed;
        }
      }
    } catch (e) {
      console.warn(`[NSE OI] Attempt failed for ${dateStr}:`, e.message);
    }

    // Step back 1 day
    curr.setDate(curr.getDate() - 1);
  }

  throw new Error('[NSE OI] Could not locate valid Participant OI file in the past 7 days.');
}

if (require.main === module) {
  fetchLatestParticipantOI()
    .then(data => {
      console.log('\n=== QUANT SUMMARY ===');
      console.log('Date:', data.date);
      console.log(`FII Index Futures Long: ${data.summary.fiiIndexLongPercent}% | Short: ${data.summary.fiiIndexShortPercent}%`);
      console.log(`Retail (Client) Long: ${data.summary.clientIndexLongPercent}% | Short: ${data.summary.clientIndexShortPercent}%`);
      console.log('Divergence (Retail Long - FII Long):', data.summary.retailFiiDivergence);
      console.log('Institutional Setup:', data.summary.marketStance);
    })
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { fetchLatestParticipantOI, parseParticipantCsv };
