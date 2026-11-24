/**
 * TrustPoint Finance - Institutional Synthesizer
 * scripts/synthesizers/synthesize-social.js
 * 
 * Generates the twice-a-week SFT / Auction Market Theory 5-slide visual carousel
 * and long-form narrative for Instagram & Facebook.
 */

const fs = require('fs');
const path = require('path');

function generateSftCarousel(deliveryStock, oiData) {
  const symbol = deliveryStock.symbol;
  const price = deliveryStock.closePrice;
  const changePct = deliveryStock.changePct;
  const delivPer = deliveryStock.delivPer;
  const turnoverCr = deliveryStock.delivTurnoverCr;

  const fiiShort = oiData?.summary?.fiiIndexShortPercent || 79.87;
  const clientLong = oiData?.summary?.clientIndexLongPercent || 70.17;

  // Slide 1: The Hook
  const slide1 = {
    slideIndex: 1,
    tag: "AUCTION MARKET THEORY • CASE STUDY",
    headline: `Why Smart Money Bought ₹${turnoverCr} Cr of ${symbol} While Retail Panicked`,
    subheadline: `Price dropped ${changePct}%, but institutional delivery surged to an abnormal ${delivPer}%. Here is the order flow breakdown.`,
    statBox: { label: "Institutional Delivery", value: `${delivPer}%` }
  };

  // Slide 2: The Retail Trap vs Institutional Reality
  const slide2 = {
    slideIndex: 2,
    tag: "THE LIQUIDITY TRAP",
    headline: "Retail Sees Panic. Smart Money Sees Wholesale Value.",
    body: `When broad market sentiment is fearful (FIIs ${fiiShort}% short in Index Futures), retail traders dump holdings at market bid prices. Institutional algorithms use this sell-side liquidity to fill large block buy orders without driving prices higher.`,
    bullets: [
      `Retail Stance: Selling into breakdown support levels`,
      `Smart Money Stance: Passive limit-order absorption at wholesale prices`
    ]
  };

  // Slide 3: The Order Flow Footprint
  const slide3 = {
    slideIndex: 3,
    tag: "QUANTITATIVE FOOTPRINT",
    headline: "The Delta & Delivery Divergence",
    body: `Normal daily delivery for ${symbol} hovers between 35–45%. Today's jump to ${delivPer}% with ₹${turnoverCr} Cr committed proves strong institutional hands stepping in.`,
    metrics: [
      { name: "Close Price", value: `₹${price}` },
      { name: "Day Change", value: `${changePct}%` },
      { name: "Delivery %", value: `${delivPer}%` },
      { name: "Capital Deployed", value: `₹${turnoverCr} Cr` }
    ]
  };

  // Slide 4: The Institutional Execution Rule
  const slide4 = {
    slideIndex: 4,
    tag: "THE SFT PLAYBOOK",
    headline: "How Institutional Desks Trade This Setup",
    body: "Never chase green candles blindly after an absorption event. The professional playbook follows 3 strict rules:",
    rules: [
      "Wait for Value Area Acceptance: Look for daily close above the Point of Control (POC).",
      "Confirm with Volume Profile: Ensure low volume nodes (LVN) act as price rejection floors.",
      "Manage Risk Strictly: Invalidation occurs if price breaks below the day's absorption low on high volume."
    ]
  };

  // Slide 5: CTA & Desk Connection
  const slide5 = {
    slideIndex: 5,
    tag: "TRUSTPOINT FINANCE RESEARCH",
    headline: "Trade with Institutional Market Intelligence",
    body: "Stop trading on noisy retail tips. Upgrade to order flow, auction market structure, and real-time delivery insights.",
    action1: "Comment 'FLOW' to get our complete Order Flow Checklist PDF",
    action2: "Connect directly with our research desk on WhatsApp",
    link: "https://trustpointfin.org/whatsapp",
    disclosure: "Authorised Person of Angel One Ltd. For educational research only."
  };

  // Caption for Instagram / Facebook (Zero outbound URLs to prevent Meta reach throttling)
  const caption = 
`🚨 Why Did Smart Money Accumulate ₹${turnoverCr} Cr of ${symbol} on a Red Day? 📊

Retail traders see a ${changePct}% drop and panic sell. But when you look under the hood with Auction Market Theory and Order Flow, the story is completely different:

🔍 The Institutional Due Diligence:
1️⃣ ${symbol} saw an abnormal delivery ratio of ${delivPer}%.
2️⃣ Out of total turnover, over ₹${turnoverCr} Crore was taken home in genuine demat delivery — not intraday speculation.
3️⃣ FIIs are currently ${fiiShort}% net short in Index Futures while Retail is ${clientLong}% long. In this asymmetric market, institutions accumulate selective blue-chips at wholesale discount levels.

💡 The Key Takeaway:
When price makes a lower low but institutional delivery volume spikes with absorption, smart money is accumulating passive liquidity. Wait for Value Area confirmation before taking exposure.

📩 Comment "FLOW" below and we will send our complete Auction Market Theory Quick Reference Guide directly to your DMs!

🔗 Check the link in our bio to connect with our financial research desk and open an account.

#AuctionMarketTheory #OrderFlow #StockMarketIndia #SmartMoneyConcepts #Nifty50 #${symbol} #TrustPointFin #DalalStreet #PriceActionTrading`;

  return {
    symbol,
    slides: [slide1, slide2, slide3, slide4, slide5],
    caption
  };
}

function processPendingSocial() {
  const deliveryFile = path.join(__dirname, '../engine/data/latest-delivery.json');
  const oiFile = path.join(__dirname, '../engine/data/latest-oi.json');

  if (!fs.existsSync(deliveryFile)) {
    console.log('[Synthesizer Social] No delivery data found.');
    return null;
  }

  const deliveryData = JSON.parse(fs.readFileSync(deliveryFile, 'utf-8'));
  const oiData = fs.existsSync(oiFile) ? JSON.parse(fs.readFileSync(oiFile, 'utf-8')) : null;

  if (!deliveryData.topAccumulation || deliveryData.topAccumulation.length === 0) {
    console.log('[Synthesizer Social] No accumulation stocks found.');
    return null;
  }

  // Pick top accumulation stock (e.g. ICICIBANK / DIVISLAB)
  const topStock = deliveryData.topAccumulation.find(s => Math.abs(s.changePct) > 1) || deliveryData.topAccumulation[0];
  const carousel = generateSftCarousel(topStock, oiData);

  const outDir = path.join(__dirname, 'out');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'social-pending.json'), JSON.stringify(carousel, null, 2));

  console.log(`[Synthesizer Social] Generated 5-slide SFT Carousel for ${carousel.symbol}:`);
  console.log('Slide 1 Headline:', carousel.slides[0].headline);
  console.log('Slide 3 Footprint:', carousel.slides[2].headline);
  console.log('Caption Preview:\n', carousel.caption.slice(0, 250) + '...');

  return carousel;
}

if (require.main === module) {
  processPendingSocial();
}

module.exports = { generateSftCarousel, processPendingSocial };
