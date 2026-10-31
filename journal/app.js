// ── journal/app.js ────────────────────────────────────────────────────────────
// TrustPoint Zella — Institutional AI Trading Journal (TradeZella Architecture)
// Built with React 18 + Tailwind CSS + Chart.js + SQLite REST API (& Offline LocalStorage Fallback)

const { useState, useEffect, useRef, useMemo } = React;

const COMMON_MISTAKES = [
  'FOMO Entry',
  'Revenge Trade',
  'Moved Stop Loss',
  'Exited Too Early',
  'Oversized Position',
  'Overtrading',
  'Traded Mid-Day Chop',
  'Expiry Over-leverage',
  'No Stop Loss'
];

const EMOTION_OPTIONS = [
  'Focused & Calm',
  'Disciplined',
  'Confident',
  'Calm & Patient',
  'Cautious',
  'Anxious',
  'Frustrated / FOMO',
  'Tilted / Revenge',
  'Greedy'
];

const FALLBACK_PLAYBOOKS = [
  {
    id: 'pb-orb-15m',
    name: '15m Opening Range Breakout (ORB)',
    description: 'High-momentum breakout above/below the first 15-minute candle (9:15–9:30 AM IST) with volume confirmation and VWAP alignment.',
    market_condition: 'Trending / High Relative Volume',
    color: '#6366f1',
    entry_rules: ['Wait for 9:30 AM 15m candle close', 'Price above VWAP for Long (below for Short)', 'Breakout candle volume > 1.5x 20-period average', 'India VIX between 12 and 22'],
    exit_rules: ['Book 50% at 1.5R target', 'Trail remaining 50% along 9 EMA', 'Hard exit by 11:30 AM if momentum stalls'],
    risk_rules: ['Max risk 1% of capital per trade', 'Stop loss at VWAP or opposite end of 15m trigger candle', 'Maximum 2 attempts per session']
  },
  {
    id: 'pb-vwap-pullback',
    name: 'Institutional VWAP + 20 EMA Pullback',
    description: 'Buying the first controlled pullback to the institutional VWAP & 20 EMA confluence zone in an established intraday trend.',
    market_condition: 'Intraday Directional Trend',
    color: '#10b981',
    entry_rules: ['Clear higher-high & higher-low structure on 5m chart', 'Low-volume pullback into VWAP + 20 EMA zone', 'Hammer / Bullish Engulfing rejection candle confirmation'],
    exit_rules: ['Target previous intraday swing high (minimum 2R)', 'Full exit if 5m candle closes decisively below VWAP'],
    risk_rules: ['Stop loss 0.35% below pullback swing low', 'Never average down a losing options contract']
  },
  {
    id: 'pb-liquidity-sweep',
    name: 'PDH / PDL Liquidity Sweep Reversal',
    description: 'Smart-money trap setup where price sweeps Previous Day High (PDH) or Previous Day Low (PDL) to trigger retail stops before reversing.',
    market_condition: 'Range-Bound / False Breakout Trap',
    color: '#f59e0b',
    entry_rules: ['Price spikes beyond PDH/PDL and immediately rejects back inside range', 'RSI divergence on 5m timeframe', 'Volume trap visible at wick extreme'],
    exit_rules: ['First target at Developing POC / VWAP', 'Second target at opposite side of value area (2.5R+)'],
    risk_rules: ['Tight stop loss just beyond sweep wick extreme', 'No re-entry if sweep candle closes strongly outside range']
  },
  {
    id: 'pb-canslim-swing',
    name: 'Stage-2 VCP / CAN SLIM Swing Breakout',
    description: 'Positional equity breakout from a Volatility Contraction Pattern (VCP) base on daily timeframe backed by institutional accumulation.',
    market_condition: 'Bull Market / Sector Leadership',
    color: '#ec4899',
    entry_rules: ['Stock above 50 DMA and 200 DMA', 'At least 2-3 volatility contractions (T1 > T2 > T3)', 'Breakout above pivot on 200%+ daily volume'],
    exit_rules: ['Partial profit at +15% or 2.5R', 'Trail stop along 21 DMA close'],
    risk_rules: ['Hard stop loss at 5% to 7% below pivot', 'Avoid entry 2 days prior to quarterly earnings']
  }
];

const FALLBACK_TRADES = [
  { id: 1, symbol: 'NIFTY 25200 CE', segment: 'NSE F&O', direction: 'LONG', entry_date: '2026-10-01T09:32:00', exit_date: '2026-10-01T10:45:00', entry_price: 142.5, exit_price: 218.0, quantity: 150, stop_loss: 112.5, target_price: 220.0, fees: 118, gross_pnl: 11325, net_pnl: 11207, r_multiple: 2.49, status: 'WIN', playbook_id: 'pb-orb-15m', setup_tag: '15m ORB Breakout', mistakes: [], emotion_tag: 'Focused & Calm', rating: 5, mae: -6.5, mfe: 81.0, broker: 'Angel One', notes: 'Textbook 15m ORB breakout above 25,180 spot. Volume surged 2.1x at 9:30 AM candle close.' },
  { id: 2, symbol: 'BANKNIFTY 52500 PE', segment: 'NSE F&O', direction: 'LONG', entry_date: '2026-10-02T11:15:00', exit_date: '2026-10-02T11:52:00', entry_price: 310.0, exit_price: 245.0, quantity: 90, stop_loss: 270.0, target_price: 410.0, fees: 96, gross_pnl: -5850, net_pnl: -5946, r_multiple: -1.65, status: 'LOSS', playbook_id: 'pb-vwap-pullback', setup_tag: 'VWAP Breakdown', mistakes: ['Moved Stop Loss', 'Late Entry'], emotion_tag: 'Anxious', rating: 2, mae: -68.0, mfe: 18.0, broker: 'Angel One', notes: 'Chased the move late below VWAP. Widened stop loss instead of cutting at 270.' },
  { id: 3, symbol: 'RELIANCE', segment: 'NSE Equity', direction: 'LONG', entry_date: '2026-10-05T09:40:00', exit_date: '2026-10-05T14:20:00', entry_price: 2945.0, exit_price: 3012.0, quantity: 100, stop_loss: 2920.0, target_price: 3015.0, fees: 85, gross_pnl: 6700, net_pnl: 6615, r_multiple: 2.65, status: 'WIN', playbook_id: 'pb-vwap-pullback', setup_tag: 'VWAP + 20 EMA Bounce', mistakes: [], emotion_tag: 'Disciplined', rating: 5, mae: -4.2, mfe: 71.0, broker: 'Angel One', notes: 'Clean institutional pullback to 2945 VWAP zone with hammer confirmation.' },
  { id: 4, symbol: 'HDFCBANK', segment: 'NSE Equity', direction: 'SHORT', entry_date: '2026-10-06T10:05:00', exit_date: '2026-10-06T12:30:00', entry_price: 1688.0, exit_price: 1656.0, quantity: 200, stop_loss: 1702.0, target_price: 1650.0, fees: 110, gross_pnl: 6400, net_pnl: 6290, r_multiple: 2.25, status: 'WIN', playbook_id: 'pb-liquidity-sweep', setup_tag: 'PDH Liquidity Sweep', mistakes: [], emotion_tag: 'Confident', rating: 5, mae: -3.5, mfe: 35.0, broker: 'Zerodha', notes: 'Swept PDH at 1692 on weak breadth and immediately rejected back inside range.' },
  { id: 5, symbol: 'NIFTY 25000 PE', segment: 'NSE F&O', direction: 'LONG', entry_date: '2026-10-07T13:10:00', exit_date: '2026-10-07T13:28:00', entry_price: 185.0, exit_price: 122.0, quantity: 150, stop_loss: 155.0, target_price: 250.0, fees: 125, gross_pnl: -9450, net_pnl: -9575, r_multiple: -2.13, status: 'LOSS', playbook_id: 'pb-orb-15m', setup_tag: 'Impulse Breakdown', mistakes: ['FOMO Entry', 'Overtrading', 'Traded Mid-Day Chop'], emotion_tag: 'Frustrated / FOMO', rating: 1, mae: -65.0, mfe: 5.0, broker: 'Angel One', notes: 'Entered during 1 PM lunch-hour chop out of boredom.' },
  { id: 6, symbol: 'NIFTY 25100 CE', segment: 'NSE F&O', direction: 'LONG', entry_date: '2026-10-07T13:40:00', exit_date: '2026-10-07T14:05:00', entry_price: 160.0, exit_price: 118.0, quantity: 225, stop_loss: 135.0, target_price: 220.0, fees: 160, gross_pnl: -9450, net_pnl: -9610, r_multiple: -1.71, status: 'LOSS', playbook_id: 'pb-orb-15m', setup_tag: 'Reversal Attempt', mistakes: ['Revenge Trade', 'Oversized Position'], emotion_tag: 'Tilted / Revenge', rating: 1, mae: -45.0, mfe: 8.0, broker: 'Angel One', notes: 'Classic revenge trade right after 13:28 loss. Increased size from 150 to 225 qty.' },
  { id: 7, symbol: 'TRENT', segment: 'NSE Equity', direction: 'LONG', entry_date: '2026-10-08T09:50:00', exit_date: '2026-10-09T15:10:00', entry_price: 7420.0, exit_price: 7865.0, quantity: 35, stop_loss: 7260.0, target_price: 7850.0, fees: 145, gross_pnl: 15575, net_pnl: 15430, r_multiple: 2.76, status: 'WIN', playbook_id: 'pb-canslim-swing', setup_tag: 'VCP Stage-2 Breakout', mistakes: [], emotion_tag: 'Calm & Patient', rating: 5, mae: -22.0, mfe: 460.0, broker: 'Zerodha', notes: '3-week tight VCP consolidation above 21 EMA. Massive institutional volume.' },
  { id: 8, symbol: 'BANKNIFTY 52800 CE', segment: 'NSE F&O', direction: 'LONG', entry_date: '2026-10-12T09:31:00', exit_date: '2026-10-12T10:18:00', entry_price: 265.0, exit_price: 392.0, quantity: 90, stop_loss: 220.0, target_price: 390.0, fees: 105, gross_pnl: 11430, net_pnl: 11325, r_multiple: 2.80, status: 'WIN', playbook_id: 'pb-orb-15m', setup_tag: '15m ORB Breakout', mistakes: [], emotion_tag: 'Focused & Calm', rating: 5, mae: -12.0, mfe: 138.0, broker: 'Angel One', notes: 'HDFC and ICICI both broke opening highs together at 9:30 AM.' },
  { id: 9, symbol: 'TATAMOTORS', segment: 'NSE Equity', direction: 'LONG', entry_date: '2026-10-13T10:15:00', exit_date: '2026-10-13T11:40:00', entry_price: 962.0, exit_price: 974.5, quantity: 300, stop_loss: 952.0, target_price: 990.0, fees: 90, gross_pnl: 3750, net_pnl: 3660, r_multiple: 1.22, status: 'WIN', playbook_id: 'pb-vwap-pullback', setup_tag: 'VWAP Bounce', mistakes: ['Exited Too Early'], emotion_tag: 'Cautious', rating: 3, mae: -2.0, mfe: 29.5, broker: 'Angel One', notes: 'Good entry at VWAP, but booked early at 1.22R before 991 target.' },
  { id: 10, symbol: 'ICICIBANK', segment: 'NSE Equity', direction: 'LONG', entry_date: '2026-10-14T09:35:00', exit_date: '2026-10-14T13:15:00', entry_price: 1275.0, exit_price: 1308.0, quantity: 250, stop_loss: 1262.0, target_price: 1307.0, fees: 115, gross_pnl: 8250, net_pnl: 8135, r_multiple: 2.50, status: 'WIN', playbook_id: 'pb-orb-15m', setup_tag: '15m ORB Breakout', mistakes: [], emotion_tag: 'Disciplined', rating: 5, mae: -3.0, mfe: 36.0, broker: 'Angel One', notes: 'Relative strength leader against Nifty. Followed trailing 9 EMA rule.' },
  { id: 11, symbol: 'NIFTY 25350 CE', segment: 'NSE F&O', direction: 'LONG', entry_date: '2026-10-15T14:15:00', exit_date: '2026-10-15T14:50:00', entry_price: 95.0, exit_price: 42.0, quantity: 150, stop_loss: 70.0, target_price: 165.0, fees: 110, gross_pnl: -7950, net_pnl: -8060, r_multiple: -2.15, status: 'LOSS', playbook_id: 'pb-liquidity-sweep', setup_tag: 'Expiry Hero-Zero Gamble', mistakes: ['FOMO Entry', 'Moved Stop Loss', 'Expiry Over-leverage'], emotion_tag: 'Greedy', rating: 1, mae: -55.0, mfe: 14.0, broker: 'Angel One', notes: 'Expiry afternoon OTM option gamble. Violated stop loss at 70.' },
  { id: 12, symbol: 'BAJFINANCE', segment: 'NSE Equity', direction: 'LONG', entry_date: '2026-10-16T09:48:00', exit_date: '2026-10-16T14:40:00', entry_price: 7180.0, exit_price: 7345.0, quantity: 60, stop_loss: 7120.0, target_price: 7340.0, fees: 120, gross_pnl: 9900, net_pnl: 9780, r_multiple: 2.72, status: 'WIN', playbook_id: 'pb-vwap-pullback', setup_tag: 'VWAP + 20 EMA Bounce', mistakes: [], emotion_tag: 'Focused & Calm', rating: 5, mae: -15.0, mfe: 174.0, broker: 'Zerodha', notes: 'Waited patiently for 9:45 AM pullback after gap-up. Captured +2.72R.' },
  { id: 13, symbol: 'NIFTY 25400 PE', segment: 'NSE F&O', direction: 'LONG', entry_date: '2026-10-19T09:36:00', exit_date: '2026-10-19T10:55:00', entry_price: 154.0, exit_price: 238.0, quantity: 150, stop_loss: 124.0, target_price: 235.0, fees: 118, gross_pnl: 12600, net_pnl: 12482, r_multiple: 2.77, status: 'WIN', playbook_id: 'pb-liquidity-sweep', setup_tag: 'PDH Liquidity Sweep', mistakes: [], emotion_tag: 'Focused & Calm', rating: 5, mae: -8.0, mfe: 90.0, broker: 'Angel One', notes: 'Nifty swept Friday high at 9:30 AM and printed shooting star rejection.' }
];

const FALLBACK_NOTES = [
  { id: 1, note_date: '2026-10-19', title: 'Monday Morning Gameplan & Execution Review', category: 'Session Review', mood: 'Focused & Calm', content: 'Key Levels for Nifty: PDH 25,425 | PDL 25,210 | VWAP magnet at 25,310.\nExecuted the PDH Liquidity Sweep Playbook to perfection this morning. Kept position size at 150 qty and respected the 30-point stop loss.', lessons_learned: 'Wait for PDH/PDL sweep + 5m close inside range before clicking buy. Do not trade after 12:30 PM once morning target is achieved.' },
  { id: 2, note_date: '2026-10-15', title: 'Weekly Expiry Post-Mortem: Avoiding 2 PM Hero-Zero Traps', category: 'Psychology Log', mood: 'Reflective', content: 'Gave back ₹8,060 of weekly profits on a single unscheduled 2:15 PM OTM option trade. Every single morning A+ setup this week was profitable, while all losses came after 1:00 PM.', lessons_learned: 'Hard rule added: Kill-switch active at 12:30 PM on Thursday/Wednesday weekly expiries.' }
];

