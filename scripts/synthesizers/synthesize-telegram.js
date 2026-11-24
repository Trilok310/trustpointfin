/**
 * TrustPoint Finance - Institutional Synthesizer
 * scripts/synthesizers/synthesize-telegram.js
 * 
 * Transforms raw corporate exchange catalysts into high-speed, SEBI-compliant
 * 3-bullet Flash Alerts with quantitative context and zero fluff.
 */

const fs = require('fs');
const path = require('path');

function generateTelegramAlert(catalyst, deliveryData = null) {
  const symbol = catalyst.symbol;
  const time = catalyst.timestamp || 'Today';
  const headline = catalyst.headline || catalyst.category;

  // Check if stock has delivery absorption data from today's Bhavcopy
  let quantNote = '';
  if (deliveryData && deliveryData.topAccumulation) {
    const match = deliveryData.topAccumulation.find(d => d.symbol === symbol);
    if (match) {
      quantNote = `\n📊 Quant Context: High institutional delivery of ${match.delivPer}% (₹${match.delivTurnoverCr} Cr delivery turnover committed).`;
    }
  }

  const alertText = 
`⚡ FLASH ALERT • NSE STATUTORY FILING | ${time}

🏢 ${symbol}: ${catalyst.category}

1️⃣ Catalyst: ${headline}
2️⃣ Category: Identified under SEBI LODR corporate disclosure.${quantNote}
3️⃣ Desk View: Track opening price acceptance above VWAP; avoid chasing illiquid pre-market spreads.

💬 Chat with Desk: https://trustpointfin.org/whatsapp
👉 Open Free Demat Account: https://a.aonelink.in/ANGOne/uOwRu9n?utm_source=telegram&utm_medium=TG&utm_campaign=Nov`;

  return {
    symbol,
    category: catalyst.category,
    timestamp: time,
    rawText: alertText
  };
}

function processPendingCatalysts() {
  const catalystFile = path.join(__dirname, '../engine/data/latest-catalysts.json');
  const deliveryFile = path.join(__dirname, '../engine/data/latest-delivery.json');

  if (!fs.existsSync(catalystFile)) {
    console.log('[Synthesizer TG] No catalyst file found.');
    return null;
  }

  const catalystData = JSON.parse(fs.readFileSync(catalystFile, 'utf-8'));
  const deliveryData = fs.existsSync(deliveryFile) ? JSON.parse(fs.readFileSync(deliveryFile, 'utf-8')) : null;

  if (!catalystData.catalysts || catalystData.catalysts.length === 0) {
    console.log('[Synthesizer TG] No new catalysts in current session.');
    return null;
  }

  // Pick top high-impact catalyst
  const top = catalystData.catalysts[0];
  const alert = generateTelegramAlert(top, deliveryData);

  const outDir = path.join(__dirname, 'out');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'telegram-pending.json'), JSON.stringify(alert, null, 2));

  console.log(`[Synthesizer TG] Generated alert for ${alert.symbol}:`);
  console.log('----------------------------------------');
  console.log(alert.rawText);
  console.log('----------------------------------------');

  return alert;
}

if (require.main === module) {
  processPendingCatalysts();
}

module.exports = { generateTelegramAlert, processPendingCatalysts };