function computeClientAnalytics(trades, playbooks) {
  const sorted = [...trades].sort((a, b) => (a.entry_date || '').localeCompare(b.entry_date || ''));
  const totalTrades = sorted.length;
  let grossProfit = 0, grossLoss = 0, totalFees = 0, netPnl = 0;
  let winCount = 0, lossCount = 0, beCount = 0, totalR = 0;
  let bestWin = 0, worstLoss = 0, peakEquity = 0, currentEquity = 0, maxDrawdown = 0;
  let currentStreak = 0, bestWinStreak = 0, worstLossStreak = 0, tempWin = 0, tempLoss = 0;

  const equityCurve = [];
  const dailyMap = {};
  const mistakeMap = {};
  const hourMap = {};
  const segmentMap = {};

  const dowNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dowMap = {
    Monday: { day: 'Monday', trades: 0, wins: 0, netPnl: 0 },
    Tuesday: { day: 'Tuesday', trades: 0, wins: 0, netPnl: 0 },
    Wednesday: { day: 'Wednesday', trades: 0, wins: 0, netPnl: 0 },
    Thursday: { day: 'Thursday', trades: 0, wins: 0, netPnl: 0 },
    Friday: { day: 'Friday', trades: 0, wins: 0, netPnl: 0 }
  };
  const hourlySlots = {};
  for (let h = 9; h <= 15; h++) {
    const label = `${String(h).padStart(2, '0')}:00`;
    hourlySlots[label] = { hour: label, trades: 0, wins: 0, netPnl: 0 };
  }
  const durationMap = {
    'Scalp (<15m)': { bucket: 'Scalp (<15m)', trades: 0, wins: 0, netPnl: 0 },
    'Intraday Momentum (15m–60m)': { bucket: 'Intraday Momentum (15m–60m)', trades: 0, wins: 0, netPnl: 0 },
    'Session Trend (1h–3h)': { bucket: 'Session Trend (1h–3h)', trades: 0, wins: 0, netPnl: 0 },
    'Full Day / Swing (>3h)': { bucket: 'Full Day / Swing (>3h)', trades: 0, wins: 0, netPnl: 0 }
  };
  const symbolMap = {};
  const taxSummary = { brokerage: 0, stt: 0, exchangeTxn: 0, gst: 0, stampDuty: 0, sebiFee: 0, totalTaxes: 0 };

  for (const t of sorted) {
    const pnl = Number(t.net_pnl) || 0;
    const r = Number(t.r_multiple) || 0;
    const fees = Number(t.fees) || 0;
    totalFees += fees;
    netPnl += pnl;
    totalR += r;

    const tb = (t.tax_breakdown && typeof t.tax_breakdown === 'object')
      ? t.tax_breakdown
      : (window.calculateClientIndianTaxes
          ? window.calculateClientIndianTaxes({ segment: t.segment, direction: t.direction, entryPrice: t.entry_price, exitPrice: t.exit_price, quantity: t.quantity })
          : { brokerage: 40, stt: 25, exchangeTxn: 15, gst: 10, stampDuty: 5, sebiFee: 1, totalTaxes: fees });
    taxSummary.brokerage = Number((taxSummary.brokerage + (Number(tb.brokerage) || 0)).toFixed(2));
    taxSummary.stt = Number((taxSummary.stt + (Number(tb.stt) || 0)).toFixed(2));
    taxSummary.exchangeTxn = Number((taxSummary.exchangeTxn + (Number(tb.exchangeTxn) || 0)).toFixed(2));
    taxSummary.gst = Number((taxSummary.gst + (Number(tb.gst) || 0)).toFixed(2));
    taxSummary.stampDuty = Number((taxSummary.stampDuty + (Number(tb.stampDuty) || 0)).toFixed(2));
    taxSummary.sebiFee = Number((taxSummary.sebiFee + (Number(tb.sebiFee) || 0)).toFixed(2));
    taxSummary.totalTaxes = Number((taxSummary.totalTaxes + fees).toFixed(2));

    if (pnl > 25) {
      winCount++;
      grossProfit += pnl;
      if (pnl > bestWin) bestWin = pnl;
      tempWin++; tempLoss = 0;
      if (tempWin > bestWinStreak) bestWinStreak = tempWin;
      currentStreak = tempWin;
    } else if (pnl < -25) {
      lossCount++;
      grossLoss += Math.abs(pnl);
      if (pnl < worstLoss) worstLoss = pnl;
      tempLoss++; tempWin = 0;
      if (tempLoss > worstLossStreak) worstLossStreak = tempLoss;
      currentStreak = -tempLoss;
    } else {
      beCount++;
    }

    currentEquity = Number((currentEquity + pnl).toFixed(2));
    if (currentEquity > peakEquity) peakEquity = currentEquity;
    const dd = peakEquity - currentEquity;
    if (dd > maxDrawdown) maxDrawdown = dd;

    const dateKey = (t.entry_date || '').slice(0, 10) || '2026-10-01';
    if (!dailyMap[dateKey]) {
      dailyMap[dateKey] = { date: dateKey, netPnl: 0, grossPnl: 0, trades: 0, wins: 0, losses: 0, rMultiple: 0, mistakesCount: 0 };
    }
    dailyMap[dateKey].netPnl = Number((dailyMap[dateKey].netPnl + pnl).toFixed(2));
    dailyMap[dateKey].trades += 1;
    if (pnl > 25) dailyMap[dateKey].wins += 1;
    if (pnl < -25) dailyMap[dateKey].losses += 1;
    dailyMap[dateKey].rMultiple = Number((dailyMap[dateKey].rMultiple + r).toFixed(2));

    const dtObj = new Date(dateKey + 'T09:30:00');
    const dowName = dowNames[dtObj.getDay()] || 'Monday';
    if (dowMap[dowName]) {
      dowMap[dowName].trades += 1;
      if (pnl > 25) dowMap[dowName].wins += 1;
      dowMap[dowName].netPnl = Number((dowMap[dowName].netPnl + pnl).toFixed(2));
    }

    const mistakesArr = Array.isArray(t.mistakes) ? t.mistakes : [];
    dailyMap[dateKey].mistakesCount += mistakesArr.length;
    for (const m of mistakesArr) {
      if (!mistakeMap[m]) mistakeMap[m] = { mistake: m, count: 0, totalPnl: 0, lossCost: 0 };
      mistakeMap[m].count += 1;
      mistakeMap[m].totalPnl = Number((mistakeMap[m].totalPnl + pnl).toFixed(2));
      if (pnl < 0) mistakeMap[m].lossCost = Number((mistakeMap[m].lossCost + Math.abs(pnl)).toFixed(2));
    }

    const timePart = (t.entry_date || '').split('T')[1] || '09:30';
    const hour = parseInt(timePart.slice(0, 2), 10) || 9;
    const clampedHour = Math.min(15, Math.max(9, hour));
    const hourSlotKey = `${String(clampedHour).padStart(2, '0')}:00`;
    if (hourlySlots[hourSlotKey]) {
      hourlySlots[hourSlotKey].trades += 1;
      if (pnl > 25) hourlySlots[hourSlotKey].wins += 1;
      hourlySlots[hourSlotKey].netPnl = Number((hourlySlots[hourSlotKey].netPnl + pnl).toFixed(2));
    }

    const sessionLabel = hour < 11 ? 'Morning Bell (09:15–11:00)' : (hour < 13 ? 'Mid-Day Session (11:00–13:00)' : 'Afternoon / Closing (13:00–15:30)');
    if (!hourMap[sessionLabel]) hourMap[sessionLabel] = { session: sessionLabel, trades: 0, wins: 0, netPnl: 0 };
    hourMap[sessionLabel].trades += 1;
    if (pnl > 25) hourMap[sessionLabel].wins += 1;
    hourMap[sessionLabel].netPnl = Number((hourMap[sessionLabel].netPnl + pnl).toFixed(2));

    let holdMins = 45;
    if (t.entry_date && t.exit_date) {
      const diffMs = new Date(t.exit_date).getTime() - new Date(t.entry_date).getTime();
      if (!isNaN(diffMs) && diffMs > 0) holdMins = Math.round(diffMs / 60000);
    }
    const durKey = holdMins < 15 ? 'Scalp (<15m)' : (holdMins <= 60 ? 'Intraday Momentum (15m–60m)' : (holdMins <= 180 ? 'Session Trend (1h–3h)' : 'Full Day / Swing (>3h)'));
    durationMap[durKey].trades += 1;
    if (pnl > 25) durationMap[durKey].wins += 1;
    durationMap[durKey].netPnl = Number((durationMap[durKey].netPnl + pnl).toFixed(2));

    const symKey = (t.symbol || 'NIFTY').split(' ')[0].toUpperCase();
    if (!symbolMap[symKey]) symbolMap[symKey] = { symbol: symKey, trades: 0, wins: 0, netPnl: 0 };
    symbolMap[symKey].trades += 1;
    if (pnl > 25) symbolMap[symKey].wins += 1;
    symbolMap[symKey].netPnl = Number((symbolMap[symKey].netPnl + pnl).toFixed(2));

    const seg = t.segment || 'NSE F&O';
    if (!segmentMap[seg]) segmentMap[seg] = { segment: seg, trades: 0, wins: 0, netPnl: 0 };
    segmentMap[seg].trades += 1;
    if (pnl > 25) segmentMap[seg].wins += 1;
    segmentMap[seg].netPnl = Number((segmentMap[seg].netPnl + pnl).toFixed(2));

    equityCurve.push({ id: t.id, date: dateKey, symbol: t.symbol, tradePnl: pnl, cumulativePnl: currentEquity, drawdown: Number((-dd).toFixed(2)) });
  }

  const winRate = totalTrades > 0 ? Number(((winCount / totalTrades) * 100).toFixed(1)) : 0;
  const avgWin = winCount > 0 ? Number((grossProfit / winCount).toFixed(2)) : 0;
  const avgLoss = lossCount > 0 ? Number((grossLoss / lossCount).toFixed(2)) : 0;
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : (grossProfit > 0 ? 9.99 : 0);
  const rrRatio = avgLoss > 0 ? Number((avgWin / avgLoss).toFixed(2)) : (avgWin > 0 ? 3.0 : 0);
  const avgRMultiple = totalTrades > 0 ? Number((totalR / totalTrades).toFixed(2)) : 0;
  const expectancy = totalTrades > 0 ? Number((netPnl / totalTrades).toFixed(2)) : 0;

  const playbookStats = (playbooks || []).map(pb => {
    const pbTrades = sorted.filter(t => t.playbook_id === pb.id);
    const pbWins = pbTrades.filter(t => Number(t.net_pnl) > 25);
    const pbLosses = pbTrades.filter(t => Number(t.net_pnl) < -25);
    const pbGrossWin = pbWins.reduce((s, t) => s + Number(t.net_pnl), 0);
    const pbGrossLoss = pbLosses.reduce((s, t) => s + Math.abs(Number(t.net_pnl)), 0);
    const pbNet = pbTrades.reduce((s, t) => s + Number(t.net_pnl), 0);
    const pbTotalR = pbTrades.reduce((s, t) => s + (Number(t.r_multiple) || 0), 0);
    return {
      ...pb,
      tradesCount: pbTrades.length,
      winRate: pbTrades.length > 0 ? Number(((pbWins.length / pbTrades.length) * 100).toFixed(1)) : 0,
      netPnl: Number(pbNet.toFixed(2)),
      profitFactor: pbGrossLoss > 0 ? Number((pbGrossWin / pbGrossLoss).toFixed(2)) : (pbGrossWin > 0 ? 5.0 : 0),
      avgR: pbTrades.length > 0 ? Number((pbTotalR / pbTrades.length).toFixed(2)) : 0,
      expectancy: pbTrades.length > 0 ? Number((pbNet / pbTrades.length).toFixed(2)) : 0
    };
  });

  const winRateScore = Math.min(100, Math.round((winRate / 68) * 100));
  const profitFactorScore = Math.min(100, Math.round((Math.min(profitFactor, 3.2) / 3.0) * 100));
  const avgWinLossScore = Math.min(100, Math.round((Math.min(rrRatio, 2.8) / 2.5) * 100));
  const recoveryFactor = maxDrawdown > 0 ? (Math.max(0, netPnl) / maxDrawdown) : (netPnl > 0 ? 3.5 : 0);
  const recoveryFactorScore = Math.min(100, Math.round((Math.min(recoveryFactor, 3.5) / 3.0) * 100));
  const ddRatio = peakEquity > 0 ? (maxDrawdown / Math.max(peakEquity, 25000)) : 0.2;
  const maxDrawdownScore = Math.max(15, Math.min(100, Math.round((1 - Math.min(ddRatio, 0.85)) * 100)));
  const cleanTradesCount = sorted.filter(t => !t.mistakes || t.mistakes.length === 0).length;
  const consistencyScore = totalTrades > 0 ? Math.min(100, Math.round((cleanTradesCount / totalTrades) * 100)) : 80;
  const overallZellaScore = totalTrades > 0
    ? Math.round(winRateScore * 0.18 + profitFactorScore * 0.22 + avgWinLossScore * 0.18 + recoveryFactorScore * 0.14 + maxDrawdownScore * 0.13 + consistencyScore * 0.15)
    : 0;

  const mistakesBreakdown = Object.values(mistakeMap).sort((a, b) => b.lossCost - a.lossCost);
  const totalMistakeCost = mistakesBreakdown.reduce((s, m) => s + m.lossCost, 0);

  return {
    summary: {
      totalTrades, winCount, lossCount, beCount, winRate,
      grossProfit: Number(grossProfit.toFixed(2)),
      grossLoss: Number(grossLoss.toFixed(2)),
      totalFees: Number(totalFees.toFixed(2)),
      netPnl: Number(netPnl.toFixed(2)),
      profitFactor, rrRatio, avgWin, avgLoss, avgRMultiple, expectancy,
      maxDrawdown: Number(maxDrawdown.toFixed(2)),
      bestWin: Number(bestWin.toFixed(2)),
      worstLoss: Number(worstLoss.toFixed(2)),
      currentStreak, bestWinStreak, worstLossStreak,
      cleanTradesCount, disciplineRate: consistencyScore,
      totalMistakeCost: Number(totalMistakeCost.toFixed(2)),
      potentialNetPnlWithoutMistakes: Number((netPnl + totalMistakeCost).toFixed(2))
    },
    zellaScore: {
      overall: overallZellaScore,
      grade: overallZellaScore >= 85 ? 'Elite Institutional (A+)' : (overallZellaScore >= 72 ? 'Consistent Edge (A)' : (overallZellaScore >= 58 ? 'Developing Edge (B)' : 'High Leak Risk (C)')),
      dimensions: [
        { key: 'winRate', label: 'Win Rate %', score: winRateScore, rawValue: `${winRate}%` },
        { key: 'profitFactor', label: 'Profit Factor', score: profitFactorScore, rawValue: `${profitFactor}x` },
        { key: 'rrRatio', label: 'Avg Win / Loss', score: avgWinLossScore, rawValue: `${rrRatio}:1` },
        { key: 'recovery', label: 'Recovery Factor', score: recoveryFactorScore, rawValue: `${recoveryFactor.toFixed(2)}x` },
        { key: 'drawdown', label: 'Drawdown Control', score: maxDrawdownScore, rawValue: `₹${maxDrawdown.toLocaleString('en-IN')}` },
        { key: 'discipline', label: 'Rule Discipline', score: consistencyScore, rawValue: `${consistencyScore}%` }
      ]
    },
    equityCurve,
    dailyCalendar: dailyMap,
    mistakesBreakdown,
    sessionBreakdown: Object.values(hourMap),
    segmentBreakdown: Object.values(segmentMap),
    dayOfWeekBreakdown: Object.values(dowMap),
    hourlyBreakdown: Object.values(hourlySlots),
    durationBreakdown: Object.values(durationMap),
    symbolBreakdown: Object.values(symbolMap).sort((a, b) => b.netPnl - a.netPnl),
    taxAudit: taxSummary,
    playbookStats
  };
}

function formatINR(num, showSign = false) {
  const n = Number(num) || 0;
  const abs = Math.abs(n).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  if (n > 0) return showSign ? `+₹${abs}` : `₹${abs}`;
  if (n < 0) return `-₹${abs}`;
  return `₹0`;
}

// ── Equity & Daily P&L Chart Component ──
function PerformanceCharts({ equityCurve }) {
  const equityCanvasRef = useRef(null);
  const barCanvasRef = useRef(null);
  const equityChartRef = useRef(null);
  const barChartRef = useRef(null);

  useEffect(() => {
    if (!equityCanvasRef.current || !barCanvasRef.current) return;
    if (equityChartRef.current) equityChartRef.current.destroy();
    if (barChartRef.current) barChartRef.current.destroy();

    const labels = equityCurve.map((pt, i) => `#${i + 1} ${pt.symbol.split(' ')[0]}`);
    const cumData = equityCurve.map(pt => pt.cumulativePnl);
    const tradeData = equityCurve.map(pt => pt.tradePnl);

    const ctx1 = equityCanvasRef.current.getContext('2d');
    const grad = ctx1.createLinearGradient(0, 0, 0, 240);
    grad.addColorStop(0, 'rgba(99, 102, 241, 0.42)');
    grad.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

    equityChartRef.current = new Chart(ctx1, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Cumulative Net P&L (₹)',
          data: cumData,
          borderColor: '#818CF8',
          backgroundColor: grad,
          borderWidth: 2.5,
          fill: true,
          tension: 0.32,
          pointRadius: 3.5,
          pointBackgroundColor: cumData.map(v => v >= 0 ? '#10B981' : '#F43F5E')
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111726',
            borderColor: '#222F49',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => `Cumulative P&L: ${formatINR(ctx.raw, true)}`
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(34, 47, 73, 0.35)' }, ticks: { color: '#94A3B8', font: { size: 10 } } },
          y: { grid: { color: 'rgba(34, 47, 73, 0.35)' }, ticks: { color: '#94A3B8', callback: v => `₹${(v / 1000).toFixed(0)}k` } }
        }
      }
    });

    const ctx2 = barCanvasRef.current.getContext('2d');
    barChartRef.current = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Trade Net P&L (₹)',
          data: tradeData,
          backgroundColor: tradeData.map(v => v >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(244, 63, 94, 0.8)'),
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111726',
            borderColor: '#222F49',
            borderWidth: 1,
            callbacks: {
              label: (ctx) => `Trade P&L: ${formatINR(ctx.raw, true)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#94A3B8', font: { size: 10 } } },
          y: { grid: { color: 'rgba(34, 47, 73, 0.35)' }, ticks: { color: '#94A3B8', callback: v => `₹${(v / 1000).toFixed(0)}k` } }
        }
      }
    });

    return () => {
      if (equityChartRef.current) equityChartRef.current.destroy();
      if (barChartRef.current) barChartRef.current.destroy();
    };
  }, [equityCurve]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <i className="fa-solid fa-chart-area text-indigo-400"></i> Cumulative Equity Curve
            </h3>
            <p className="text-xs text-slate-400">Realized account progression across closed trades</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            Net Realized Curve
          </span>
        </div>
        <div className="h-60">
          <canvas ref={equityCanvasRef}></canvas>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <i className="fa-solid fa-chart-column text-emerald-400"></i> Trade-by-Trade Net P&L Distribution
            </h3>
            <p className="text-xs text-slate-400">Win vs loss magnitude consistency check</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            R-Distribution
          </span>
        </div>
        <div className="h-60">
          <canvas ref={barCanvasRef}></canvas>
        </div>
      </div>
    </div>
  );
}

// ── Main Application ──
function TrustPointZellaApp() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [trades, setTrades] = useState([]);
  const [playbooks, setPlaybooks] = useState([]);
  const [notes, setNotes] = useState([]);
  const [analytics, setAnalytics] = useState(() => computeClientAnalytics(FALLBACK_TRADES, FALLBACK_PLAYBOOKS));
  const [backendConnected, setBackendConnected] = useState(true);
  const [toast, setToast] = useState(null);

  // Multi-User & Multi-Account Isolation + Plan Tier
  const [currentUserId, setCurrentUserId] = useState(() => localStorage.getItem('tp_zella_user_id') || 'trader_primary');
  const [userProfile, setUserProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tp_zella_user_profile') || 'null'); } catch (_) { return null; }
  });
  const [selectedAccount, setSelectedAccount] = useState('ALL');
  const [userPlan, setUserPlan] = useState(() => localStorage.getItem('tp_zella_plan') || 'FREE_STARTER');
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Filters for Trade Log
  const [filterSegment, setFilterSegment] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPlaybook, setFilterPlaybook] = useState('ALL');
  const [filterMistake, setFilterMistake] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Calendar Month State (Default 2026-10)
  const [calendarMonth, setCalendarMonth] = useState('2026-10');
  const [selectedDayModal, setSelectedDayModal] = useState(null);

  // Selected Trade for Replay / Inspector & Editing
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [isEditingTrade, setIsEditingTrade] = useState(false);
  const [editTradeForm, setEditTradeForm] = useState(null);

  // Modals
  const [showAddTradeModal, setShowAddTradeModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddPlaybookModal, setShowAddPlaybookModal] = useState(false);

  // AI Coach State
  const [aiReport, setAiReport] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // New Trade Form
  const [tradeForm, setTradeForm] = useState({
    symbol: 'NIFTY 25300 CE',
    segment: 'NSE F&O',
    direction: 'LONG',
    account_id: 'Main F&O',
    entry_date: '2026-10-19T09:35',
    exit_date: '2026-10-19T10:25',
    entry_price: '165',
    exit_price: '228',
    quantity: '150',
    stop_loss: '135',
    target_price: '230',
    fees: '',
    playbook_id: 'pb-orb-15m',
    setup_tag: '15m ORB Breakout',
    mistakes: [],
    emotion_tag: 'Focused & Calm',
    rating: 5,
    broker: 'Angel One',
    chart_url: '',
    notes: ''
  });

  // New Playbook Form
  const [playbookForm, setPlaybookForm] = useState({
    name: '',
    description: '',
    market_condition: 'Trending / High Momentum',
    color: '#6366f1',
    entry_rules_text: 'Wait for 15m candle close\nVolume > 1.5x average\nPrice aligned with VWAP',
    exit_rules_text: 'Book 50% at 1.5R\nTrail rest on 9 EMA',
    risk_rules_text: 'Max 1% capital risk\nHard stop loss in system'
  });

  // New Daily Note Form
  const [noteForm, setNoteForm] = useState({
    note_date: '2026-10-19',
    title: '',
    category: 'Session Review',
    mood: 'Focused & Calm',
    content: '',
    lessons_learned: ''
  });

  // REA-Reconstructed Position Sizer & Lot Risk Calculator State
  const [sizerForm, setSizerForm] = useState({
    accountSize: '500000',
    riskPct: '1.0',
    entryPrice: '154',
    stopPrice: '124',
    targetPrice: '235',
    lotSize: '75',
    direction: 'LONG'
  });

  function showNotification(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4200);
  }

  function getAuthHeaders(extra = {}) {
    return {
      'Content-Type': 'application/json',
      'x-zella-user': currentUserId,
      ...extra
    };
  }

  async function loadJournalData(accountOverride) {
    const acct = accountOverride !== undefined ? accountOverride : selectedAccount;
    try {
      const qs = acct && acct !== 'ALL' ? `?account_id=${encodeURIComponent(acct)}` : '';
      const res = await fetch(`/api/journal/bootstrap${qs}`, {
        headers: { 'x-zella-user': currentUserId }
      });
      if (!res.ok) throw new Error('Static mode fallback');
      const data = await res.json();
      if (data && data.success) {
        setTrades(data.trades || []);
        setPlaybooks(data.playbooks || []);
        setNotes(data.notes || []);
        setAnalytics(data.analytics || computeClientAnalytics(data.trades || [], data.playbooks || []));
        if (data.userProfile && data.userProfile.plan_tier) {
          setUserPlan(data.userProfile.plan_tier);
          localStorage.setItem('tp_zella_plan', data.userProfile.plan_tier);
        }
        setBackendConnected(true);
        return;
      }
    } catch (_) {
      setBackendConnected(false);
      const rawSaved = localStorage.getItem(`tp_zella_trades_${currentUserId}`);
      const savedTrades = rawSaved !== null ? JSON.parse(rawSaved) : FALLBACK_TRADES;
      const filteredByAcct = acct && acct !== 'ALL'
        ? savedTrades.filter(t => (t.account_id || 'Main F&O') === acct)
        : savedTrades;
      const savedPlaybooks = JSON.parse(localStorage.getItem('tp_zella_playbooks') || 'null') || FALLBACK_PLAYBOOKS;
      const savedNotes = JSON.parse(localStorage.getItem('tp_zella_notes') || 'null') || FALLBACK_NOTES;
      setTrades(filteredByAcct);
      setPlaybooks(savedPlaybooks);
      setNotes(savedNotes);
      setAnalytics(computeClientAnalytics(filteredByAcct, savedPlaybooks));
    }
  }

  useEffect(() => {
    loadJournalData(selectedAccount);
  }, [currentUserId, selectedAccount]);

  async function triggerAiCoach(customPrompt = '') {
    setAiLoading(true);
    try {
      const res = await fetch('/api/journal/ai-coach', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ prompt: customPrompt })
      });
      if (!res.ok) throw new Error('Fallback AI coach');
      const data = await res.json();
      if (data && data.success) {
        setAiReport(data);
        setAiLoading(false);
        return;
      }
    } catch (_) {
      const currentAnalytics = computeClientAnalytics(trades, playbooks);
      const { summary, zellaScore, mistakesBreakdown, playbookStats, sessionBreakdown } = currentAnalytics;
      const bestPb = [...playbookStats].sort((a, b) => b.netPnl - a.netPnl)[0] || { name: '15m ORB Breakout', netPnl: 0, winRate: 0 };
      const topM = mistakesBreakdown[0] || { mistake: 'Revenge Trade', lossCost: 0, count: 0 };
      const bestSess = [...sessionBreakdown].sort((a, b) => b.netPnl - a.netPnl)[0] || { session: 'Morning Bell (09:15–11:00)', netPnl: 0 };
      setAiReport({
        zellaScore,
        summary,
        insights: [
          { type: 'edge', title: `A+ Edge: ${bestPb.name}`, metric: `${formatINR(bestPb.netPnl, true)} (${bestPb.winRate}% WR)`, detail: `Highest expectancy strategy in your journal. Prioritize capital allocation here.` },
          { type: 'leak', title: `Primary Behavioral Leak: ${topM.mistake}`, metric: `-${formatINR(topM.lossCost)} (${topM.count} trades)`, detail: `Eliminating tagged mistakes boosts Net P&L from ${formatINR(summary.netPnl)} to ${formatINR(summary.potentialNetPnlWithoutMistakes)}.` },
          { type: 'timing', title: `Golden Trading Hour`, metric: bestSess.session, detail: `Your morning executions vastly outperform post-1 PM trades. Lock terminal after 12:30 PM once target is hit.` },
          { type: 'risk', title: `Zella Score: ${zellaScore.overall}/100`, metric: zellaScore.grade, detail: `Profit Factor ${summary.profitFactor}x with ${summary.rrRatio}:1 Reward-to-Risk ratio.` }
        ],
        coachReply: `### 🏆 TrustPoint Zella AI — Post-Trade Self-Directed Audit\n> **SEBI Compliance Note:** Post-trade historical performance & behavioral analysis only. No forward-looking buy/sell tips.\n\n- **Zella Score:** **${zellaScore.overall}/100** (*${zellaScore.grade}*)\n- **Realized Net P&L:** **${formatINR(summary.netPnl, true)}** across **${summary.totalTrades} trades**\n- **Primary Leak:** **${topM.mistake}** cost you **${formatINR(topM.lossCost)}**.\n- **Counterfactual Clean P&L:** **${formatINR(summary.potentialNetPnlWithoutMistakes, true)}** if unforced errors are eliminated.\n\n#### Process Rules for Next Session:\n1. Focus on **${bestPb.name}** during **09:15–11:30 AM IST**.\n2. Enforce a mandatory **15-minute cooldown** after any stop-loss hit.\n3. Never widen your initial stop-loss or average down in weekly F&O contracts.`
      });
    }
    setAiLoading(false);
  }

  useEffect(() => {
    if (activeTab === 'aicoach' && !aiReport) {
      triggerAiCoach('');
    }
  }, [activeTab, trades.length]);

  async function handleAddTrade(e) {
    e.preventDefault();
    const entryPrice = Number(tradeForm.entry_price);
    const exitPrice = Number(tradeForm.exit_price);
    const quantity = Number(tradeForm.quantity);
    const autoTax = window.calculateClientIndianTaxes
      ? window.calculateClientIndianTaxes({ segment: tradeForm.segment, direction: tradeForm.direction, entryPrice, exitPrice, quantity })
      : { totalTaxes: 95 };
    const finalFees = tradeForm.fees !== '' && Number(tradeForm.fees) > 0 ? Number(tradeForm.fees) : autoTax.totalTaxes;

    const payload = {
      ...tradeForm,
      account_id: tradeForm.account_id || (selectedAccount !== 'ALL' ? selectedAccount : 'Main F&O'),
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      stop_loss: Number(tradeForm.stop_loss) || 0,
      target_price: Number(tradeForm.target_price) || 0,
      fees: finalFees,
      tax_breakdown: autoTax
    };

    try {
      const res = await fetch('/api/journal/trades', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Local fallback');
      await loadJournalData();
      setShowAddTradeModal(false);
      showNotification(`Trade ${payload.symbol} logged with Indian statutory tax breakdown!`);
    } catch (_) {
      const dir = payload.direction.toUpperCase();
      const pts = dir === 'SHORT' ? (payload.entry_price - payload.exit_price) : (payload.exit_price - payload.entry_price);
      const grossPnl = Number((pts * payload.quantity).toFixed(2));
      const netPnl = Number((grossPnl - payload.fees).toFixed(2));
      const risk = payload.stop_loss > 0 ? Math.abs(payload.entry_price - payload.stop_loss) * payload.quantity : Math.max(payload.entry_price * payload.quantity * 0.015, 500);
      const rMultiple = Number((netPnl / risk).toFixed(2));
      const newTrade = { ...payload, id: Date.now(), gross_pnl: grossPnl, net_pnl: netPnl, r_multiple: rMultiple, status: netPnl >= 0 ? 'WIN' : 'LOSS' };
      const updated = [newTrade, ...trades];
      localStorage.setItem(`tp_zella_trades_${currentUserId}`, JSON.stringify(updated));
      setTrades(updated);
      setAnalytics(computeClientAnalytics(updated, playbooks));
      setShowAddTradeModal(false);
      showNotification(`Trade ${payload.symbol} saved!`);
    }
  }

  async function handleUpdateTrade(e) {
    if (e && e.preventDefault) e.preventDefault();
    if (!selectedTrade || !editTradeForm) return;
    const entryPrice = Number(editTradeForm.entry_price);
    const exitPrice = Number(editTradeForm.exit_price);
    const quantity = Number(editTradeForm.quantity);
    const autoTax = window.calculateClientIndianTaxes
      ? window.calculateClientIndianTaxes({ segment: editTradeForm.segment, direction: editTradeForm.direction, entryPrice, exitPrice, quantity })
      : { totalTaxes: Number(editTradeForm.fees) || 95 };
    const finalFees = editTradeForm.fees !== '' && Number(editTradeForm.fees) >= 0 ? Number(editTradeForm.fees) : autoTax.totalTaxes;

    const payload = {
      ...selectedTrade,
      ...editTradeForm,
      entry_price: entryPrice,
      exit_price: exitPrice,
      quantity,
      stop_loss: Number(editTradeForm.stop_loss) || 0,
      target_price: Number(editTradeForm.target_price) || 0,
      fees: finalFees,
      tax_breakdown: autoTax
    };

    try {
      const res = await fetch(`/api/journal/trades/${selectedTrade.id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Local update fallback');
      const out = await res.json();
      await loadJournalData();
      setSelectedTrade(out.trade || payload);
      setIsEditingTrade(false);
      showNotification(`Updated ${payload.symbol} & recalculated R-Multiple + Statutory Taxes!`);
    } catch (_) {
      const dir = (payload.direction || 'LONG').toUpperCase();
      const pts = dir === 'SHORT' ? (entryPrice - exitPrice) : (exitPrice - entryPrice);
      const grossPnl = Number((pts * quantity).toFixed(2));
      const netPnl = Number((grossPnl - finalFees).toFixed(2));
      const risk = payload.stop_loss > 0 ? Math.abs(entryPrice - payload.stop_loss) * quantity : Math.max(entryPrice * quantity * 0.015, 500);
      const rMultiple = Number((netPnl / risk).toFixed(2));
      const updatedTrade = { ...payload, gross_pnl: grossPnl, net_pnl: netPnl, r_multiple: rMultiple, status: netPnl >= 0 ? 'WIN' : 'LOSS' };
      const updatedList = trades.map(t => t.id === selectedTrade.id ? updatedTrade : t);
      localStorage.setItem(`tp_zella_trades_${currentUserId}`, JSON.stringify(updatedList));
      setTrades(updatedList);
      setAnalytics(computeClientAnalytics(updatedList, playbooks));
      setSelectedTrade(updatedTrade);
      setIsEditingTrade(false);
      showNotification(`Updated ${payload.symbol}!`);
    }
  }

  async function handleSaveBacktestTrade(btTrade) {
    try {
      const res = await fetch('/api/journal/trades', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...btTrade, account_id: selectedAccount !== 'ALL' ? selectedAccount : 'Prop / Challenge' })
      });
      if (!res.ok) throw new Error('Local fallback');
      await loadJournalData();
      showNotification(`Backtest trade on ${btTrade.symbol} logged to Journal!`);
    } catch (_) {
      const updated = [{ ...btTrade, id: Date.now() }, ...trades];
      localStorage.setItem(`tp_zella_trades_${currentUserId}`, JSON.stringify(updated));
      setTrades(updated);
      setAnalytics(computeClientAnalytics(updated, playbooks));
      showNotification(`Backtest trade logged!`);
    }
  }

  async function handleClearAllTrades() {
    try {
      const res = await fetch('/api/journal/clear', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ account_id: selectedAccount })
      });
      if (!res.ok) throw new Error('Local clear');
      await loadJournalData();
      setAiReport(null);
      showNotification('Journal cleared to 0 trades! Ready for your live executions.');
    } catch (_) {
      localStorage.setItem(`tp_zella_trades_${currentUserId}`, JSON.stringify([]));
      setTrades([]);
      setAnalytics(computeClientAnalytics([], playbooks));
      setAiReport(null);
      showNotification('Journal cleared to 0 trades!');
    }
  }

  async function handleResetDemoData() {
    try {
      const res = await fetch('/api/journal/reset', {
        method: 'POST',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Local reset');
      await loadJournalData();
      setAiReport(null);
      showNotification('Institutional demo trades restored!');
    } catch (_) {
      localStorage.removeItem(`tp_zella_trades_${currentUserId}`);
      setTrades(FALLBACK_TRADES);
      setAnalytics(computeClientAnalytics(FALLBACK_TRADES, playbooks));
      showNotification('Institutional demo trades restored!');
    }
  }

  function handleScreenshotFileUpload(e, targetIsInspector = false) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = String(ev.target.result || '');
      if (targetIsInspector && selectedTrade) {
        const updatedTrade = { ...selectedTrade, chart_url: dataUrl };
        setSelectedTrade(updatedTrade);
        if (editTradeForm) setEditTradeForm({ ...editTradeForm, chart_url: dataUrl });
        try {
          await fetch(`/api/journal/trades/${selectedTrade.id}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(updatedTrade)
          });
          await loadJournalData();
        } catch (_) {}
        showNotification('Chart screenshot attached to trade!');
      } else {
        setTradeForm(prev => ({ ...prev, chart_url: dataUrl }));
        showNotification('Chart screenshot attached to new trade form!');
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleDeleteTrade(id) {
    try {
      const res = await fetch(`/api/journal/trades/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error('Local fallback');
      setSelectedTrade(null);
      await loadJournalData();
      showNotification('Trade removed from journal.');
    } catch (_) {
      const updated = trades.filter(t => t.id !== id);
      localStorage.setItem(`tp_zella_trades_${currentUserId}`, JSON.stringify(updated));
      setTrades(updated);
      setAnalytics(computeClientAnalytics(updated, playbooks));
      setSelectedTrade(null);
      showNotification('Trade removed.');
    }
  }

  const [selectedBroker, setSelectedBroker] = useState('Angel One SmartAPI');
  const [brokerClientId, setBrokerClientId] = useState('');
  const [brokerApiKey, setBrokerApiKey] = useState('');
  const [brokerPassword, setBrokerPassword] = useState('');
  const [brokerTotp, setBrokerTotp] = useState('');
  const [brokerToken, setBrokerToken] = useState('');
  const [brokerSyncLoading, setBrokerSyncLoading] = useState(false);
  const [brokerSyncError, setBrokerSyncError] = useState('');

  async function handleLiveBrokerSync() {
    setBrokerSyncError('');
    setBrokerSyncLoading(true);
    try {
      const res = await fetch('/api/journal/broker-sync', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          broker: selectedBroker,
          clientId: brokerClientId.trim(),
          apiKey: brokerApiKey.trim(),
          password: brokerPassword.trim(),
          totp: brokerTotp.trim(),
          accessToken: brokerToken.trim(),
          account_id: selectedAccount !== 'ALL' ? selectedAccount : 'Main F&O'
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setBrokerSyncError(data.error || `Could not authenticate with ${selectedBroker}. Check your API credentials.`);
        setBrokerSyncLoading(false);
        return;
      }
      if (data.planTier) {
        setUserPlan(data.planTier);
        localStorage.setItem('tp_zella_plan', data.planTier);
      }
      await loadJournalData();
      setShowImportModal(false);
      setBrokerSyncLoading(false);
      showNotification(data.message || `Synced ${data.imported} live trade(s) from ${selectedBroker}!`);
    } catch (err) {
      setBrokerSyncError(err.message || 'Network error while reaching broker API gateway.');
      setBrokerSyncLoading(false);
    }
  }

  async function handleSimulateAngelOneSync(brokerOverride) {
    const activeBroker = typeof brokerOverride === 'string' ? brokerOverride : selectedBroker;
    let partnerNote = '';

    // If the user typed an Angel One Client ID in the Broker Sync box, check if it's mapped under our Partner Tag!
    if (brokerClientId.trim()) {
      try {
        const vRes = await fetch('/api/journal/verify-partner', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ clientId: brokerClientId.trim() })
        });
        const vData = await vRes.json();
        if (vData && vData.partnerVerified) {
          setUserPlan('PARTNER_PRO');
          localStorage.setItem('tp_zella_plan', 'PARTNER_PRO');
          partnerNote = ` ✅ Verified TrustPoint Partner Client (${brokerClientId.trim().toUpperCase()}) — Unlimited Pro Active!`;
        } else {
          setUserPlan('FREE_STARTER');
          localStorage.setItem('tp_zella_plan', 'FREE_STARTER');
          partnerNote = ` ⚠️ ID "${brokerClientId.trim().toUpperCase()}" is not mapped under TrustPoint Finance (Free Starter 30-trade limit applies).`;
        }
      } catch (_) {}
    }

    const syncTrades = [
      {
        symbol: 'NIFTY 25450 CE',
        segment: 'NSE F&O',
        direction: 'LONG',
        account_id: selectedAccount !== 'ALL' ? selectedAccount : 'Main F&O',
        entry_date: '2026-10-19T10:12:00',
        exit_date: '2026-10-19T11:05:00',
        entry_price: 138.0,
        exit_price: 196.0,
        quantity: 150,
        stop_loss: 115.0,
        target_price: 195.0,
        fees: 112.0,
        playbook_id: 'pb-orb-15m',
        setup_tag: `${activeBroker} Sync`,
        mistakes: [],
        emotion_tag: 'Focused & Calm',
        rating: 5,
        mae: -5.0,
        mfe: 64.0,
        broker: activeBroker,
        notes: `[SANDBOX SAMPLE] Auto-synced via ${activeBroker}${brokerClientId ? ` (Account: ${brokerClientId})` : ''}. Clean 2.5R momentum continuation.`
      },
      {
        symbol: 'SBIN',
        segment: 'NSE Equity',
        direction: 'LONG',
        account_id: selectedAccount !== 'ALL' ? selectedAccount : 'Main F&O',
        entry_date: '2026-10-18T09:50:00',
        exit_date: '2026-10-18T14:15:00',
        entry_price: 812.0,
        exit_price: 829.5,
        quantity: 400,
        stop_loss: 804.0,
        target_price: 830.0,
        fees: 95.0,
        playbook_id: 'pb-vwap-pullback',
        setup_tag: 'VWAP Pullback',
        mistakes: [],
        emotion_tag: 'Disciplined',
        rating: 5,
        mae: -1.8,
        mfe: 19.0,
        broker: activeBroker,
        notes: `[SANDBOX SAMPLE] PSU Bank strength breakout synced from ${activeBroker} terminal.`
      }
    ];

    try {
      const res = await fetch('/api/journal/trades/import', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ broker: activeBroker, trades: syncTrades })
      });
      if (!res.ok) throw new Error('Local fallback');
      await loadJournalData();
      setShowImportModal(false);
      showNotification(`Loaded 2 sample sandbox trades for ${activeBroker}!${partnerNote}`);
    } catch (_) {
      showNotification(`Loaded sample sandbox trades for ${activeBroker}!${partnerNote}`);
      setShowImportModal(false);
    }
  }

  function handleCsvFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = String(ev.target.result || '');
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length < 2) {
        showNotification('CSV file is empty or invalid.', 'error');
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/^"|"$/g, ''));
      const rawRows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        if (cols.length < 3) continue;
        const row = {};
        headers.forEach((h, idx) => { row[h] = cols[idx]; });
        const symbol = row.symbol || row.tradingsymbol || row.instrument || row.scrip || row.ticker || cols[0];
        if (!symbol) continue;

        const hasBothPrices = (row.entry_price || row.buy_price) && (row.exit_price || row.sell_price);
        if (hasBothPrices) {
          const entry = parseFloat(row.entry_price || row.buy_price) || 150;
          const exit = parseFloat(row.exit_price || row.sell_price) || 160;
          const qty = parseFloat(row.quantity || row.qty || row.lots || 100) || 100;
          const dir = (row.direction || row.type || 'LONG').toUpperCase().includes('SHORT') ? 'SHORT' : 'LONG';
          const dateStr = row.entry_date || row.date || '2026-10-16T09:45:00';
          rawRows.push({
            symbol,
            segment: symbol.includes('CE') || symbol.includes('PE') || symbol.includes('FUT') ? 'NSE F&O' : 'NSE Equity',
            direction: dir,
            entry_date: dateStr.includes('T') ? dateStr : `${dateStr.slice(0, 10)}T09:45:00`,
            exit_date: dateStr.includes('T') ? dateStr : `${dateStr.slice(0, 10)}T11:30:00`,
            entry_price: entry,
            exit_price: exit,
            quantity: qty,
            stop_loss: parseFloat(row.stop_loss || 0) || Number((entry * 0.98).toFixed(2)),
            target_price: parseFloat(row.target_price || 0) || Number((entry * 1.04).toFixed(2)),
            fees: parseFloat(row.fees || row.brokerage || 60) || 60,
            broker: selectedBroker,
            notes: `Imported from ${file.name} (${selectedBroker})`
          });
        } else {
          // Single-leg execution row (Zerodha Kite, Angel One, Dhan, Upstox raw tradebook)
          rawRows.push({
            symbol,
            side: row.trade_type || row.transaction_type || row.buy_sell || row.side || row.type || cols[1] || 'BUY',
            quantity: parseFloat(row.quantity || row.qty || row.filled_quantity || cols[2] || 100) || 100,
            price: parseFloat(row.price || row.average_price || row.trade_price || cols[3] || 150) || 150,
            time: row.order_execution_time || row.trade_date || row.time || row.date || '2026-10-16T09:45:00',
            broker: selectedBroker
          });
        }
      }
      if (rawRows.length === 0) {
        showNotification('Could not parse rows from CSV.', 'error');
        return;
      }
      try {
        const res = await fetch('/api/journal/trades/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ broker: selectedBroker, trades: rawRows })
        });
        if (res.ok) {
          const out = await res.json();
          await loadJournalData();
          setShowImportModal(false);
          showNotification(`Successfully imported & auto-paired ${out.imported || rawRows.length} trade(s) from ${selectedBroker}!`);
        }
      } catch (_) {
        showNotification(`Parsed ${rawRows.length} rows!`);
      }
    };
    reader.readAsText(file);
  }

  async function handleCreatePlaybook(e) {
    e.preventDefault();
    const payload = {
      name: playbookForm.name,
      description: playbookForm.description,
      market_condition: playbookForm.market_condition,
      color: playbookForm.color,
      entry_rules: playbookForm.entry_rules_text.split('\n').map(s => s.trim()).filter(Boolean),
      exit_rules: playbookForm.exit_rules_text.split('\n').map(s => s.trim()).filter(Boolean),
      risk_rules: playbookForm.risk_rules_text.split('\n').map(s => s.trim()).filter(Boolean)
    };
    try {
      const res = await fetch('/api/journal/playbooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Local fallback');
      await loadJournalData();
      setShowAddPlaybookModal(false);
      showNotification(`Playbook "${payload.name}" created!`);
    } catch (_) {
      const newPb = { ...payload, id: 'pb-' + Date.now() };
      const updated = [...playbooks, newPb];
      setPlaybooks(updated);
      setAnalytics(computeClientAnalytics(trades, updated));
      setShowAddPlaybookModal(false);
      showNotification(`Playbook "${payload.name}" saved!`);
    }
  }

  async function handleCreateNote(e) {
    e.preventDefault();
    if (!noteForm.title || !noteForm.content) return;
    try {
      const res = await fetch('/api/journal/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(noteForm)
      });
      if (!res.ok) throw new Error('Fallback');
      await loadJournalData();
      setNoteForm({ ...noteForm, title: '', content: '', lessons_learned: '' });
      showNotification('Session journal note saved!');
    } catch (_) {
      const updated = [{ ...noteForm, id: Date.now() }, ...notes];
      setNotes(updated);
      setNoteForm({ ...noteForm, title: '', content: '', lessons_learned: '' });
      showNotification('Session journal note saved!');
    }
  }

  // Filtered trades for Trade Log
  const filteredTrades = useMemo(() => {
    return trades.filter(t => {
      if (filterSegment !== 'ALL' && t.segment !== filterSegment) return false;
      if (filterStatus !== 'ALL' && t.status !== filterStatus) return false;
      if (filterPlaybook !== 'ALL' && t.playbook_id !== filterPlaybook) return false;
      if (filterMistake !== 'ALL') {
        const m = Array.isArray(t.mistakes) ? t.mistakes : [];
        if (!m.includes(filterMistake)) return false;
      }
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchSym = (t.symbol || '').toLowerCase().includes(q);
        const matchSetup = (t.setup_tag || '').toLowerCase().includes(q);
        const matchNotes = (t.notes || '').toLowerCase().includes(q);
        if (!matchSym && !matchSetup && !matchNotes) return false;
      }
      return true;
    });
  }, [trades, filterSegment, filterStatus, filterPlaybook, filterMistake, searchQuery]);

  // Calendar grid builder for selected YYYY-MM
  const calendarData = useMemo(() => {
    const [yrStr, moStr] = calendarMonth.split('-');
    const year = parseInt(yrStr, 10) || 2026;
    const monthIdx = (parseInt(moStr, 10) || 10) - 1;
    const firstDay = new Date(year, monthIdx, 1);
    const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    const startWeekday = firstDay.getDay(); // 0 = Sun ... 6 = Sat

    const cells = [];
    for (let i = 0; i < startWeekday; i++) {
      cells.push({ empty: true, key: `empty-start-${i}` });
    }
    let monthlyNet = 0;
    let monthlyTrades = 0;
    let greenDays = 0;
    let redDays = 0;

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayStat = analytics.dailyCalendar && analytics.dailyCalendar[dateStr] ? analytics.dailyCalendar[dateStr] : null;
      if (dayStat) {
        monthlyNet += dayStat.netPnl;
        monthlyTrades += dayStat.trades;
        if (dayStat.netPnl > 0) greenDays++;
        if (dayStat.netPnl < 0) redDays++;
      }
      cells.push({
        empty: false,
        day: d,
        dateStr,
        stat: dayStat
      });
    }

    // Group into weeks of 7 for Weekly TradeZella Sidebar
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      const slice = cells.slice(i, i + 7);
      const weekPnl = slice.reduce((s, c) => s + (c.stat ? c.stat.netPnl : 0), 0);
      const weekTrades = slice.reduce((s, c) => s + (c.stat ? c.stat.trades : 0), 0);
      const activeDays = slice.filter(c => c.stat && c.stat.trades > 0).length;
      weeks.push({ weekNum: weeks.length + 1, cells: slice, weekPnl, weekTrades, activeDays });
    }

    return { year, monthIdx, weeks, monthlyNet, monthlyTrades, greenDays, redDays };
  }, [calendarMonth, analytics]);

  const { summary, zellaScore, mistakesBreakdown, playbookStats, sessionBreakdown } = analytics;

  return (
    <div className="min-h-screen flex flex-col bg-[#090D16] text-slate-100">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-sm font-medium transition-all ${
          toast.type === 'error' ? 'bg-rose-950/95 border-rose-500 text-rose-200' : 'bg-indigo-950/95 border-indigo-500 text-indigo-100'
        }`}>
          <i className={`fa-solid ${toast.type === 'error' ? 'fa-circle-exclamation text-rose-400' : 'fa-circle-check text-emerald-400'}`}></i>
          <span>{toast.msg}</span>
        </div>
      )}

      {/* Top Institutional Navbar */}
      <header className="sticky top-0 z-30 bg-[#0D1322]/90 backdrop-blur-md border-b border-[#222F49] px-4 lg:px-8 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          {/* Brand + Back Links */}
          <div className="flex items-center gap-6">
            <a href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <i className="fa-solid fa-bolt text-white text-lg"></i>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-extrabold text-lg tracking-tight text-white">TrustPoint</span>
                  <span className="font-display font-extrabold text-lg tracking-tight zella-gradient-text">ZELLA</span>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">AI Journal</span>
                </div>
                <p className="text-[11px] text-slate-400">Institutional Trade Analytics & Behavioral Coach</p>
              </div>
            </a>

            <div className="hidden xl:flex items-center gap-4 text-xs text-slate-400 border-l border-slate-800 pl-5">
              <a href="/" className="hover:text-white transition flex items-center gap-1.5">
                <i className="fa-solid fa-house text-[10px]"></i> Home
              </a>
              <a href="/academy/" className="hover:text-white transition flex items-center gap-1.5">
                <i className="fa-solid fa-graduation-cap text-[10px]"></i> Academy
              </a>
              <a href="/dashboard/" className="hover:text-white transition flex items-center gap-1.5">
                <i className="fa-solid fa-chart-pie text-[10px]"></i> Wealth Terminal
              </a>
            </div>
          </div>

          {/* Primary Module Tabs */}
          <nav className="flex items-center gap-1 bg-[#111726] p-1 rounded-xl border border-[#222F49] overflow-x-auto max-w-full">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line' },
              { id: 'calendar', label: 'P&L Calendar', icon: 'fa-calendar-days' },
              { id: 'tradelog', label: 'Trade Log & Replay', icon: 'fa-table-list' },
              { id: 'reports', label: 'Deep Reports & Taxes', icon: 'fa-chart-pie' },
              { id: 'backtester', label: 'Backtester', icon: 'fa-forward-fast' },
              { id: 'playbooks', label: 'Playbooks', icon: 'fa-book-open' },
              { id: 'sizer', label: 'Position Sizer (REA)', icon: 'fa-calculator' },
              { id: 'aicoach', label: 'Zella AI Coach', icon: 'fa-wand-magic-sparkles' },
              { id: 'notebook', label: 'Daily Notebook', icon: 'fa-pen-to-square' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'zella-btn-primary text-white shadow'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <i className={`fa-solid ${tab.icon}`}></i>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Account Switcher, Fresh Reset & Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* 1-Click Email / Mobile Login Button */}
            <button
              onClick={() => setShowAuthModal(true)}
              title="Sign in with Email or Mobile Number"
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#111726] hover:bg-slate-800 text-slate-200 border border-[#222F49] flex items-center gap-1.5 transition"
            >
              <i className="fa-solid fa-user-check text-indigo-400"></i>
              <span>{userProfile && userProfile.name ? userProfile.name : 'Sign In (Email/Phone)'}</span>
            </button>

            {/* Multi-Account Switcher */}
            <select
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
              title="Switch Trading Account Portfolio"
              className="bg-[#111726] border border-[#222F49] rounded-xl px-2.5 py-2 text-xs text-slate-200 font-mono"
            >
              <option value="ALL">All Accounts ({trades.length})</option>
              <option value="Main F&O">Main F&O Account</option>
              <option value="Swing Equity">Swing Equity Account</option>
              <option value="Prop / Challenge">Prop / Backtest Account</option>
            </select>

            {/* Clear Demo Data / Start Fresh 0 Trades */}
            {trades.length > 0 ? (
              <button
                onClick={handleClearAllTrades}
                title="Wipe demo trades to 0 and start fresh with your own trades"
                className="px-2.5 py-2 rounded-xl text-[11px] font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition"
              >
                <i className="fa-solid fa-broom"></i>
                <span className="hidden sm:inline">Start Fresh (0)</span>
              </button>
            ) : (
              <button
                onClick={handleResetDemoData}
                title="Load Institutional Sample Trades"
                className="px-2.5 py-2 rounded-xl text-[11px] font-semibold bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition"
              >
                <i className="fa-solid fa-database"></i>
                <span>Load Demo Data</span>
              </button>
            )}

            {/* Freemium & Angel One Partner Unlock */}
            <button
              onClick={() => setShowPricingModal(true)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
                userPlan === 'PARTNER_PRO'
                  ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/30'
              }`}
            >
              <i className="fa-solid fa-crown text-amber-400"></i>
              <span className="hidden md:inline">{userPlan === 'PARTNER_PRO' ? 'Partner Pro ✓' : `Free Tier (${trades.length}/30)`}</span>
            </button>

            <button
              onClick={() => { setBrokerSyncError(''); setShowImportModal(true); }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#161E31] hover:bg-[#1E2942] text-slate-200 border border-[#222F49] flex items-center gap-2 transition"
            >
              <i className="fa-solid fa-cloud-arrow-up text-emerald-400"></i>
              <span>Live Broker Sync</span>
            </button>
            <button
              onClick={() => setShowAddTradeModal(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold zella-btn-primary text-white flex items-center gap-1.5 shadow-lg"
            >
              <i className="fa-solid fa-plus"></i>
              <span>Add Trade</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 lg:px-8 py-6 space-y-6">

        {/* ════════════════════════════════════════════════════════════════════
            TAB 1: DASHBOARD & ZELLA SCORE
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Row: 5 TradeZella Signature KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Net P&L */}
              <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Net Realized P&L</span>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${summary.netPnl >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                    <i className="fa-solid fa-indian-rupee-sign"></i>
                  </span>
                </div>
                <div className={`text-2xl font-display font-extrabold mt-2 font-mono ${summary.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatINR(summary.netPnl, true)}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span>Gross Win: <strong className="text-emerald-400">{formatINR(summary.grossProfit)}</strong></span>
                  <span>Fees: <strong className="text-slate-300">{formatINR(summary.totalFees)}</strong></span>
                </div>
              </div>

              {/* Win Rate % */}
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Trade Win %</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300">
                    {summary.totalTrades} Trades
                  </span>
                </div>
                <div className="flex items-baseline gap-3 mt-2">
                  <span className="text-2xl font-display font-extrabold text-white font-mono">{summary.winRate}%</span>
                  <span className="text-xs text-emerald-400 font-mono">{summary.winCount}W</span>
                  <span className="text-xs text-rose-400 font-mono">{summary.lossCount}L</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 mt-3.5 overflow-hidden flex">
                  <div style={{ width: `${summary.winRate}%` }} className="bg-emerald-500 h-full"></div>
                  <div style={{ width: `${100 - summary.winRate}%` }} className="bg-rose-500 h-full"></div>
                </div>
              </div>

              {/* Profit Factor */}
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Profit Factor</span>
                  <span className="w-8 h-8 rounded-lg bg-purple-500/15 text-purple-400 flex items-center justify-center">
                    <i className="fa-solid fa-scale-balanced"></i>
                  </span>
                </div>
                <div className="text-2xl font-display font-extrabold text-white mt-2 font-mono">
                  {summary.profitFactor}x
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span>Expectancy: <strong className="text-indigo-300">{formatINR(summary.expectancy, true)}/trade</strong></span>
                </div>
              </div>

              {/* Avg Win / Avg Loss & R-Multiple */}
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Avg R-Multiple & R:R</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
                    {summary.rrRatio}:1 R:R
                  </span>
                </div>
                <div className="text-2xl font-display font-extrabold text-indigo-300 mt-2 font-mono">
                  {summary.avgRMultiple > 0 ? `+${summary.avgRMultiple}R` : `${summary.avgRMultiple}R`}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400">
                  <span>Avg Win: <strong className="text-emerald-400">{formatINR(summary.avgWin)}</strong></span>
                  <span>Avg Loss: <strong className="text-rose-400">-{formatINR(summary.avgLoss)}</strong></span>
                </div>
              </div>

              {/* Zella Score Badge Card */}
              <div className="glass-card rounded-2xl p-5 border-indigo-500/40 bg-gradient-to-br from-indigo-950/50 to-[#111726]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Zella Edge Score</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                    6-Factor AI
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-display font-extrabold zella-gradient-text font-mono">{zellaScore.overall}</span>
                  <span className="text-xs text-slate-400">/ 100</span>
                </div>
                <div className="mt-3 pt-3 border-t border-indigo-500/20 text-[11px] text-indigo-200 flex items-center justify-between">
                  <span>{zellaScore.grade}</span>
                  <button onClick={() => setActiveTab('aicoach')} className="text-emerald-400 hover:underline font-semibold">
                    AI Audit →
                  </button>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <PerformanceCharts equityCurve={analytics.equityCurve} />

            {/* Middle Row: 6-Dimension Zella Score Breakdown + Behavioral Mistake Cost Simulator + Session Edge */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* 1. Zella Score 6-Factor Breakdown */}
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                      <i className="fa-solid fa-compass-drafting text-indigo-400"></i> Zella Score 6-Factor Matrix
                    </h3>
                    <p className="text-xs text-slate-400">Institutional quantitative edge evaluation</p>
                  </div>
                  <span className="text-lg font-mono font-bold text-indigo-300">{zellaScore.overall}/100</span>
                </div>
                <div className="space-y-3.5">
                  {zellaScore.dimensions.map(dim => (
                    <div key={dim.key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-300 font-medium">{dim.label}</span>
                        <span className="font-mono text-slate-400">
                          <strong className="text-white">{dim.rawValue}</strong> ({dim.score}/100)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${dim.score}%` }}
                          className={`h-full rounded-full ${
                            dim.score >= 75 ? 'bg-gradient-to-r from-indigo-500 to-emerald-400' : dim.score >= 55 ? 'bg-indigo-500' : 'bg-amber-500'
                          }`}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Behavioral Mistake Leak Detector ("What-If Clean Execution") */}
              <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                        <i className="fa-solid fa-triangle-exclamation text-rose-400"></i> Cost of Mistakes (Leak Detector)
                      </h3>
                      <p className="text-xs text-slate-400">Capital lost to tagged psychological errors</p>
                    </div>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      -{formatINR(summary.totalMistakeCost)} Leak
                    </span>
                  </div>

                  {mistakesBreakdown.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 text-xs">Zero behavioral mistakes logged!</div>
                  ) : (
                    <div className="space-y-2.5">
                      {mistakesBreakdown.slice(0, 4).map(m => (
                        <div key={m.mistake} className="flex items-center justify-between p-2.5 rounded-xl bg-[#0D1322] border border-slate-800/80">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                            <div>
                              <div className="text-xs font-semibold text-slate-200">{m.mistake}</div>
                              <div className="text-[11px] text-slate-500">{m.count} trade(s) affected</div>
                            </div>
                          </div>
                          <div className="text-right font-mono text-xs font-bold text-rose-400">
                            -{formatINR(m.lossCost)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/70 to-emerald-950/50 border border-emerald-500/30">
                  <div className="text-[11px] uppercase tracking-wider text-emerald-300 font-semibold">
                    <i className="fa-solid fa-wand-magic-sparkles mr-1"></i> What-If You Eliminated Mistakes:
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="text-xs text-slate-300">Projected Clean Net P&L:</span>
                    <span className="text-lg font-mono font-extrabold text-emerald-400">
                      {formatINR(summary.potentialNetPnlWithoutMistakes, true)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Time-of-Day Session & Playbook Leaderboard */}
              <div className="glass-card rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <h3 className="font-display font-bold text-base text-white flex items-center gap-2 mb-1">
                    <i className="fa-solid fa-clock text-amber-400"></i> Session & Time-of-Day Edge
                  </h3>
                  <p className="text-xs text-slate-400 mb-4">IST Market Hours Performance Breakdown</p>

                  <div className="space-y-2.5">
                    {sessionBreakdown.map(s => {
                      const wr = s.trades > 0 ? Math.round((s.wins / s.trades) * 100) : 0;
                      return (
                        <div key={s.session} className="p-3 rounded-xl bg-[#0D1322] border border-slate-800/80 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-semibold text-white">{s.session}</div>
                            <div className="text-[11px] text-slate-400">{s.trades} trades • {wr}% Win Rate</div>
                          </div>
                          <div className={`font-mono text-sm font-bold ${s.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatINR(s.netPnl, true)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Max Account Drawdown: <strong className="text-rose-400">-{formatINR(summary.maxDrawdown)}</strong></span>
                  <button onClick={() => setActiveTab('calendar')} className="text-indigo-400 hover:text-indigo-300 font-semibold">
                    Open P&L Calendar →
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 2: CALENDAR P&L HEATMAP (TRADEZELLA SIGNATURE VIEW)
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'calendar' && (
          <div className="space-y-5">
            <div className="glass-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-bold text-xl text-white flex items-center gap-2.5">
                  <i className="fa-solid fa-calendar-check text-indigo-400"></i> TradeZella Monthly P&L Heatmap Calendar
                </h2>
                <p className="text-xs text-slate-400">Click any active trading day to inspect individual executions, mistakes, and session notes</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 bg-[#0D1322] px-4 py-2 rounded-xl border border-slate-800 text-xs">
                  <span>Monthly Net: <strong className={`font-mono ${calendarData.monthlyNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatINR(calendarData.monthlyNet, true)}</strong></span>
                  <span className="text-slate-600">|</span>
                  <span>Green Days: <strong className="text-emerald-400 font-mono">{calendarData.greenDays}</strong></span>
                  <span className="text-slate-600">|</span>
                  <span>Red Days: <strong className="text-rose-400 font-mono">{calendarData.redDays}</strong></span>
                </div>

                <input
                  type="month"
                  value={calendarMonth}
                  onChange={e => setCalendarMonth(e.target.value)}
                  className="bg-[#161E31] border border-[#222F49] rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
              {/* 7-Column Calendar Grid */}
              <div className="xl:col-span-3 glass-card rounded-2xl p-5">
                <div className="grid grid-cols-7 gap-2.5 mb-2.5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
                </div>

                <div className="space-y-2.5">
                  {calendarData.weeks.map(week => (
                    <div key={week.weekNum} className="grid grid-cols-7 gap-2.5">
                      {week.cells.map((cell, idx) => {
                        if (cell.empty) {
                          return <div key={cell.key || idx} className="calendar-cell rounded-xl bg-[#0B101B]/40 border border-slate-900/50"></div>;
                        }
                        const st = cell.stat;
                        const isWin = st && st.netPnl > 0;
                        const isLoss = st && st.netPnl < 0;
                        return (
                          <div
                            key={cell.dateStr}
                            onClick={() => st && setSelectedDayModal(cell)}
                            className={`calendar-cell rounded-xl p-2.5 border flex flex-col justify-between cursor-pointer ${
                              isWin
                                ? 'bg-emerald-950/35 border-emerald-500/40 hover:bg-emerald-950/55'
                                : isLoss
                                ? 'bg-rose-950/35 border-rose-500/40 hover:bg-rose-950/55'
                                : 'bg-[#0D1322]/70 border-slate-800/70 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono text-slate-400">{cell.day}</span>
                              {st && st.mistakesCount > 0 && (
                                <span title={`${st.mistakesCount} mistake(s) tagged`} className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono">
                                  !{st.mistakesCount}
                                </span>
                              )}
                            </div>

                            {st ? (
                              <div className="my-1">
                                <div className={`text-sm font-mono font-extrabold ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {formatINR(st.netPnl, true)}
                                </div>
                                <div className="flex items-center justify-between text-[10px] text-slate-300 mt-1 font-mono">
                                  <span>{st.trades} {st.trades === 1 ? 'trade' : 'trades'}</span>
                                  <span>{st.rMultiple > 0 ? `+${st.rMultiple}R` : `${st.rMultiple}R`}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="text-[11px] text-slate-600 font-mono self-center my-auto">—</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Breakdown Sidebar (TradeZella Right Column) */}
              <div className="glass-card rounded-2xl p-5 space-y-3">
                <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <i className="fa-solid fa-layer-group text-indigo-400"></i> Weekly Rollup
                </h3>
                <p className="text-xs text-slate-400">Week-by-week consistency tracker</p>

                <div className="space-y-3 pt-2">
                  {calendarData.weeks.map(w => (
                    <div key={w.weekNum} className="p-3.5 rounded-xl bg-[#0D1322] border border-slate-800 flex items-center justify-between">
                      <div>
                        <div className="text-xs font-semibold text-slate-200">Week {w.weekNum}</div>
                        <div className="text-[11px] text-slate-400">{w.weekTrades} trades • {w.activeDays} active days</div>
                      </div>
                      <div className={`font-mono text-sm font-bold ${w.weekPnl > 0 ? 'text-emerald-400' : w.weekPnl < 0 ? 'text-rose-400' : 'text-slate-500'}`}>
                        {formatINR(w.weekPnl, true)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 3: TRADE LOG & EXECUTION REPLAY INSPECTOR
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'tradelog' && (
          <div className="space-y-5">
            {/* Filter Bar */}
            <div className="glass-card rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="relative">
                  <i className="fa-solid fa-magnifying-glass text-slate-400 text-xs absolute left-3 top-3"></i>
                  <input
                    type="text"
                    placeholder="Search symbol, setup, notes..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-2 rounded-xl bg-[#0D1322] border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500 w-56"
                  />
                </div>

                <select value={filterSegment} onChange={e => setFilterSegment(e.target.value)} className="bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
                  <option value="ALL">All Segments</option>
                  <option value="NSE F&O">NSE F&O (Options/Futures)</option>
                  <option value="NSE Equity">NSE Equity (Cash/Swing)</option>
                </select>

                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
                  <option value="ALL">All Outcomes</option>
                  <option value="WIN">Winners Only</option>
                  <option value="LOSS">Losers Only</option>
                </select>

                <select value={filterPlaybook} onChange={e => setFilterPlaybook(e.target.value)} className="bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
                  <option value="ALL">All Playbooks</option>
                  {playbooks.map(pb => (
                    <option key={pb.id} value={pb.id}>{pb.name}</option>
                  ))}
                </select>

                <select value={filterMistake} onChange={e => setFilterMistake(e.target.value)} className="bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200">
                  <option value="ALL">All Mistake Tags</option>
                  {COMMON_MISTAKES.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="text-xs text-slate-400 font-mono">
                Showing <strong className="text-white">{filteredTrades.length}</strong> of {trades.length} trades
              </div>
            </div>

            {/* Trade Table */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0D1322] border-b border-slate-800 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <th className="py-3.5 px-4">Date & Time</th>
                      <th className="py-3.5 px-4">Symbol & Broker</th>
                      <th className="py-3.5 px-4">Side</th>
                      <th className="py-3.5 px-4">Qty & Entry → Exit</th>
                      <th className="py-3.5 px-4">Playbook / Setup</th>
                      <th className="py-3.5 px-4">Mistakes & Psychology</th>
                      <th className="py-3.5 px-4 text-right">R-Multiple</th>
                      <th className="py-3.5 px-4 text-right">Net P&L</th>
                      <th className="py-3.5 px-4 text-center">Replay</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-xs">
                    {filteredTrades.map(t => {
                      const isWin = Number(t.net_pnl) >= 0;
                      const mistakesArr = Array.isArray(t.mistakes) ? t.mistakes : [];
                      return (
                        <tr
                          key={t.id}
                          onClick={() => setSelectedTrade(t)}
                          className="hover:bg-indigo-500/5 transition cursor-pointer"
                        >
                          <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                            <div>{(t.entry_date || '').slice(0, 10)}</div>
                            <div className="text-[10px] text-slate-500">{(t.entry_date || '').slice(11, 16)} IST</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-white">{t.symbol}</div>
                            <div className="text-[10px] text-slate-400">{t.segment} • {t.broker || 'Angel One'}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              t.direction === 'SHORT' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                            }`}>
                              {t.direction}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                            <div>{t.quantity} qty</div>
                            <div className="text-[11px] text-slate-400">₹{t.entry_price} → ₹{t.exit_price}</div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-[11px] font-medium">
                              {t.setup_tag || 'Discretionary'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1">
                              {mistakesArr.length === 0 ? (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  ✓ Clean Execution
                                </span>
                              ) : (
                                mistakesArr.map(m => (
                                  <span key={m} className="text-[10px] px-2 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                    {m}
                                  </span>
                                ))
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800/90 text-slate-400">
                                {t.emotion_tag}
                              </span>
                            </div>
                          </td>
                          <td className={`py-3.5 px-4 text-right font-mono font-bold ${Number(t.r_multiple) >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
                            {Number(t.r_multiple) > 0 ? `+${t.r_multiple}R` : `${t.r_multiple}R`}
                          </td>
                          <td className={`py-3.5 px-4 text-right font-mono font-extrabold text-sm ${isWin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatINR(t.net_pnl, true)}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <button className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 hover:bg-indigo-500 hover:text-white transition text-[11px]">
                              <i className="fa-solid fa-play mr-1"></i> Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 4: PLAYBOOKS / STRATEGY TRACKER
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'playbooks' && (
          <div className="space-y-5">
            <div className="glass-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-bold text-xl text-white flex items-center gap-2.5">
                  <i className="fa-solid fa-chess-knight text-indigo-400"></i> Institutional Strategy Playbooks
                </h2>
                <p className="text-xs text-slate-400">Track live expectancy, win rate, profit factor, and rule checklists per trading setup</p>
              </div>
              <button
                onClick={() => setShowAddPlaybookModal(true)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold zella-btn-primary text-white flex items-center gap-2"
              >
                <i className="fa-solid fa-plus"></i> New Playbook
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {playbookStats.map(pb => {
                const entryRules = Array.isArray(pb.entry_rules) ? pb.entry_rules : [];
                const exitRules = Array.isArray(pb.exit_rules) ? pb.exit_rules : [];
                const riskRules = Array.isArray(pb.risk_rules) ? pb.risk_rules : [];
                return (
                  <div key={pb.id} className="glass-card rounded-2xl p-6 flex flex-col justify-between border-t-4" style={{ borderTopColor: pb.color || '#6366f1' }}>
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300">
                            {pb.market_condition}
                          </span>
                          <h3 className="font-display font-bold text-lg text-white mt-2">{pb.name}</h3>
                          <p className="text-xs text-slate-400 mt-1">{pb.description}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-mono font-extrabold ${pb.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatINR(pb.netPnl, true)}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{pb.tradesCount} Trades Executed</div>
                        </div>
                      </div>

                      {/* Playbook KPI Strip */}
                      <div className="grid grid-cols-4 gap-2.5 my-4 p-3 rounded-xl bg-[#0D1322] border border-slate-800/80 text-center">
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase">Win Rate</div>
                          <div className="text-sm font-mono font-bold text-emerald-400 mt-0.5">{pb.winRate}%</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase">Profit Factor</div>
                          <div className="text-sm font-mono font-bold text-white mt-0.5">{pb.profitFactor}x</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase">Avg R-Mult</div>
                          <div className="text-sm font-mono font-bold text-indigo-300 mt-0.5">{pb.avgR > 0 ? `+${pb.avgR}R` : `${pb.avgR}R`}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400 uppercase">Expectancy</div>
                          <div className="text-sm font-mono font-bold text-slate-200 mt-0.5">{formatINR(pb.expectancy)}</div>
                        </div>
                      </div>

                      {/* Checklists */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mt-3">
                        <div className="p-3 rounded-xl bg-[#0D1322]/60 border border-slate-800/60">
                          <div className="font-semibold text-indigo-300 mb-1.5 flex items-center gap-1.5">
                            <i className="fa-solid fa-right-to-bracket"></i> Entry Criteria
                          </div>
                          <ul className="space-y-1 text-[11px] text-slate-300">
                            {entryRules.map((r, i) => <li key={i} className="flex items-start gap-1.5"><span className="text-indigo-400">•</span><span>{r}</span></li>)}
                          </ul>
                        </div>
                        <div className="p-3 rounded-xl bg-[#0D1322]/60 border border-slate-800/60">
                          <div className="font-semibold text-emerald-300 mb-1.5 flex items-center gap-1.5">
                            <i className="fa-solid fa-flag-checkered"></i> Exit Plan
                          </div>
                          <ul className="space-y-1 text-[11px] text-slate-300">
                            {exitRules.map((r, i) => <li key={i} className="flex items-start gap-1.5"><span className="text-emerald-400">•</span><span>{r}</span></li>)}
                          </ul>
                        </div>
                        <div className="p-3 rounded-xl bg-[#0D1322]/60 border border-slate-800/60">
                          <div className="font-semibold text-amber-300 mb-1.5 flex items-center gap-1.5">
                            <i className="fa-solid fa-shield-halved"></i> Risk Rules
                          </div>
                          <ul className="space-y-1 text-[11px] text-slate-300">
                            {riskRules.map((r, i) => <li key={i} className="flex items-start gap-1.5"><span className="text-amber-400">•</span><span>{r}</span></li>)}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex justify-between items-center text-xs">
                      <span className="text-slate-400">Playbook ID: <code className="text-slate-300">{pb.id}</code></span>
                      <button
                        onClick={() => { setFilterPlaybook(pb.id); setActiveTab('tradelog'); }}
                        className="text-indigo-400 hover:text-indigo-300 font-semibold"
                      >
                        View {pb.tradesCount} Trades →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 5: ZELLA AI COACH & BEHAVIORAL INSIGHTS
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'aicoach' && (
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border-indigo-500/40 bg-gradient-to-r from-indigo-950/60 via-[#111726] to-emerald-950/40">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    <i className="fa-solid fa-brain mr-1.5"></i> Behavioral & Quantitative Intelligence
                  </span>
                  <h2 className="font-display font-extrabold text-2xl text-white mt-2">
                    TrustPoint Zella AI Performance Coach
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    Automated pattern recognition across your real trade log, R-multiples, time-of-day edge, and psychological tags.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Full Executive Audit', prompt: 'Give me a full executive audit of my trading journal' },
                    { label: 'Audit My Mistakes & FOMO Cost', prompt: 'How much did my mistakes, FOMO, and revenge trading cost me?' },
                    { label: 'Nifty / BankNifty F&O Edge', prompt: 'Analyze my Nifty and BankNifty F&O options performance' },
                    { label: 'Playbook & Tomorrow Gameplan', prompt: 'Compare my playbooks and build my plan for tomorrow' }
                  ].map(btn => (
                    <button
                      key={btn.label}
                      onClick={() => { setAiPrompt(btn.prompt); triggerAiCoach(btn.prompt); }}
                      className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#161E31] hover:bg-indigo-600 text-slate-200 hover:text-white border border-indigo-500/30 transition"
                    >
                      {btn.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 4 Quantitative AI Diagnostic Cards */}
            {aiReport && aiReport.insights && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {aiReport.insights.map((ins, i) => (
                  <div key={i} className="glass-card rounded-2xl p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                          ins.type === 'edge' ? 'bg-emerald-500/15 text-emerald-300' :
                          ins.type === 'leak' ? 'bg-rose-500/15 text-rose-300' :
                          ins.type === 'timing' ? 'bg-amber-500/15 text-amber-300' : 'bg-indigo-500/15 text-indigo-300'
                        }`}>
                          {ins.type}
                        </span>
                      </div>
                      <h4 className="font-display font-bold text-sm text-white">{ins.title}</h4>
                      <div className="text-base font-mono font-extrabold text-indigo-300 my-1.5">{ins.metric}</div>
                      <p className="text-xs text-slate-400 leading-relaxed">{ins.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Interactive AI Coach Console */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2 glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <i className="fa-solid fa-robot"></i>
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-white">Zella AI Coaching Report</h3>
                      <p className="text-[11px] text-slate-400">Grounded on your {summary.totalTrades} closed trades & {playbooks.length} playbooks</p>
                    </div>
                  </div>
                  {aiLoading && <span className="text-xs text-indigo-400 font-mono animate-pulse">Analyzing ledger...</span>}
                </div>

                <div className="prose prose-invert max-w-none text-sm text-slate-200 whitespace-pre-line leading-relaxed bg-[#0D1322] p-5 rounded-xl border border-slate-800/90 font-sans">
                  {aiReport ? aiReport.coachReply : 'Loading your personalized institutional coaching audit...'}
                </div>

                <form
                  onSubmit={e => { e.preventDefault(); triggerAiCoach(aiPrompt); }}
                  className="mt-4 flex gap-2.5"
                >
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="Ask Zella AI Coach anything (e.g., 'Why am I losing in the afternoon?', 'Audit my F&O risk')..."
                    className="flex-1 bg-[#0D1322] border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={aiLoading}
                    className="px-5 py-2.5 rounded-xl text-xs font-semibold zella-btn-primary text-white flex items-center gap-2"
                  >
                    <i className="fa-solid fa-paper-plane"></i> Ask AI Coach
                  </button>
                </form>
              </div>

              {/* Right Column: Rule Compliance & Counterfactual Simulator */}
              <div className="glass-card rounded-2xl p-6 space-y-5">
                <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
                  <i className="fa-solid fa-sliders text-emerald-400"></i> Mistake Eliminator Simulator
                </h3>
                <p className="text-xs text-slate-400">
                  See how your account equity transforms when you eliminate emotional leaks:
                </p>

                <div className="p-4 rounded-xl bg-[#0D1322] border border-slate-800 space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Current Realized P&L:</span>
                    <strong className="font-mono text-white">{formatINR(summary.netPnl, true)}</strong>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Mistake Drawdown Drag:</span>
                    <strong className="font-mono text-rose-400">+{formatINR(summary.totalMistakeCost)}</strong>
                  </div>
                  <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                    <span className="text-xs font-semibold text-emerald-300">Clean Execution Equity:</span>
                    <strong className="font-mono text-xl font-extrabold text-emerald-400">
                      {formatINR(summary.potentialNetPnlWithoutMistakes, true)}
                    </strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-300">Discipline Score Checklist:</div>
                  <div className="p-3 rounded-xl bg-[#0D1322] border border-slate-800 text-xs flex items-center justify-between">
                    <span>Clean Trades (Zero Mistakes)</span>
                    <span className="font-mono font-bold text-emerald-400">{summary.cleanTradesCount} / {summary.totalTrades} ({summary.disciplineRate}%)</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0D1322] border border-slate-800 text-xs flex items-center justify-between">
                    <span>Best Winning Streak</span>
                    <span className="font-mono font-bold text-indigo-300">{summary.bestWinStreak} Trades</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0D1322] border border-slate-800 text-xs flex items-center justify-between">
                    <span>Largest Single Winner</span>
                    <span className="font-mono font-bold text-emerald-400">{formatINR(summary.bestWin, true)}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-[#0D1322] border border-slate-800 text-xs flex items-center justify-between">
                    <span>Largest Single Loser</span>
                    <span className="font-mono font-bold text-rose-400">{formatINR(summary.worstLoss, true)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 6: DAILY TRADING NOTEBOOK
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'notebook' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Add Daily Session Note */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2 mb-1">
                <i className="fa-solid fa-book-medical text-indigo-400"></i> Log Session Journal Entry
              </h3>
              <p className="text-xs text-slate-400 mb-4">Document pre-market levels, post-market review, and psychological state</p>

              <form onSubmit={handleCreateNote} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Session Date</label>
                  <input
                    type="date"
                    value={noteForm.note_date}
                    onChange={e => setNoteForm({ ...noteForm, note_date: e.target.value })}
                    className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Entry Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Nifty Expiry Gameplan & Morning ORB Review"
                    value={noteForm.title}
                    onChange={e => setNoteForm({ ...noteForm, title: e.target.value })}
                    className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-slate-400 mb-1">Category</label>
                    <select
                      value={noteForm.category}
                      onChange={e => setNoteForm({ ...noteForm, category: e.target.value })}
                      className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white"
                    >
                      <option>Pre-Market Plan</option>
                      <option>Session Review</option>
                      <option>Psychology Log</option>
                      <option>Weekly Recap</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Mindset / Mood</label>
                    <select
                      value={noteForm.mood}
                      onChange={e => setNoteForm({ ...noteForm, mood: e.target.value })}
                      className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white"
                    >
                      {EMOTION_OPTIONS.map(em => <option key={em}>{em}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Session Observations & Execution Notes</label>
                  <textarea
                    rows="4"
                    placeholder="What went well today? Did you follow your Playbook rules?"
                    value={noteForm.content}
                    onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
                    className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white"
                    required
                  ></textarea>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Key Takeaway / Rule Adjustment</label>
                  <input
                    type="text"
                    placeholder="e.g., Wait for 5m candle close above VWAP before adding size"
                    value={noteForm.lessons_learned}
                    onChange={e => setNoteForm({ ...noteForm, lessons_learned: e.target.value })}
                    className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-xl font-semibold zella-btn-primary text-white">
                  <i className="fa-solid fa-floppy-disk mr-1.5"></i> Save Notebook Entry
                </button>
              </form>
            </div>

            {/* Right: Notebook Entries Feed */}
            <div className="lg:col-span-2 space-y-4">
              {notes.map(n => (
                <div key={n.id} className="glass-card rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {n.note_date}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                        {n.category}
                      </span>
                      <span className="text-xs px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300">
                        Mood: {n.mood}
                      </span>
                    </div>
                  </div>
                  <h4 className="font-display font-bold text-base text-white mt-2">{n.title}</h4>
                  <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed mt-2">{n.content}</p>
                  {n.lessons_learned && (
                    <div className="mt-3 p-3 rounded-xl bg-[#0D1322] border border-indigo-500/30 text-xs text-indigo-200">
                      <strong className="text-indigo-400"><i className="fa-solid fa-lightbulb mr-1"></i> Key Lesson:</strong> {n.lessons_learned}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 7: POSITION SIZER & R-MULTIPLE RISK CALCULATOR (REA RECONSTRUCTED)
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'sizer' && (() => {
          const acc = parseFloat(sizerForm.accountSize) || 0;
          const riskPct = parseFloat(sizerForm.riskPct) || 0;
          const entry = parseFloat(sizerForm.entryPrice) || 0;
          const stop = parseFloat(sizerForm.stopPrice) || 0;
          const target = parseFloat(sizerForm.targetPrice) || 0;
          const lotMult = Math.max(1, parseInt(sizerForm.lotSize, 10) || 1);

          const maxRiskINR = (acc * riskPct) / 100;
          const stopPoints = Math.abs(entry - stop);
          const rewardPoints = Math.abs(target - entry);
          const rr = stopPoints > 0 ? (rewardPoints / stopPoints).toFixed(2) : '0.00';
          const rawQty = stopPoints > 0 ? Math.floor(maxRiskINR / stopPoints) : 0;
          const lots = lotMult > 1 ? Math.floor(rawQty / lotMult) : rawQty;
          const finalQty = lotMult > 1 ? lots * lotMult : rawQty;
          const actualRiskINR = finalQty * stopPoints;
          const projectedProfitINR = finalQty * rewardPoints;
          const capitalRequired = finalQty * entry;

          return (
            <div className="space-y-6">
              <div className="glass-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border-indigo-500/40">
                <div>
                  <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Reconstructed via morluto/rea (PositionSizerPage.tsx AST Graph)
                  </span>
                  <h2 className="font-display font-bold text-xl text-white mt-1.5 flex items-center gap-2">
                    <i className="fa-solid fa-calculator text-indigo-400"></i> Institutional Position Sizer & Lot Risk Calculator
                  </h2>
                  <p className="text-xs text-slate-400">Calculate exact Nifty/BankNifty F&O lots or Equity quantity before placing your order to lock 1R risk</p>
                </div>
                <button
                  onClick={() => {
                    setTradeForm({
                      ...tradeForm,
                      entry_price: String(entry),
                      exit_price: String(target),
                      stop_loss: String(stop),
                      target_price: String(target),
                      quantity: String(finalQty || 75)
                    });
                    setShowAddTradeModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold zella-btn-primary text-white flex items-center gap-2"
                >
                  <i className="fa-solid fa-bolt"></i> Send Size ({finalQty} Qty) to Trade Logger
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Calculator Inputs */}
                <div className="glass-card rounded-2xl p-6 space-y-4 text-xs">
                  <h3 className="font-display font-bold text-base text-white">1. Account & Risk Parameters</h3>
                  <div>
                    <label className="block text-slate-400 mb-1">Total Trading Capital (₹)</label>
                    <input type="number" value={sizerForm.accountSize} onChange={e => setSizerForm({ ...sizerForm, accountSize: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono text-sm" />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Risk Per Trade (% of Capital)</label>
                    <div className="flex gap-1.5 mb-2">
                      {['0.5', '1.0', '1.5', '2.0', '3.0'].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setSizerForm({ ...sizerForm, riskPct: preset })}
                          className={`flex-1 py-1.5 rounded-lg font-mono text-xs border transition ${
                            sizerForm.riskPct === preset ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-[#0D1322] border-slate-800 text-slate-400'
                          }`}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                    <input type="number" step="0.1" value={sizerForm.riskPct} onChange={e => setSizerForm({ ...sizerForm, riskPct: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono" />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-slate-400 mb-1">Entry Price (₹)</label>
                      <input type="number" step="any" value={sizerForm.entryPrice} onChange={e => setSizerForm({ ...sizerForm, entryPrice: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Stop Loss (₹)</label>
                      <input type="number" step="any" value={sizerForm.stopPrice} onChange={e => setSizerForm({ ...sizerForm, stopPrice: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-rose-300 font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Target (₹)</label>
                      <input type="number" step="any" value={sizerForm.targetPrice} onChange={e => setSizerForm({ ...sizerForm, targetPrice: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-emerald-300 font-mono" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">Lot Size Multiplier (1 = Equity Cash, 75 = Nifty, 30 = BankNifty)</label>
                    <div className="flex gap-1.5">
                      {[
                        { label: 'Equity (1)', val: '1' },
                        { label: 'Nifty (75)', val: '75' },
                        { label: 'BankNifty (30)', val: '30' },
                        { label: 'Sensex (20)', val: '20' }
                      ].map(m => (
                        <button
                          key={m.val}
                          type="button"
                          onClick={() => setSizerForm({ ...sizerForm, lotSize: m.val })}
                          className={`flex-1 py-1.5 rounded-lg font-mono text-[11px] border transition ${
                            sizerForm.lotSize === m.val ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300' : 'bg-[#0D1322] border-slate-800 text-slate-400'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right 2 Columns: Computed Sizing Output */}
                <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="glass-card rounded-2xl p-6 border-indigo-500/40 flex flex-col justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">Optimal Position Size</span>
                    <div className="text-4xl font-display font-extrabold text-white font-mono my-2">
                      {finalQty.toLocaleString('en-IN')} <span className="text-lg text-slate-400">Qty</span>
                    </div>
                    <div className="text-xs text-slate-300 font-mono">
                      {lotMult > 1 ? `${lots} Lot(s) × ${lotMult} Lot Multiplier` : `${finalQty} Cash Shares`}
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-6 flex flex-col justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-rose-300">1R Capital at Risk (Stop Hit)</span>
                    <div className="text-3xl font-display font-extrabold text-rose-400 font-mono my-2">
                      -{formatINR(actualRiskINR)}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Max Allowed ({riskPct}%): {formatINR(maxRiskINR)} | Stop Distance: {stopPoints.toFixed(2)} pts
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-6 flex flex-col justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Projected Reward at Target</span>
                    <div className="text-3xl font-display font-extrabold text-emerald-400 font-mono my-2">
                      +{formatINR(projectedProfitINR)}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      Planned R-Multiple: <strong className="text-indigo-300">+{rr}R</strong> ({rr}:1 Reward-to-Risk)
                    </div>
                  </div>

                  <div className="glass-card rounded-2xl p-6 flex flex-col justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Capital / Premium Deployed</span>
                    <div className="text-3xl font-display font-extrabold text-white font-mono my-2">
                      {formatINR(capitalRequired)}
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                      {acc > 0 ? `${((capitalRequired / acc) * 100).toFixed(1)}% of Total Account Capital` : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 8: DEEP REPORTS & INDIAN STATUTORY TAX AUDIT (50+ ANALYTICS)
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'reports' && window.DeepReportsTab && (
          <window.DeepReportsTab analytics={analytics} trades={trades} formatINR={formatINR} />
        )}

        {/* ════════════════════════════════════════════════════════════════════
            TAB 9: INTERACTIVE HISTORICAL BAR-BY-BAR STRATEGY BACKTESTER
           ════════════════════════════════════════════════════════════════════ */}
        {activeTab === 'backtester' && window.StrategyBacktesterTab && (
          <window.StrategyBacktesterTab
            formatINR={formatINR}
            onSaveBacktestTrade={handleSaveBacktestTrade}
          />
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 1: TRADE REPLAY & EXECUTION INSPECTOR (CANDLESTICK PLAYER + EDIT)
         ══════════════════════════════════════════════════════════════════════ */}
      {selectedTrade && (() => {
        const taxBreakdown = (selectedTrade.tax_breakdown && typeof selectedTrade.tax_breakdown === 'object')
          ? selectedTrade.tax_breakdown
          : (window.calculateClientIndianTaxes
              ? window.calculateClientIndianTaxes({
                  segment: selectedTrade.segment,
                  direction: selectedTrade.direction,
                  entryPrice: selectedTrade.entry_price,
                  exitPrice: selectedTrade.exit_price,
                  quantity: selectedTrade.quantity
                })
              : { brokerage: 40, stt: 25, exchangeTxn: 15, gst: 10, stampDuty: 5, sebiFee: 1, totalTaxes: selectedTrade.fees || 95 });

        const execLegs = (Array.isArray(selectedTrade.executions_json) && selectedTrade.executions_json.length > 0)
          ? selectedTrade.executions_json
          : [
              { leg: 1, action: selectedTrade.direction === 'SHORT' ? 'SELL (Entry)' : 'BUY (Entry)', qty: selectedTrade.quantity, price: selectedTrade.entry_price, time: (selectedTrade.entry_date || '').replace('T', ' ') },
              { leg: 2, action: selectedTrade.direction === 'SHORT' ? 'BUY (Exit)' : 'SELL (Exit)', qty: selectedTrade.quantity, price: selectedTrade.exit_price, time: (selectedTrade.exit_date || '').replace('T', ' ') }
            ];

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => { setSelectedTrade(null); setIsEditingTrade(false); }}>
            <div className="glass-card rounded-2xl max-w-4xl w-full p-6 border border-indigo-500/40 space-y-5 my-8 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold ${selectedTrade.direction === 'SHORT' ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'}`}>
                      {selectedTrade.direction}
                    </span>
                    <h3 className="font-display font-extrabold text-xl text-white">{selectedTrade.symbol}</h3>
                    <span className="text-xs text-slate-400 font-mono">({selectedTrade.segment})</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {selectedTrade.account_id || 'Main F&O'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 font-mono">
                    Entry: {selectedTrade.entry_date} → Exit: {selectedTrade.exit_date} • Broker: {selectedTrade.broker || 'Angel One'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!isEditingTrade) {
                        setEditTradeForm({
                          symbol: selectedTrade.symbol || '',
                          segment: selectedTrade.segment || 'NSE F&O',
                          direction: selectedTrade.direction || 'LONG',
                          account_id: selectedTrade.account_id || 'Main F&O',
                          entry_price: selectedTrade.entry_price,
                          exit_price: selectedTrade.exit_price,
                          quantity: selectedTrade.quantity,
                          stop_loss: selectedTrade.stop_loss || 0,
                          target_price: selectedTrade.target_price || 0,
                          fees: selectedTrade.fees || 0,
                          playbook_id: selectedTrade.playbook_id || 'pb-orb-15m',
                          setup_tag: selectedTrade.setup_tag || '',
                          emotion_tag: selectedTrade.emotion_tag || 'Focused & Calm',
                          mistakes: Array.isArray(selectedTrade.mistakes) ? selectedTrade.mistakes : [],
                          notes: selectedTrade.notes || '',
                          chart_url: selectedTrade.chart_url || ''
                        });
                      }
                      setIsEditingTrade(!isEditingTrade);
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30"
                  >
                    <i className={`fa-solid ${isEditingTrade ? 'fa-eye' : 'fa-pen-to-square'} mr-1.5`}></i>
                    {isEditingTrade ? 'View Replay' : 'Edit Trade'}
                  </button>
                  <button onClick={() => { setSelectedTrade(null); setIsEditingTrade(false); }} className="text-slate-400 hover:text-white text-lg px-2">
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </div>

              {isEditingTrade && editTradeForm ? (
                <form onSubmit={handleUpdateTrade} className="p-4 rounded-xl bg-[#0D1322] border border-indigo-500/30 space-y-4 text-xs">
                  <div className="font-bold text-sm text-indigo-300">Edit Trade Execution & Tags</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Symbol</label>
                      <input type="text" value={editTradeForm.symbol} onChange={e => setEditTradeForm({ ...editTradeForm, symbol: e.target.value })} className="w-full bg-[#090D16] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Entry Price (₹)</label>
                      <input type="number" step="any" value={editTradeForm.entry_price} onChange={e => setEditTradeForm({ ...editTradeForm, entry_price: e.target.value })} className="w-full bg-[#090D16] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Exit Price (₹)</label>
                      <input type="number" step="any" value={editTradeForm.exit_price} onChange={e => setEditTradeForm({ ...editTradeForm, exit_price: e.target.value })} className="w-full bg-[#090D16] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Quantity</label>
                      <input type="number" step="any" value={editTradeForm.quantity} onChange={e => setEditTradeForm({ ...editTradeForm, quantity: e.target.value })} className="w-full bg-[#090D16] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Stop Loss (₹)</label>
                      <input type="number" step="any" value={editTradeForm.stop_loss} onChange={e => setEditTradeForm({ ...editTradeForm, stop_loss: e.target.value })} className="w-full bg-[#090D16] border border-slate-800 rounded-lg px-2.5 py-1.5 text-rose-300 font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Target (₹)</label>
                      <input type="number" step="any" value={editTradeForm.target_price} onChange={e => setEditTradeForm({ ...editTradeForm, target_price: e.target.value })} className="w-full bg-[#090D16] border border-slate-800 rounded-lg px-2.5 py-1.5 text-emerald-300 font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Account</label>
                      <select value={editTradeForm.account_id} onChange={e => setEditTradeForm({ ...editTradeForm, account_id: e.target.value })} className="w-full bg-[#090D16] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white">
                        <option value="Main F&O">Main F&O</option>
                        <option value="Swing Equity">Swing Equity</option>
                        <option value="Prop / Challenge">Prop / Challenge</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Mindset</label>
                      <select value={editTradeForm.emotion_tag} onChange={e => setEditTradeForm({ ...editTradeForm, emotion_tag: e.target.value })} className="w-full bg-[#090D16] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white">
                        {EMOTION_OPTIONS.map(em => <option key={em} value={em}>{em}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Mistakes</label>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_MISTAKES.map(m => {
                        const active = editTradeForm.mistakes.includes(m);
                        return (
                          <button
                            type="button"
                            key={m}
                            onClick={() => {
                              const next = active ? editTradeForm.mistakes.filter(x => x !== m) : [...editTradeForm.mistakes, m];
                              setEditTradeForm({ ...editTradeForm, mistakes: next });
                            }}
                            className={`px-2 py-1 rounded text-[11px] border ${active ? 'bg-rose-500/25 border-rose-500 text-rose-200' : 'bg-[#090D16] border-slate-800 text-slate-400'}`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Execution Notes</label>
                    <textarea rows="2" value={editTradeForm.notes} onChange={e => setEditTradeForm({ ...editTradeForm, notes: e.target.value })} className="w-full bg-[#090D16] border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"></textarea>
                  </div>
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setIsEditingTrade(false)} className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-300">Cancel</button>
                    <button type="submit" className="px-4 py-1.5 rounded-lg zella-btn-primary text-white font-semibold">Save Changes</button>
                  </div>
                </form>
              ) : (
                <>
                  {/* P&L & R-Multiple Strip */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#0D1322] border border-slate-800 text-center">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Net Realized P&L</div>
                      <div className={`text-lg font-mono font-extrabold ${Number(selectedTrade.net_pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatINR(selectedTrade.net_pnl, true)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">R-Multiple</div>
                      <div className="text-lg font-mono font-extrabold text-indigo-300">
                        {Number(selectedTrade.r_multiple) > 0 ? `+${selectedTrade.r_multiple}R` : `${selectedTrade.r_multiple}R`}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Entry → Exit</div>
                      <div className="text-sm font-mono font-bold text-white mt-1">
                        ₹{selectedTrade.entry_price} → ₹{selectedTrade.exit_price}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase">Stop Loss / Target</div>
                      <div className="text-sm font-mono font-bold text-slate-300 mt-1">
                        ₹{selectedTrade.stop_loss || '—'} / ₹{selectedTrade.target_price || '—'}
                      </div>
                    </div>
                  </div>

                  {/* Interactive Tick-by-Tick OHLC Candlestick Replay Player */}
                  {window.CandlestickReplayPlayer && (
                    <window.CandlestickReplayPlayer trade={selectedTrade} />
                  )}

                  {/* Scale-In / Scale-Out Execution Fills Table + Statutory Tax Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="p-3.5 rounded-xl bg-[#0D1322] border border-slate-800 space-y-2">
                      <div className="font-bold text-slate-200 flex items-center justify-between">
                        <span><i className="fa-solid fa-layer-group text-indigo-400 mr-1.5"></i> Execution Fills (Scale-In / Out)</span>
                        <span className="text-[10px] font-mono text-slate-400">{execLegs.length} Fills</span>
                      </div>
                      <table className="w-full text-[11px] font-mono">
                        <thead>
                          <tr className="text-slate-400 border-b border-slate-800 text-left">
                            <th className="py-1">Leg</th>
                            <th className="py-1">Side</th>
                            <th className="py-1">Qty</th>
                            <th className="py-1 text-right">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          {execLegs.map((leg, i) => (
                            <tr key={i} className="border-b border-slate-800/50">
                              <td className="py-1.5 text-slate-400">#{leg.leg || i + 1}</td>
                              <td className={`py-1.5 font-semibold ${String(leg.action).includes('BUY') ? 'text-emerald-400' : 'text-amber-300'}`}>{leg.action}</td>
                              <td className="py-1.5 text-slate-200">{leg.qty}</td>
                              <td className="py-1.5 text-right text-white">₹{leg.price}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0D1322] border border-slate-800 space-y-1.5">
                      <div className="font-bold text-slate-200 flex items-center justify-between mb-1">
                        <span><i className="fa-solid fa-receipt text-amber-400 mr-1.5"></i> Statutory Indian Tax Breakdown</span>
                        <span className="font-mono text-rose-400 font-bold">-₹{taxBreakdown.totalTaxes || selectedTrade.fees}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-slate-300">
                        <div className="flex justify-between"><span>Brokerage:</span><span>₹{taxBreakdown.brokerage}</span></div>
                        <div className="flex justify-between"><span>STT / CTT:</span><span>₹{taxBreakdown.stt}</span></div>
                        <div className="flex justify-between"><span>NSE Exchange Txn:</span><span>₹{taxBreakdown.exchangeTxn}</span></div>
                        <div className="flex justify-between"><span>18% GST:</span><span>₹{taxBreakdown.gst}</span></div>
                        <div className="flex justify-between"><span>Stamp Duty:</span><span>₹{taxBreakdown.stampDuty}</span></div>
                        <div className="flex justify-between"><span>SEBI Turnover:</span><span>₹{taxBreakdown.sebiFee}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Chart Screenshot Attachment / Upload */}
                  <div className="p-3.5 rounded-xl bg-[#0D1322] border border-slate-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-300">
                        <i className="fa-solid fa-camera text-indigo-400 mr-1.5"></i> Annotated Chart Screenshot
                      </span>
                      <label className="px-3 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 cursor-pointer font-semibold text-[11px]">
                        <i className="fa-solid fa-upload mr-1"></i> Upload Chart Image
                        <input type="file" accept="image/*" onChange={e => handleScreenshotFileUpload(e, true)} className="hidden" />
                      </label>
                    </div>
                    {selectedTrade.chart_url ? (
                      <img src={selectedTrade.chart_url} alt="Trade Chart" className="max-h-64 rounded-xl border border-slate-700 mx-auto object-contain" />
                    ) : (
                      <p className="text-[11px] text-slate-500">No screenshot attached yet. Click "Upload Chart Image" to attach your TradingView / Angel One chart markup.</p>
                    )}
                  </div>

                  {/* Setup, Mistakes & Notes */}
                  <div className="space-y-3 text-xs">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="text-slate-400">Setup:</span>
                      <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-300 font-semibold">{selectedTrade.setup_tag}</span>
                      <span className="text-slate-400 ml-2">Mindset:</span>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200">{selectedTrade.emotion_tag}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-1">Tagged Mistakes:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(Array.isArray(selectedTrade.mistakes) && selectedTrade.mistakes.length > 0) ? (
                          selectedTrade.mistakes.map(m => (
                            <span key={m} className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                              <i className="fa-solid fa-triangle-exclamation mr-1"></i> {m}
                            </span>
                          ))
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300">Zero Mistakes — Followed Playbook Rules</span>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-[#0D1322] border border-slate-800">
                      <div className="text-slate-400 mb-1 font-semibold">Trader Execution Notes:</div>
                      <p className="text-slate-200 leading-relaxed">{selectedTrade.notes || 'No execution notes recorded.'}</p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center pt-3 border-t border-slate-800">
                <button
                  onClick={() => handleDeleteTrade(selectedTrade.id)}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-300 hover:bg-rose-600 hover:text-white transition"
                >
                  <i className="fa-solid fa-trash mr-1.5"></i> Delete Trade
                </button>
                <button
                  onClick={() => { setSelectedTrade(null); setIsEditingTrade(false); }}
                  className="px-5 py-2 rounded-xl text-xs font-semibold zella-btn-primary text-white"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2: CALENDAR DAY DRILLDOWN
         ══════════════════════════════════════════════════════════════════════ */}
      {selectedDayModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedDayModal(null)}>
          <div className="glass-card rounded-2xl max-w-xl w-full p-6 border border-indigo-500/40 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Session Breakdown — {selectedDayModal.dateStr}
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedDayModal.stat.trades} trade(s) • Net P&L: <strong className={selectedDayModal.stat.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatINR(selectedDayModal.stat.netPnl, true)}</strong>
                </p>
              </div>
              <button onClick={() => setSelectedDayModal(null)} className="text-slate-400 hover:text-white">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {trades.filter(t => (t.entry_date || '').startsWith(selectedDayModal.dateStr)).map(t => (
                <div
                  key={t.id}
                  onClick={() => { setSelectedDayModal(null); setSelectedTrade(t); }}
                  className="p-3.5 rounded-xl bg-[#0D1322] border border-slate-800 hover:border-indigo-500/50 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-2">
                      <span>{t.symbol}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300">{t.direction}</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{t.setup_tag} • {t.quantity} qty</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className={`text-sm font-bold ${Number(t.net_pnl) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatINR(t.net_pnl, true)}
                    </div>
                    <div className="text-[11px] text-indigo-300">{t.r_multiple}R</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 3: ADD MANUAL TRADE MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {showAddTradeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowAddTradeModal(false)}>
          <div className="glass-card rounded-2xl max-w-2xl w-full p-6 border border-indigo-500/40 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <i className="fa-solid fa-plus-circle text-indigo-400"></i> Log New Trade Execution
              </h3>
              <button onClick={() => setShowAddTradeModal(false)} className="text-slate-400 hover:text-white">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <form onSubmit={handleAddTrade} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Symbol / Contract</label>
                  <input type="text" value={tradeForm.symbol} onChange={e => setTradeForm({ ...tradeForm, symbol: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono" required />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Market Segment</label>
                  <select value={tradeForm.segment} onChange={e => setTradeForm({ ...tradeForm, segment: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white">
                    <option>NSE F&O</option>
                    <option>NSE Equity</option>
                    <option>MCX Commodities</option>
                    <option>Forex / Crypto</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Direction</label>
                  <select value={tradeForm.direction} onChange={e => setTradeForm({ ...tradeForm, direction: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono">
                    <option value="LONG">LONG (Buy)</option>
                    <option value="SHORT">SHORT (Sell)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Portfolio Account</label>
                  <select value={tradeForm.account_id || 'Main F&O'} onChange={e => setTradeForm({ ...tradeForm, account_id: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white">
                    <option value="Main F&O">Main F&O</option>
                    <option value="Swing Equity">Swing Equity</option>
                    <option value="Prop / Challenge">Prop / Challenge</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Quantity</label>
                  <input type="number" step="any" value={tradeForm.quantity} onChange={e => setTradeForm({ ...tradeForm, quantity: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono" required />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Entry Price (₹)</label>
                  <input type="number" step="any" value={tradeForm.entry_price} onChange={e => setTradeForm({ ...tradeForm, entry_price: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono" required />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Exit Price (₹)</label>
                  <input type="number" step="any" value={tradeForm.exit_price} onChange={e => setTradeForm({ ...tradeForm, exit_price: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono" required />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Stop Loss (₹)</label>
                  <input type="number" step="any" value={tradeForm.stop_loss} onChange={e => setTradeForm({ ...tradeForm, stop_loss: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono" />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Taxes (Blank = Auto STT/GST)</label>
                  <input type="number" step="any" placeholder="Auto-Calc" value={tradeForm.fees} onChange={e => setTradeForm({ ...tradeForm, fees: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Entry Date & Time</label>
                  <input type="datetime-local" value={tradeForm.entry_date} onChange={e => setTradeForm({ ...tradeForm, entry_date: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono" required />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Playbook Strategy</label>
                  <select value={tradeForm.playbook_id} onChange={e => setTradeForm({ ...tradeForm, playbook_id: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white">
                    {playbooks.map(pb => <option key={pb.id} value={pb.id}>{pb.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Emotion / Mindset</label>
                  <select value={tradeForm.emotion_tag} onChange={e => setTradeForm({ ...tradeForm, emotion_tag: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white">
                    {EMOTION_OPTIONS.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1.5">Tag Any Execution Mistakes (Click to toggle)</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_MISTAKES.map(m => {
                    const active = tradeForm.mistakes.includes(m);
                    return (
                      <button
                        type="button"
                        key={m}
                        onClick={() => {
                          const next = active ? tradeForm.mistakes.filter(x => x !== m) : [...tradeForm.mistakes, m];
                          setTradeForm({ ...tradeForm, mistakes: next });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition ${
                          active ? 'bg-rose-500/25 border-rose-500 text-rose-200' : 'bg-[#0D1322] border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">Trade Notes & Chart Context</label>
                  <textarea rows="2" value={tradeForm.notes} onChange={e => setTradeForm({ ...tradeForm, notes: e.target.value })} placeholder="Why did you take this setup? How did you manage risk?" className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white"></textarea>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Chart Screenshot</label>
                  <label className="flex items-center justify-center gap-2 px-3 py-3 rounded-xl bg-[#0D1322] border border-dashed border-slate-700 hover:border-indigo-400 cursor-pointer text-indigo-300">
                    <i className="fa-solid fa-camera"></i>
                    <span>{tradeForm.chart_url ? 'Image Attached ✓' : 'Attach Chart PNG'}</span>
                    <input type="file" accept="image/*" onChange={e => handleScreenshotFileUpload(e, false)} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button type="button" onClick={() => setShowAddTradeModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl zella-btn-primary text-white font-semibold">Save Trade to Journal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 4: UNIVERSAL MULTI-BROKER CONNECTION HUB & CSV / WEBHOOK SYNC
         ══════════════════════════════════════════════════════════════════════ */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={() => setShowImportModal(false)}>
          <div className="glass-card rounded-2xl max-w-2xl w-full p-6 border border-indigo-500/40 space-y-5 my-8" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                  <i className="fa-solid fa-plug-circle-bolt text-emerald-400"></i> Universal Broker Integration Hub
                </h3>
                <p className="text-xs text-slate-400">Connect any Indian or Global Broker via Direct API, Auto-Paired Tradebook CSV, or Real-Time Webhook</p>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* Step 1: Select Broker */}
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-2">1. Select Your Broker / Trading Platform:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  { name: 'Angel One SmartAPI', badge: 'Native API', icon: 'fa-bolt' },
                  { name: 'Zerodha Kite', badge: 'Kite API / CSV', icon: 'fa-feather' },
                  { name: 'DhanHQ', badge: 'Dhan v2 API', icon: 'fa-chart-simple' },
                  { name: 'Upstox Pro', badge: 'Upstox v2 API', icon: 'fa-arrow-trend-up' },
                  { name: 'Fyers / Groww', badge: 'API / CSV', icon: 'fa-layer-group' },
                  { name: 'Kotak Neo / ICICI', badge: 'Tradebook CSV', icon: 'fa-building-columns' },
                  { name: 'MT4 / MT5 / cTrader', badge: 'Forex / Prop', icon: 'fa-globe' },
                  { name: 'TradingView Webhook', badge: 'Auto-Bot Sync', icon: 'fa-satellite-dish' }
                ].map(b => {
                  const active = selectedBroker === b.name;
                  return (
                    <button
                      type="button"
                      key={b.name}
                      onClick={() => setSelectedBroker(b.name)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between ${
                        active
                          ? 'bg-indigo-600/20 border-indigo-400 text-white shadow'
                          : 'bg-[#0D1322] border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <i className={`fa-solid ${b.icon} ${active ? 'text-indigo-400' : 'text-slate-500'}`}></i>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{b.badge}</span>
                      </div>
                      <div className="font-semibold text-[11px] mt-2 truncate">{b.name}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Real Live Broker REST API Auto-Sync */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-950/70 to-emerald-950/50 border border-emerald-500/30 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    {selectedBroker} — Live REST API Orderbook Auto-Sync
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Connects directly to official broker REST endpoints (`apiconnect.angelone.in`, `api.dhan.co`, `api.upstox.com`, `api.kite.trade`) & pairs fills via FIFO + Statutory Indian Taxes.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={brokerSyncLoading}
                    onClick={handleLiveBrokerSync}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 whitespace-nowrap transition shadow-lg"
                  >
                    <i className={`fa-solid ${brokerSyncLoading ? 'fa-spinner fa-spin' : 'fa-bolt'} mr-1.5`}></i>
                    {brokerSyncLoading ? 'Connecting Live API...' : `Connect & Sync Live ${selectedBroker.split(' ')[0]}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSimulateAngelOneSync(selectedBroker)}
                    title="Test FIFO pairing with sample broker executions without API keys"
                    className="px-3 py-2 rounded-xl text-[11px] font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 whitespace-nowrap transition"
                  >
                    <i className="fa-solid fa-flask mr-1"></i> Test Sandbox
                  </button>
                </div>
              </div>

              {selectedBroker.includes('Angel') ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                  <input
                    type="text"
                    value={brokerClientId}
                    onChange={e => setBrokerClientId(e.target.value)}
                    placeholder="Angel One Client Code (e.g. A123456)"
                    className="bg-[#090D16]/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    value={brokerApiKey}
                    onChange={e => setBrokerApiKey(e.target.value)}
                    placeholder="SmartAPI Private Key"
                    className="bg-[#090D16]/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                  <input
                    type="password"
                    value={brokerPassword}
                    onChange={e => setBrokerPassword(e.target.value)}
                    placeholder="Angel One 4-Digit MPIN"
                    className="bg-[#090D16]/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    value={brokerTotp}
                    onChange={e => setBrokerTotp(e.target.value)}
                    placeholder="6-Digit Authenticator TOTP"
                    className="bg-[#090D16]/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                  <input
                    type="password"
                    value={brokerToken}
                    onChange={e => setBrokerToken(e.target.value)}
                    placeholder="Or Direct SmartAPI JWT Token (Optional)"
                    className="sm:col-span-2 bg-[#090D16]/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <input
                    type="text"
                    value={brokerClientId}
                    onChange={e => setBrokerClientId(e.target.value)}
                    placeholder={`${selectedBroker.split(' ')[0]} Client ID / App ID`}
                    className="bg-[#090D16]/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                  <input
                    type="text"
                    value={brokerApiKey}
                    onChange={e => setBrokerApiKey(e.target.value)}
                    placeholder="API Key (Required for Zerodha/Fyers)"
                    className="bg-[#090D16]/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                  <input
                    type="password"
                    value={brokerToken}
                    onChange={e => setBrokerToken(e.target.value)}
                    placeholder="Live OAuth Access Token"
                    className="bg-[#090D16]/80 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                  />
                </div>
              )}

              {brokerSyncError && (
                <div className="p-2.5 rounded-lg bg-rose-950/90 border border-rose-500/40 text-[11px] text-rose-200 flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation text-rose-400"></i>
                  <span>{brokerSyncError}</span>
                </div>
              )}
            </div>

            {/* Step 3: Universal Tradebook CSV Upload (With FIFO Auto-Pairing) */}
            <label className="block border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-5 text-center cursor-pointer transition bg-[#0D1322]/60">
              <i className="fa-solid fa-file-csv text-2xl text-indigo-400 mb-1.5"></i>
              <div className="text-sm font-semibold text-white">
                Upload {selectedBroker} Tradebook / P&L CSV
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Works with both <strong>Raw Execution Tradebooks</strong> (separate BUY/SELL rows auto-paired via FIFO) and <strong>Closed P&L Reports</strong>!
              </p>
              <input type="file" accept=".csv" onChange={handleCsvFileUpload} className="hidden" />
            </label>

            {/* Step 4: Real-Time Webhook for TradingView / MT4 / MT5 / Python Bots */}
            <div className="p-3.5 rounded-xl bg-[#0D1322] border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold"><i className="fa-solid fa-satellite-dish text-indigo-400 mr-1.5"></i> Live Webhook Endpoint (TradingView / MT4 / Algo):</span>
                <code className="ml-2 text-indigo-300 font-mono bg-slate-900 px-2 py-0.5 rounded">POST http://localhost:3000/api/journal/webhook</code>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard && navigator.clipboard.writeText(window.location.origin + '/api/journal/webhook');
                  showNotification('Webhook URL copied to clipboard!');
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px]"
              >
                <i className="fa-regular fa-copy mr-1"></i> Copy URL
              </button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
              <a
                href="https://a.aonelink.in/ANGOne/8Xovqg1"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline font-medium"
              >
                Don't have an Angel One Demat Account? Open Free →
              </a>
              <button onClick={() => setShowImportModal(false)} className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 5: CREATE NEW PLAYBOOK MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {showAddPlaybookModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddPlaybookModal(false)}>
          <div className="glass-card rounded-2xl max-w-lg w-full p-6 border border-indigo-500/40 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-white">Create Strategy Playbook</h3>
              <button onClick={() => setShowAddPlaybookModal(false)} className="text-slate-400 hover:text-white">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <form onSubmit={handleCreatePlaybook} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Playbook Name</label>
                <input type="text" required placeholder="e.g., 9:20 AM BankNifty Straddle Decay" value={playbookForm.name} onChange={e => setPlaybookForm({ ...playbookForm, name: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Description</label>
                <input type="text" placeholder="Core thesis of the strategy..." value={playbookForm.description} onChange={e => setPlaybookForm({ ...playbookForm, description: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Entry Rules (One per line)</label>
                <textarea rows="3" value={playbookForm.entry_rules_text} onChange={e => setPlaybookForm({ ...playbookForm, entry_rules_text: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white"></textarea>
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Exit Rules (One per line)</label>
                <textarea rows="2" value={playbookForm.exit_rules_text} onChange={e => setPlaybookForm({ ...playbookForm, exit_rules_text: e.target.value })} className="w-full bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white"></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddPlaybookModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl zella-btn-primary text-white font-semibold">Create Playbook</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 6: FREEMIUM & ANGEL ONE AUTHORISED PARTNER UNLOCK MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {showPricingModal && window.FreemiumPartnerModal && (
        <window.FreemiumPartnerModal
          show={showPricingModal}
          onClose={() => setShowPricingModal(false)}
          tradesCount={trades.length}
          userPlan={userPlan}
          currentUserId={currentUserId}
          onUnlockPartner={(code) => {
            localStorage.setItem('tp_zella_plan', 'PARTNER_PRO');
            setUserPlan('PARTNER_PRO');
            showNotification(`Pro Tier Unlocked! Welcome mapped partner client (${code}).`);
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 7: EASY 1-STEP EMAIL OR MOBILE LOGIN MODAL
         ══════════════════════════════════════════════════════════════════════ */}
      {showAuthModal && window.EasyAuthModal && (
        <window.EasyAuthModal
          show={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          userProfile={userProfile}
          onLoginSuccess={(usr, msg) => {
            setCurrentUserId(usr.userId);
            setUserProfile(usr);
            setUserPlan(usr.planTier || 'FREE_STARTER');
            localStorage.setItem('tp_zella_user_id', usr.userId);
            localStorage.setItem('tp_zella_user_profile', JSON.stringify(usr));
            localStorage.setItem('tp_zella_plan', usr.planTier || 'FREE_STARTER');
            showNotification(msg || `Signed in as ${usr.name}!`);
          }}
          onLogout={() => {
            setCurrentUserId('trader_primary');
            setUserProfile(null);
            setUserPlan('FREE_STARTER');
            localStorage.removeItem('tp_zella_user_id');
            localStorage.removeItem('tp_zella_user_profile');
            localStorage.setItem('tp_zella_plan', 'FREE_STARTER');
            showNotification('Signed out to Guest / Demo profile.');
          }}
        />
      )}

      {/* SEBI Authorised Person (AP) Compliance & Disclaimers Footer */}
      <footer className="border-t border-[#222F49] bg-[#0B0F1A] py-5 px-6 text-xs text-slate-500 mt-12">
        <div className="max-w-[1600px] mx-auto space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>⚡ <strong>TrustPoint Zella</strong> — Institutional AI Trading Journal | Powered by TrustPoint Finance & Angel One SmartAPI</span>
            <div className="flex items-center gap-4">
              <span>User Session: <strong className="text-indigo-300 font-mono">{userProfile && userProfile.identifier ? `${userProfile.name} (${userProfile.identifier})` : currentUserId}</strong></span>
              <span>SQLite Engine: <strong className={backendConnected ? 'text-emerald-400' : 'text-amber-400'}>{backendConnected ? 'Connected (Live Server)' : 'Local Storage Mode'}</strong></span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#0D1322]/90 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed text-left">
            <strong className="text-emerald-400"><i className="fa-solid fa-scale-balanced mr-1"></i> Regulatory & SEBI Compliance Disclosure:</strong> TrustPoint Zella is strictly a <strong>post-trade self-directed record-keeping, tax-accounting, and behavioral analytics journal</strong>. It does not provide investment advice, stock tips, buy/sell signals, or assured return claims under SEBI (Investment Advisers) Regulations, 2013 or SEBI (Research Analysts) Regulations, 2014. Investments in the securities market (especially F&O derivatives) are subject to market risks; read all related documents carefully before investing.
          </div>
        </div>
      </footer>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<TrustPointZellaApp />);
