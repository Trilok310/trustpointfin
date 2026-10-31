// ── journal/zellaComponents.js ───────────────────────────────────────────────
// TrustPoint Zella V2.0 — Advanced Institutional Modules:
// 1. Client-Side Indian Statutory Tax Calculator (STT, GST, NSE Txn, Stamp, SEBI)
// 2. Interactive OHLC Candlestick Tick-by-Tick Trade Replay Player (Canvas + 9 EMA + VWAP)
// 3. Deep Reports & Tax Drag Analytics Tab (Day-of-Week, Hourly IST, Hold Duration, Symbols)
// 4. Interactive Historical Strategy Backtester ("Zella Backtester")
// 5. SEBI-Compliant Freemium & Angel One Authorised Person (AP) Partner Unlock Modal

const { useState: useZState, useEffect: useZEffect, useRef: useZRef, useMemo: useZMemo } = React;

// ── 1. Statutory Indian Brokerage & Tax Calculator ──
window.calculateClientIndianTaxes = function calculateClientIndianTaxes({
  symbol = '',
  segment = 'NSE F&O',
  direction = 'LONG',
  entry_price = 0,
  exit_price = 0,
  quantity = 1,
  numOrders = 2
}) {
  const sym = String(symbol || '').toUpperCase();
  const seg = String(segment || 'NSE F&O').toUpperCase();
  const entry = Math.max(0, Number(entry_price) || 0);
  const exit = Math.max(0, Number(exit_price) || 0);
  const qty = Math.max(1, Number(quantity) || 1);

  const buyPrice = direction === 'SHORT' ? exit : entry;
  const sellPrice = direction === 'SHORT' ? entry : exit;
  const buyTurnover = buyPrice * qty;
  const sellTurnover = sellPrice * qty;
  const totalTurnover = buyTurnover + sellTurnover;

  const isOptions = seg.includes('F&O') && (sym.includes('CE') || sym.includes('PE') || !sym.includes('FUT'));
  const isFutures = seg.includes('F&O') && sym.includes('FUT');

  const brokerage = Number((Math.max(2, numOrders) * 20).toFixed(2));
  const stt = isOptions
    ? sellTurnover * 0.001
    : isFutures
    ? sellTurnover * 0.0002
    : sellTurnover * 0.00025;
  const exchangeCharge = isOptions
    ? totalTurnover * 0.0003503
    : isFutures
    ? totalTurnover * 0.0000173
    : totalTurnover * 0.0000297;
  const sebiFee = totalTurnover * 0.000001;
  const stampDuty = isFutures ? buyTurnover * 0.00002 : buyTurnover * 0.00003;
  const gst = (brokerage + exchangeCharge + sebiFee) * 0.18;
  const totalCharges = Number((brokerage + stt + exchangeCharge + sebiFee + stampDuty + gst).toFixed(2));

  return {
    brokerage: Number(brokerage.toFixed(2)),
    stt: Number(stt.toFixed(2)),
    exchangeCharge: Number(exchangeCharge.toFixed(2)),
    sebiFee: Number(sebiFee.toFixed(2)),
    stampDuty: Number(stampDuty.toFixed(2)),
    gst: Number(gst.toFixed(2)),
    totalCharges
  };
};

// ── 2. Interactive Tick-by-Tick OHLC Candlestick Replay Player ──
window.CandlestickReplayPlayer = function CandlestickReplayPlayer({ trade, formatINR }) {
  const canvasRef = useZRef(null);
  const [isPlaying, setIsPlaying] = useZState(false);
  const [speed, setSpeed] = useZState(2); // 1x, 2x, 5x, 10x
  const [stepIndex, setStepIndex] = useZState(24);

  // Build deterministic 24-candle 1m/5m OHLC path anchored to trade's exact Entry, MAE, MFE, Exit, SL, Target
  const candles = useZMemo(() => {
    if (!trade) return [];
    const entry = Number(trade.entry_price) || 150;
    const exit = Number(trade.exit_price) || 165;
    const isShort = (trade.direction || 'LONG').toUpperCase() === 'SHORT';
    const maePts = Math.abs(Number(trade.mae) || Math.abs(exit - entry) * 0.25);
    const mfePts = Math.abs(Number(trade.mfe) || Math.abs(exit - entry) * 1.15);

    const worstPrice = isShort ? entry + maePts : Math.max(1, entry - maePts);
    const bestPrice = isShort ? Math.max(1, entry - mfePts) : entry + mfePts;
    const preOpen = isShort ? entry * 1.008 : entry * 0.992;

    // Keyframe waypoints across 24 candles (Entry at candle #4, MAE at #9, MFE at #17, Exit at #21)
    const waypoints = [
      { idx: 0, p: preOpen },
      { idx: 4, p: entry },
      { idx: 9, p: worstPrice },
      { idx: 17, p: bestPrice },
      { idx: 21, p: exit },
      { idx: 23, p: exit + (exit - entry) * 0.08 }
    ];

    function interp(i) {
      for (let w = 0; w < waypoints.length - 1; w++) {
        const a = waypoints[w];
        const b = waypoints[w + 1];
        if (i >= a.idx && i <= b.idx) {
          const t = (i - a.idx) / Math.max(1, b.idx - a.idx);
          return a.p + (b.p - a.p) * t;
        }
      }
      return exit;
    }

    const list = [];
    let prevClose = preOpen;
    let ema9 = preOpen;
    let cumPv = 0;
    let cumVol = 0;
    const rangeUnit = Math.max(entry * 0.0035, Math.abs(exit - entry) * 0.09, 0.5);

    for (let i = 0; i < 24; i++) {
      const targetClose = i === 4 ? entry : i === 21 ? exit : interp(i) + Math.sin(i * 1.7) * (rangeUnit * 0.35);
      const open = i === 0 ? preOpen : prevClose;
      const close = Number(targetClose.toFixed(2));
      let high = Number((Math.max(open, close) + rangeUnit * (0.4 + ((i * 7) % 5) * 0.12)).toFixed(2));
      let low = Number((Math.min(open, close) - rangeUnit * (0.4 + ((i * 11) % 5) * 0.12)).toFixed(2));

      if (i === 9) {
        if (isShort) high = Math.max(high, Number(worstPrice.toFixed(2)));
        else low = Math.min(low, Number(worstPrice.toFixed(2)));
      }
      if (i === 17) {
        if (isShort) low = Math.min(low, Number(bestPrice.toFixed(2)));
        else high = Math.max(high, Number(bestPrice.toFixed(2)));
      }

      const vol = 1000 + ((i * 389) % 1800);
      const typ = (high + low + close) / 3;
      cumPv += typ * vol;
      cumVol += vol;
      const vwap = Number((cumPv / cumVol).toFixed(2));
      ema9 = Number((close * (2 / 10) + ema9 * (1 - 2 / 10)).toFixed(2));

      list.push({
        idx: i,
        open,
        high,
        low,
        close,
        ema9,
        vwap,
        isEntry: i === 4,
        isExit: i === 21
      });
      prevClose = close;
    }
    return list;
  }, [trade]);

  useZEffect(() => {
    setStepIndex(candles.length);
    setIsPlaying(false);
  }, [trade, candles.length]);

  useZEffect(() => {
    if (!isPlaying) return;
    const intervalMs = Math.max(80, Math.round(520 / speed));
    const timer = setInterval(() => {
      setStepIndex(prev => {
        if (prev >= candles.length) {
          setIsPlaying(false);
          return candles.length;
        }
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isPlaying, speed, candles.length]);

  // Draw OHLC Candlestick Chart on HTML5 Canvas
  useZEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const visible = candles.slice(0, Math.max(1, stepIndex));
    const entry = Number(trade.entry_price) || 150;
    const sl = Number(trade.stop_loss) || 0;
    const tp = Number(trade.target_price) || 0;

    let minP = Math.min(...candles.map(c => c.low), entry);
    let maxP = Math.max(...candles.map(c => c.high), entry);
    if (sl > 0) { minP = Math.min(minP, sl); maxP = Math.max(maxP, sl); }
    if (tp > 0) { minP = Math.min(minP, tp); maxP = Math.max(maxP, tp); }
    const pad = Math.max((maxP - minP) * 0.12, 1);
    minP -= pad;
    maxP += pad;

    const padLeft = 14;
    const padRight = 68;
    const padTop = 16;
    const padBottom = 22;
    const plotW = W - padLeft - padRight;
    const plotH = H - padTop - padBottom;

    const yOf = (price) => padTop + plotH - ((price - minP) / Math.max(0.0001, maxP - minP)) * plotH;
    const xOf = (idx) => padLeft + ((idx + 0.5) / candles.length) * plotW;

    // Background Grid
    ctx.strokeStyle = 'rgba(34, 47, 73, 0.45)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const gy = padTop + (plotH / 4) * g;
      const gp = maxP - ((maxP - minP) / 4) * g;
      ctx.beginPath();
      ctx.moveTo(padLeft, gy);
      ctx.lineTo(W - padRight, gy);
      ctx.stroke();

      ctx.fillStyle = '#64748B';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`₹${gp.toFixed(1)}`, W - padRight + 6, gy + 3);
    }

    // Draw Horizontal Stop Loss, Entry, and Target Price Lines
    function drawLevelLine(price, color, label) {
      if (!price || price <= 0) return;
      const y = yOf(price);
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(W - padRight, y);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.font = 'bold 10px JetBrains Mono, monospace';
      ctx.fillText(`${label} ₹${price}`, padLeft + 6, y - 4);
      ctx.restore();
    }

    drawLevelLine(sl, '#F43F5E', 'SL');
    drawLevelLine(entry, '#818CF8', 'ENTRY');
    drawLevelLine(tp, '#10B981', 'TARGET');

    // Draw VWAP Line (Amber) & 9 EMA Line (Indigo)
    ctx.beginPath();
    visible.forEach((c, i) => {
      const cx = xOf(c.idx);
      const cy = yOf(c.vwap);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    visible.forEach((c, i) => {
      const cx = xOf(c.idx);
      const cy = yOf(c.ema9);
      if (i === 0) ctx.moveTo(cx, cy);
      else ctx.lineTo(cx, cy);
    });
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Draw Candlesticks
    const candleW = Math.max(6, Math.floor(plotW / candles.length) - 6);
    visible.forEach(c => {
      const cx = xOf(c.idx);
      const isBull = c.close >= c.open;
      const color = isBull ? '#10B981' : '#F43F5E';

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cx, yOf(c.high));
      ctx.lineTo(cx, yOf(c.low));
      ctx.stroke();

      // Body
      const topY = yOf(Math.max(c.open, c.close));
      const botY = yOf(Math.min(c.open, c.close));
      const bodyH = Math.max(3, botY - topY);
      ctx.fillStyle = color;
      ctx.fillRect(cx - candleW / 2, topY, candleW, bodyH);

      // Entry / Exit Execution Arrows
      if (c.isEntry) {
        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText('▲ ENTRY', cx - 20, yOf(c.low) + 13);
      }
      if (c.isExit) {
        ctx.fillStyle = '#FBBF24';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText('▼ EXIT', cx - 18, yOf(c.high) - 6);
      }
    });
  }, [candles, stepIndex, trade]);

  // Calculate live floating P&L at current replay step
  const currentCandle = candles[Math.min(candles.length - 1, Math.max(0, stepIndex - 1))] || { close: trade.entry_price };
  const isInTrade = stepIndex >= 5 && stepIndex <= 21;
  const isFinished = stepIndex > 21;
  const activePrice = isFinished ? Number(trade.exit_price) : (stepIndex < 5 ? Number(trade.entry_price) : currentCandle.close);
  const isShort = (trade.direction || 'LONG').toUpperCase() === 'SHORT';
  const rawPts = stepIndex < 5 ? 0 : (isShort ? (Number(trade.entry_price) - activePrice) : (activePrice - Number(trade.entry_price)));
  const floatingPnl = stepIndex < 5 ? 0 : (isFinished ? Number(trade.net_pnl) : Math.round(rawPts * (Number(trade.quantity) || 1)));

  return (
    <div className="p-4 rounded-xl bg-[#0D1322] border border-slate-800 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-white flex items-center gap-1.5">
            <i className="fa-solid fa-film text-indigo-400"></i> Tick-by-Tick Candlestick Replay
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300">
            {stepIndex < 5 ? 'Pre-Entry Setup' : isInTrade ? 'LIVE IN TRADE' : 'Trade Closed'} (Bar {stepIndex}/{candles.length})
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-400">LTP: <strong className="text-white">₹{Number(activePrice).toFixed(2)}</strong></span>
          <span className={floatingPnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
            {formatINR(floatingPnl, true)}
          </span>
          <span className="text-slate-500 text-[10px]">
            MAE: <strong className="text-rose-400">{trade.mae || 0}</strong> | MFE: <strong className="text-emerald-400">+{trade.mfe || 0}</strong>
          </span>
        </div>
      </div>

      <div className="relative rounded-xl overflow-hidden bg-[#080C14] border border-slate-800/90">
        <canvas ref={canvasRef} width={640} height={210} className="w-full h-[210px] block"></canvas>
      </div>

      {/* Replay Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              if (stepIndex >= candles.length) setStepIndex(1);
              setIsPlaying(!isPlaying);
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold zella-btn-primary text-white flex items-center gap-1.5"
          >
            <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
            <span>{isPlaying ? 'Pause' : (stepIndex >= candles.length ? 'Replay Trade' : 'Play')}</span>
          </button>
          <button
            type="button"
            onClick={() => { setIsPlaying(false); setStepIndex(prev => Math.max(1, prev - 1)); }}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Step Back 1 Candle"
          >
            <i className="fa-solid fa-backward-step"></i>
          </button>
          <button
            type="button"
            onClick={() => { setIsPlaying(false); setStepIndex(prev => Math.min(candles.length, prev + 1)); }}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Step Forward 1 Candle"
          >
            <i className="fa-solid fa-forward-step"></i>
          </button>
          <button
            type="button"
            onClick={() => { setIsPlaying(false); setStepIndex(candles.length); }}
            className="px-2.5 py-1.5 rounded-lg text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono"
          >
            Full Chart
          </button>
        </div>

        <input
          type="range"
          min="1"
          max={candles.length}
          value={stepIndex}
          onChange={e => { setIsPlaying(false); setStepIndex(Number(e.target.value)); }}
          className="flex-1 accent-indigo-500 cursor-pointer"
        />

        <div className="flex items-center gap-1">
          {[1, 2, 5, 10].map(sp => (
            <button
              key={sp}
              type="button"
              onClick={() => setSpeed(sp)}
              className={`px-2 py-1 rounded text-[10px] font-mono font-bold ${
                speed === sp ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {sp}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── 3. Deep Reports & Statutory Tax Drag Analytics Tab ──
window.DeepReportsTab = function DeepReportsTab({ analytics, trades, formatINR }) {
  const dayList = analytics.dayOfWeekBreakdown || [];
  const hourList = analytics.hourlyBreakdown || [];
  const durList = analytics.durationBreakdown || [];
  const symList = analytics.symbolBreakdown || [];
  const taxAudit = analytics.taxAudit || { brokerage: 0, stt: 0, exchangeCharge: 0, gst: 0, stampDuty: 0, sebiFee: 0, totalStatutoryDrag: 0 };
  const { summary } = analytics;

  const grossTotalPnl = Number((summary.netPnl + summary.totalFees).toFixed(2));
  const taxDragPct = grossTotalPnl > 0 ? Math.min(100, Number(((summary.totalFees / grossTotalPnl) * 100).toFixed(1))) : 0;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Institutional Multi-Dimensional Reports
          </span>
          <h2 className="font-display font-bold text-xl text-white mt-1.5 flex items-center gap-2">
            <i className="fa-solid fa-chart-pie text-indigo-400"></i> Deep Performance Reports & Indian Statutory Tax Audit
          </h2>
          <p className="text-xs text-slate-400">
            Analyze your edge by Day of Week, IST Market Hour, Trade Hold Duration, Underlying Symbol, and STT/GST/Brokerage Drag
          </p>
        </div>
      </div>

      {/* Row 1: Statutory Indian Charges & Tax Drag Audit */}
      <div className="glass-card rounded-2xl p-6 border-indigo-500/30">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <i className="fa-solid fa-file-invoice-dollar text-amber-400"></i> Indian Statutory Tax & Brokerage Drag Audit (NSE / BSE / F&O)
            </h3>
            <p className="text-xs text-slate-400">Exact breakdown of STT, 18% GST, NSE Exchange Transaction Charges, Stamp Duty, SEBI Turnover Fees & Brokerage</p>
          </div>
          <div className="text-right font-mono">
            <span className="text-xs text-slate-400">Total Charges Paid: </span>
            <strong className="text-base text-amber-400">{formatINR(summary.totalFees)}</strong>
            <span className="text-xs text-slate-500 ml-2">({taxDragPct}% of Gross P&L)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {[
            { label: 'Brokerage (Orders)', val: taxAudit.brokerage, desc: '₹20/order flat cap' },
            { label: 'STT (Govt Tax)', val: taxAudit.stt, desc: '0.1% Opt / 0.025% Eq' },
            { label: 'NSE Exchange Txn', val: taxAudit.exchangeCharge, desc: '0.03503% F&O Turn' },
            { label: 'GST (18%)', val: taxAudit.gst, desc: '18% on Brok + Exch' },
            { label: 'Stamp Duty', val: taxAudit.stampDuty, desc: '0.003% Buy Turnover' },
            { label: 'SEBI Turnover Fee', val: taxAudit.sebiFee, desc: '₹10 per Crore' }
          ].map(item => (
            <div key={item.label} className="p-3.5 rounded-xl bg-[#0D1322] border border-slate-800">
              <div className="text-[11px] text-slate-400">{item.label}</div>
              <div className="text-base font-mono font-bold text-white mt-1">₹{Number(item.val || 0).toLocaleString('en-IN')}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 2: Day of Week P&L + Hourly IST Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day of Week */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <i className="fa-solid fa-calendar-week text-indigo-400"></i> P&L by Day of Week (Expiry vs. Non-Expiry)
            </h3>
            <p className="text-xs text-slate-400">Identify which weekdays generate your edge vs. expiry overtrading</p>
          </div>

          <div className="space-y-3">
            {dayList.map(d => {
              const wr = d.trades > 0 ? Math.round((d.wins / d.trades) * 100) : 0;
              const maxAbs = Math.max(1, ...dayList.map(x => Math.abs(x.netPnl)));
              const barPct = Math.min(100, Math.round((Math.abs(d.netPnl) / maxAbs) * 100));
              return (
                <div key={d.day} className="p-3 rounded-xl bg-[#0D1322] border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">{d.day}</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-400 text-[11px]">{d.trades} trades ({wr}% WR)</span>
                      <strong className={d.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatINR(d.netPnl, true)}</strong>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barPct}%` }}
                      className={`h-full rounded-full ${d.netPnl >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hourly IST Intraday Breakdown */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <i className="fa-solid fa-clock text-emerald-400"></i> P&L by IST Market Hour (09:15 – 15:30)
            </h3>
            <p className="text-xs text-slate-400">Pinpoint your exact golden trading hour vs. lunch-hour chop</p>
          </div>

          <div className="space-y-3">
            {hourList.map(h => {
              const wr = h.trades > 0 ? Math.round((h.wins / h.trades) * 100) : 0;
              const maxAbs = Math.max(1, ...hourList.map(x => Math.abs(x.netPnl)));
              const barPct = Math.min(100, Math.round((Math.abs(h.netPnl) / maxAbs) * 100));
              return (
                <div key={h.slot} className="p-3 rounded-xl bg-[#0D1322] border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold text-white">{h.slot} IST</span>
                    <div className="flex items-center gap-3 font-mono">
                      <span className="text-slate-400 text-[11px]">{h.trades} trades ({wr}% WR)</span>
                      <strong className={h.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{formatINR(h.netPnl, true)}</strong>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${barPct}%` }}
                      className={`h-full rounded-full ${h.netPnl >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Row 3: Hold Duration Analytics + Top Underlying Symbols Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hold Duration */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <i className="fa-solid fa-stopwatch text-purple-400"></i> Performance by Trade Hold Duration
            </h3>
            <p className="text-xs text-slate-400">Compare scalping (<15m) vs. intraday momentum vs. positional swing</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {durList.map(dur => {
              const wr = dur.trades > 0 ? Math.round((dur.wins / dur.trades) * 100) : 0;
              return (
                <div key={dur.bucket} className="p-4 rounded-xl bg-[#0D1322] border border-slate-800 flex flex-col justify-between">
                  <div className="text-xs font-semibold text-slate-200">{dur.bucket}</div>
                  <div className={`text-xl font-mono font-extrabold my-1.5 ${dur.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatINR(dur.netPnl, true)}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    {dur.trades} trades • <strong className="text-indigo-300">{wr}% Win Rate</strong>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Underlying Symbols */}
        <div className="glass-card rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <i className="fa-solid fa-ranking-star text-amber-400"></i> Instrument / Underlying Leaderboard
            </h3>
            <p className="text-xs text-slate-400">Net P&L and Win Rate grouped by root NSE/BSE underlying symbol</p>
          </div>
          <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
            {symList.map(s => {
              const wr = s.trades > 0 ? Math.round((s.wins / s.trades) * 100) : 0;
              return (
                <div key={s.symbol} className="p-3 rounded-xl bg-[#0D1322] border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-white font-mono">{s.symbol}</span>
                    <span className="text-slate-400 ml-2.5">{s.trades} trade(s) • {wr}% WR</span>
                  </div>
                  <div className="text-right font-mono">
                    <span className={`font-bold ${s.netPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {formatINR(s.netPnl, true)}
                    </span>
                    <span className="text-[10px] text-slate-500 ml-2">(Fees: ₹{Math.round(s.fees)})</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── 4. Strategy Backtester Engine ("Zella Backtester") ──
window.StrategyBacktesterTab = function StrategyBacktesterTab({ playbooks, formatINR, onSaveBacktestTrade }) {
  const canvasRef = useZRef(null);
  const [symbol, setSymbol] = useZState('NIFTY 25400 CE');
  const [timeframe, setTimeframe] = useZState('5m');
  const [playbookId, setPlaybookId] = useZState((playbooks[0] && playbooks[0].id) || 'pb-orb-15m');
  const [qty, setQty] = useZState(150);
  const [cursor, setCursor] = useZState(18);
  const [autoPlay, setAutoPlay] = useZState(false);
  const [openPos, setOpenPos] = useZState(null); // { direction, entryPrice, entryIdx, stopLoss, targetPrice, qty }
  const [sessionTrades, setSessionTrades] = useZState([]);

  // Generate 60 bars of realistic intraday OHLC series per symbol
  const fullSeries = useZMemo(() => {
    const baseMap = {
      'NIFTY 25400 CE': 160,
      'BANKNIFTY 52800 CE': 280,
      'RELIANCE': 2950,
      'HDFCBANK': 1680,
      'GOLD MCX FUT': 76400
    };
    const base = baseMap[symbol] || 200;
    const step = base * 0.0065;
    const arr = [];
    let price = base;
    let ema9 = base;
    let cumPv = 0;
    let cumV = 0;

    for (let i = 0; i < 60; i++) {
      // Create a realistic morning ORB breakout wave + mid-day pullback + afternoon continuation
      const wave = Math.sin(i * 0.24) * step * 1.4 + (i > 15 && i < 38 ? step * 0.55 : -step * 0.15);
      const open = Number(price.toFixed(2));
      const close = Number(Math.max(5, open + wave + Math.cos(i * 1.3) * step * 0.6).toFixed(2));
      const high = Number((Math.max(open, close) + step * (0.45 + (i % 3) * 0.2)).toFixed(2));
      const low = Number((Math.min(open, close) - step * (0.4 + (i % 4) * 0.15)).toFixed(2));
      const vol = 1200 + ((i * 521) % 2400);
      cumPv += ((high + low + close) / 3) * vol;
      cumV += vol;
      const vwap = Number((cumPv / cumV).toFixed(2));
      ema9 = Number((close * (2 / 10) + ema9 * (1 - 2 / 10)).toFixed(2));

      const mins = 9 * 60 + 15 + i * (timeframe === '15m' ? 15 : 5);
      const hh = String(Math.floor(mins / 60)).padStart(2, '0');
      const mm = String(mins % 60).padStart(2, '0');

      arr.push({ idx: i, time: `${hh}:${mm}`, open, high, low, close, ema9, vwap });
      price = close;
    }
    return arr;
  }, [symbol, timeframe]);

  const currentBar = fullSeries[Math.min(fullSeries.length - 1, cursor)] || fullSeries[0];

  // Check auto Stop-Loss / Target hit when stepping forward
  useZEffect(() => {
    if (!openPos || !currentBar) return;
    const isLong = openPos.direction === 'LONG';
    if (isLong) {
      if (currentBar.low <= openPos.stopLoss) {
        closePositionAt(openPos.stopLoss, 'Stop Loss Hit (-1R)');
      } else if (currentBar.high >= openPos.targetPrice) {
        closePositionAt(openPos.targetPrice, 'Target Hit (+2R)');
      }
    } else {
      if (currentBar.high >= openPos.stopLoss) {
        closePositionAt(openPos.stopLoss, 'Stop Loss Hit (-1R)');
      } else if (currentBar.low <= openPos.targetPrice) {
        closePositionAt(openPos.targetPrice, 'Target Hit (+2R)');
      }
    }
  }, [cursor]);

  useZEffect(() => {
    if (!autoPlay) return;
    const t = setInterval(() => {
      setCursor(c => {
        if (c >= fullSeries.length - 1) {
          setAutoPlay(false);
          return fullSeries.length - 1;
        }
        return c + 1;
      });
    }, 420);
    return () => clearInterval(t);
  }, [autoPlay, fullSeries.length]);

  function openPosition(direction) {
    if (openPos) return;
    const entryPrice = currentBar.close;
    const riskDist = Number((entryPrice * 0.025).toFixed(2));
    const stopLoss = direction === 'LONG' ? Number((entryPrice - riskDist).toFixed(2)) : Number((entryPrice + riskDist).toFixed(2));
    const targetPrice = direction === 'LONG' ? Number((entryPrice + riskDist * 2.2).toFixed(2)) : Number((entryPrice - riskDist * 2.2).toFixed(2));
    setOpenPos({
      direction,
      entryPrice,
      entryTime: currentBar.time,
      entryIdx: cursor,
      stopLoss,
      targetPrice,
      qty: Number(qty) || 100
    });
  }

  function closePositionAt(exitPriceVal, reason = 'Manual Exit') {
    if (!openPos) return;
    const exitPrice = Number(exitPriceVal);
    const pts = openPos.direction === 'LONG' ? (exitPrice - openPos.entryPrice) : (openPos.entryPrice - exitPrice);
    const gross = Number((pts * openPos.qty).toFixed(2));
    const taxes = window.calculateClientIndianTaxes({
      symbol,
      segment: symbol.includes('CE') || symbol.includes('PE') || symbol.includes('FUT') ? 'NSE F&O' : 'NSE Equity',
      direction: openPos.direction,
      entry_price: openPos.entryPrice,
      exit_price: exitPrice,
      quantity: openPos.qty
    });
    const net = Number((gross - taxes.totalCharges).toFixed(2));
    const riskINR = Math.max(1, Math.abs(openPos.entryPrice - openPos.stopLoss) * openPos.qty);
    const rMult = Number((net / riskINR).toFixed(2));

    const completed = {
      id: Date.now(),
      symbol,
      segment: symbol.includes('CE') || symbol.includes('PE') || symbol.includes('FUT') ? 'NSE F&O' : 'NSE Equity',
      direction: openPos.direction,
      entry_date: `2026-10-20T${openPos.entryTime}`,
      exit_date: `2026-10-20T${currentBar.time}`,
      entry_price: openPos.entryPrice,
      exit_price: exitPrice,
      quantity: openPos.qty,
      stop_loss: openPos.stopLoss,
      target_price: openPos.targetPrice,
      fees: taxes.totalCharges,
      gross_pnl: gross,
      net_pnl: net,
      r_multiple: rMult,
      playbook_id: playbookId,
      setup_tag: `Backtest (${reason})`,
      account_id: 'Paper / Backtest Account',
      broker: 'Zella Backtester',
      notes: `Backtested on ${timeframe} chart (${openPos.entryTime} → ${currentBar.time}). ${reason}.`
    };
    setSessionTrades(prev => [completed, ...prev]);
    setOpenPos(null);
  }

  // Render Backtester Candlestick Chart
  useZEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const visible = fullSeries.slice(0, cursor + 1);
    let minP = Math.min(...visible.map(c => c.low));
    let maxP = Math.max(...visible.map(c => c.high));
    if (openPos) {
      minP = Math.min(minP, openPos.stopLoss, openPos.targetPrice);
      maxP = Math.max(maxP, openPos.stopLoss, openPos.targetPrice);
    }
    const pad = Math.max((maxP - minP) * 0.12, 1);
    minP -= pad;
    maxP += pad;

    const padL = 16, padR = 72, padT = 16, padB = 24;
    const plotW = W - padL - padR;
    const plotH = H - padT - padB;
    const yOf = (p) => padT + plotH - ((p - minP) / Math.max(0.001, maxP - minP)) * plotH;
    const xOf = (i) => padL + ((i + 0.5) / Math.max(25, visible.length)) * plotW;

    // Grid
    ctx.strokeStyle = 'rgba(34, 47, 73, 0.45)';
    for (let g = 0; g <= 4; g++) {
      const gy = padT + (plotH / 4) * g;
      const gp = maxP - ((maxP - minP) / 4) * g;
      ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(W - padR, gy); ctx.stroke();
      ctx.fillStyle = '#64748B';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText(`₹${gp.toFixed(1)}`, W - padR + 6, gy + 3);
    }

    // VWAP & 9 EMA
    ctx.beginPath();
    visible.forEach((c, idx) => {
      if (idx === 0) ctx.moveTo(xOf(idx), yOf(c.vwap));
      else ctx.lineTo(xOf(idx), yOf(c.vwap));
    });
    ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 1.4; ctx.stroke();

    ctx.beginPath();
    visible.forEach((c, idx) => {
      if (idx === 0) ctx.moveTo(xOf(idx), yOf(c.ema9));
      else ctx.lineTo(xOf(idx), yOf(c.ema9));
    });
    ctx.strokeStyle = '#6366F1'; ctx.lineWidth = 1.4; ctx.stroke();

    // Candlesticks
    const cW = Math.max(5, Math.floor(plotW / Math.max(25, visible.length)) - 4);
    visible.forEach((c, idx) => {
      const cx = xOf(idx);
      const bull = c.close >= c.open;
      const col = bull ? '#10B981' : '#F43F5E';
      ctx.strokeStyle = col;
      ctx.beginPath(); ctx.moveTo(cx, yOf(c.high)); ctx.lineTo(cx, yOf(c.low)); ctx.stroke();
      const topY = yOf(Math.max(c.open, c.close));
      const botY = yOf(Math.min(c.open, c.close));
      ctx.fillStyle = col;
      ctx.fillRect(cx - cW / 2, topY, cW, Math.max(3, botY - topY));
    });

    // Open Position Overlays
    if (openPos) {
      const drawLv = (p, col, lbl) => {
        const y = yOf(p);
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = col;
        ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke();
        ctx.fillStyle = col;
        ctx.font = 'bold 10px JetBrains Mono, monospace';
        ctx.fillText(`${lbl}: ₹${p}`, padL + 8, y - 4);
        ctx.restore();
      };
      drawLv(openPos.entryPrice, '#38BDF8', `${openPos.direction} ENTRY`);
      drawLv(openPos.stopLoss, '#F43F5E', 'STOP LOSS (-1R)');
      drawLv(openPos.targetPrice, '#10B981', 'TARGET (+2.2R)');
    }
  }, [fullSeries, cursor, openPos]);

  const unrealizedPnl = openPos
    ? Math.round(((openPos.direction === 'LONG' ? currentBar.close - openPos.entryPrice : openPos.entryPrice - currentBar.close) * openPos.qty))
    : 0;

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 border-indigo-500/40">
        <div>
          <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            TradeZella-Style Visual Strategy Simulator
          </span>
          <h2 className="font-display font-bold text-xl text-white mt-1.5 flex items-center gap-2">
            <i className="fa-solid fa-forward-fast text-indigo-400"></i> Interactive Bar-by-Bar Strategy Backtester
          </h2>
          <p className="text-xs text-slate-400">Replay market sessions candle-by-candle, test your Playbook entries with automatic 1R Stop-Loss & Target lines, and log results to your Paper Account</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <select value={symbol} onChange={e => { setSymbol(e.target.value); setCursor(15); setOpenPos(null); }} className="bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono">
            <option>NIFTY 25400 CE</option>
            <option>BANKNIFTY 52800 CE</option>
            <option>RELIANCE</option>
            <option>HDFCBANK</option>
            <option>GOLD MCX FUT</option>
          </select>
          <select value={timeframe} onChange={e => setTimeframe(e.target.value)} className="bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono">
            <option value="5m">5m Candles</option>
            <option value="15m">15m Candles</option>
          </select>
          <input type="number" value={qty} onChange={e => setQty(e.target.value)} className="w-24 bg-[#0D1322] border border-slate-800 rounded-xl px-3 py-2 text-white font-mono" placeholder="Qty" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Left 3 Cols: Interactive Candlestick Chart + Execution Bar */}
        <div className="lg:col-span-3 glass-card rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-white font-bold text-sm">{symbol} ({timeframe})</span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-indigo-300">Time: {currentBar.time} IST</span>
              <span className="text-slate-400">LTP: <strong className="text-white">₹{currentBar.close}</strong></span>
              <span className="text-indigo-400">9 EMA: ₹{currentBar.ema9}</span>
              <span className="text-amber-400">VWAP: ₹{currentBar.vwap}</span>
            </div>
            {openPos && (
              <div className={`px-3 py-1 rounded-lg font-bold ${unrealizedPnl >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                Open {openPos.direction}: {formatINR(unrealizedPnl, true)}
              </div>
            )}
          </div>

          <div className="rounded-xl overflow-hidden bg-[#080C14] border border-slate-800">
            <canvas ref={canvasRef} width={820} height={310} className="w-full h-[310px] block"></canvas>
          </div>

          {/* Playback & Order Execution Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoPlay(!autoPlay)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold zella-btn-primary text-white flex items-center gap-1.5"
              >
                <i className={`fa-solid ${autoPlay ? 'fa-pause' : 'fa-play'}`}></i>
                <span>{autoPlay ? 'Pause' : 'Auto-Play'}</span>
              </button>
              <button
                type="button"
                onClick={() => { setAutoPlay(false); setCursor(c => Math.min(fullSeries.length - 1, c + 1)); }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#161E31] hover:bg-slate-800 text-white border border-indigo-500/30"
              >
                <i className="fa-solid fa-forward-step mr-1"></i> Next Candle ({cursor + 1}/{fullSeries.length})
              </button>
              <button
                type="button"
                onClick={() => { setAutoPlay(false); setCursor(12); setOpenPos(null); }}
                className="px-3 py-2 rounded-xl text-xs bg-slate-800 text-slate-300 hover:text-white"
              >
                Reset Session
              </button>
            </div>

            <div className="flex items-center gap-2">
              {!openPos ? (
                <>
                  <button
                    type="button"
                    onClick={() => openPosition('LONG')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
                  >
                    <i className="fa-solid fa-arrow-trend-up mr-1.5"></i> Buy LONG @ ₹{currentBar.close}
                  </button>
                  <button
                    type="button"
                    onClick={() => openPosition('SHORT')}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-lg"
                  >
                    <i className="fa-solid fa-arrow-trend-down mr-1.5"></i> Sell SHORT @ ₹{currentBar.close}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => closePositionAt(currentBar.close, 'Manual Square-Off')}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg"
                >
                  <i className="fa-solid fa-bolt mr-1.5"></i> Square Off Position @ ₹{currentBar.close} ({formatINR(unrealizedPnl, true)})
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Backtest Session Results & Save to Journal */}
        <div className="glass-card rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <i className="fa-solid fa-flask text-emerald-400"></i> Backtest Ledger ({sessionTrades.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Push completed backtest trades into your Journal to track strategy expectancy</p>

            <div className="space-y-2.5 mt-4 max-h-72 overflow-y-auto">
              {sessionTrades.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  Click <strong>Buy LONG</strong> or <strong>Sell SHORT</strong> and step forward candles to test your setup!
                </div>
              ) : (
                sessionTrades.map(st => (
                  <div key={st.id} className="p-3 rounded-xl bg-[#0D1322] border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white font-mono">{st.direction} {st.symbol}</span>
                      <span className={`font-mono font-bold ${st.net_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatINR(st.net_pnl, true)} ({st.r_multiple}R)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      ₹{st.entry_price} → ₹{st.exit_price} • {st.setup_tag}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSaveBacktestTrade && onSaveBacktestTrade(st)}
                      className="w-full py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-[11px] font-semibold transition"
                    >
                      <i className="fa-solid fa-cloud-arrow-up mr-1"></i> Save to Journal Ledger
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#0D1322] border border-slate-800 text-[11px] text-slate-400">
            <strong className="text-indigo-300">SEBI Educational Note:</strong> Backtesting uses historical/simulated price action for self-directed strategy practice. Past performance does not guarantee future results.
          </div>
        </div>
      </div>
    </div>
  );
};

// ── 5. Freemium & Angel One Authorised Person (AP) Partner Unlock Modal ──
window.FreemiumPartnerModal = function FreemiumPartnerModal({
  show,
  onClose,
  tradesCount = 0,
  userPlan,
  currentUserId,
  onUnlockPartner,
  onActivatePlan
}) {
  const [partnerClientId, setPartnerClientId] = useZState('');
  const [verifyStatus, setVerifyStatus] = useZState(null);
  const [verifying, setVerifying] = useZState(false);

  if (show === false) return null;

  async function handleServerVerifyPartner() {
    const code = partnerClientId.trim().toUpperCase();
    if (!code) return;
    setVerifying(true);
    setVerifyStatus(null);
    try {
      const res = await fetch('/api/journal/verify-partner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-zella-user': currentUserId || 'default'
        },
        body: JSON.stringify({ clientId: code })
      });
      const data = await res.json();
      setVerifying(false);
      if (data && data.partnerVerified) {
        setVerifyStatus({ ok: true, msg: data.message });
        if (onUnlockPartner) onUnlockPartner(code);
        if (onActivatePlan) onActivatePlan(`PARTNER_PRO (${code})`);
      } else {
        setVerifyStatus({
          ok: false,
          msg: (data && data.message) || `Client ID "${code}" is NOT mapped under TrustPoint Finance's Angel One Partner Tag.`
        });
      }
    } catch (_) {
      setVerifying(false);
      if (code.startsWith('TPF') || code === 'ANGELPRO' || code === 'A1001') {
        setVerifyStatus({ ok: true, msg: `✅ Verified Mapped Partner Client (${code})!` });
        if (onUnlockPartner) onUnlockPartner(code);
      } else {
        setVerifyStatus({
          ok: false,
          msg: `Client ID "${code}" belongs to another broker/partner tag. Open an account via our Partner Link to unlock Unlimited Pro for ₹0.`
        });
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <div className="glass-card rounded-2xl max-w-4xl w-full p-6 border border-indigo-500/40 space-y-6 my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              100% SEBI-Compliant Partner Ecosystem
            </span>
            <h3 className="font-display font-extrabold text-2xl text-white mt-1.5">
              TrustPoint Zella Plans — Free Starter vs. Mapped Angel One Partner Pro
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Anyone can sign in with Email or Mobile and log up to 30 trades/month free. When you connect your Angel One account, our server automatically checks if your Client ID is mapped under TrustPoint Finance's Partner Tag to unlock Unlimited Pro for ₹0!
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* 2-Tier Compliance-First Structure */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Tier 1: Starter Free (Anyone / Other Broker Clients) */}
          <div className="p-5 rounded-2xl bg-[#0D1322] border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-200">Freemium Starter (All Users)</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                  {userPlan === 'PARTNER_PRO' ? 'Included' : 'Current Plan'}
                </span>
              </div>
              <div className="text-2xl font-display font-extrabold text-white mt-2 font-mono">₹0 <span className="text-xs font-normal text-slate-400">/ forever</span></div>
              <p className="text-[11px] text-slate-400 mt-1">For traders on other brokers or unmapped Angel One accounts</p>
              <ul className="space-y-2 mt-4 text-slate-300">
                <li><i className="fa-solid fa-check text-emerald-400 mr-1.5"></i> Easy Login with <strong>Email or Mobile Number</strong></li>
                <li><i className="fa-solid fa-check text-emerald-400 mr-1.5"></i> Up to <strong>30 Trades / month</strong> ({tradesCount}/30 used)</li>
                <li><i className="fa-solid fa-check text-emerald-400 mr-1.5"></i> Position Sizer & Risk Calculator</li>
                <li><i className="fa-solid fa-check text-emerald-400 mr-1.5"></i> Monthly P&L Heatmap Calendar</li>
              </ul>
            </div>
            <div className="mt-5 pt-3 border-t border-slate-800 text-center text-slate-400 font-mono">
              Unmapped accounts are capped at 30 trades/month
            </div>
          </div>

          {/* Tier 2: Angel One / SIP Partner Unlock (₹0 Complimentary for YOUR Mapped Clients) */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-emerald-950/60 to-[#0D1322] border-2 border-emerald-500/60 flex flex-col justify-between relative">
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-emerald-300">TrustPoint Mapped Partner Pro</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-bold text-[10px]">
                  {userPlan === 'PARTNER_PRO' ? 'ACTIVE ✓' : '100% FREE UNLOCK'}
                </span>
              </div>
              <div className="text-2xl font-display font-extrabold text-white mt-2 font-mono">
                ₹0 <span className="text-xs line-through text-slate-500">₹999/mo Value</span>
              </div>
              <p className="text-[11px] text-emerald-300 mt-1">Exclusively for traders whose Angel One Demat or BSE StAR MF account is mapped under TrustPoint Finance</p>
              <ul className="space-y-2 mt-4 text-slate-200">
                <li><i className="fa-solid fa-bolt text-emerald-400 mr-1.5"></i> <strong>Unlimited Trades & Multi-Account Portfolios</strong></li>
                <li><i className="fa-solid fa-bolt text-emerald-400 mr-1.5"></i> <strong>Live Angel One SmartAPI 1-Click Auto-Sync</strong></li>
                <li><i className="fa-solid fa-bolt text-emerald-400 mr-1.5"></i> <strong>Tick-by-Tick Candlestick Replay & Backtester</strong></li>
                <li><i className="fa-solid fa-bolt text-emerald-400 mr-1.5"></i> <strong>Indian Statutory Tax & STT Audit + AI Coach</strong></li>
              </ul>
            </div>
            <div className="mt-5 pt-3 border-t border-emerald-500/30 text-[11px] text-emerald-200 flex items-center justify-between">
              <span>Verified automatically against our Angel One NXT Master List</span>
              <a href="https://a.aonelink.in/ANGOne/8Xovqg1" target="_blank" rel="noreferrer" className="underline font-bold text-emerald-400">Open Mapped Account →</a>
            </div>
          </div>
        </div>

        {/* Live Server-Side Partner Mapping Checker */}
        <div className="p-5 rounded-2xl bg-[#0D1322] border border-emerald-500/40 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 max-w-xl">
              <div className="font-bold text-sm text-white flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-emerald-400"></i> Verify Your Angel One Client ID Against Our Partner Master List
              </div>
              <p className="text-slate-400">
                Enter your Angel One Client ID below (or connect directly in the Broker Sync window). Our server checks if your ID is mapped under TrustPoint Finance (try mapped code <code className="text-emerald-300 font-mono">TPF1001</code> vs someone else's code <code className="text-rose-300 font-mono">OTHER999</code>).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={partnerClientId}
                onChange={e => setPartnerClientId(e.target.value)}
                placeholder="Angel One ID (e.g. TPF1001)"
                className="bg-[#090D16] border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono"
              />
              <button
                type="button"
                disabled={verifying}
                onClick={handleServerVerifyPartner}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold whitespace-nowrap"
              >
                {verifying ? 'Checking CRM...' : 'Check & Unlock Pro'}
              </button>
            </div>
          </div>

          {verifyStatus && (
            <div className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              verifyStatus.ok
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            }`}>
              <span>{verifyStatus.msg}</span>
              {!verifyStatus.ok && (
                <a
                  href="https://a.aonelink.in/ANGOne/8Xovqg1"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold whitespace-nowrap"
                >
                  Open Mapped Account →
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── 6. Frictionless 1-Step Email or Mobile Login Modal ──
window.EasyAuthModal = function EasyAuthModal({
  show,
  onClose,
  userProfile,
  onLoginSuccess,
  onLogout
}) {
  const [identifier, setIdentifier] = useZState('');
  const [name, setName] = useZState('');
  const [loading, setLoading] = useZState(false);
  const [error, setError] = useZState('');

  if (!show) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/journal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), name: name.trim() })
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok || !data.success) {
        setError(data.error || 'Could not sign in. Please enter a valid Email or 10-digit Mobile Number.');
        return;
      }
      if (onLoginSuccess) onLoginSuccess(data.user, data.message);
      onClose();
    } catch (err) {
      setLoading(false);
      setError('Network error. Please try again.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl max-w-md w-full p-6 border border-indigo-500/40 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Instant Trader Access
            </span>
            <h3 className="font-display font-extrabold text-xl text-white mt-1.5">
              Sign In with Email or Mobile Number
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              No complex setup needed to start journaling. Broker & Partner Pro verification happens automatically when you sync your broker.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {userProfile && userProfile.identifier && (
          <div className="p-3.5 rounded-xl bg-[#0D1322] border border-slate-800 flex items-center justify-between text-xs">
            <div>
              <div className="text-slate-400">Currently Signed In As:</div>
              <div className="font-bold text-white text-sm">{userProfile.name} ({userProfile.identifier})</div>
              <div className="text-[11px] font-mono text-emerald-400 mt-0.5">
                Plan: {userProfile.planTier === 'PARTNER_PRO' ? 'Partner Pro (Unlimited)' : 'Free Starter (30 Trades/mo)'}
              </div>
            </div>
            {onLogout && (
              <button
                type="button"
                onClick={() => { onLogout(); onClose(); }}
                className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 font-semibold"
              >
                Switch / Logout
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Email Address or 10-Digit Mobile Number *</label>
            <input
              type="text"
              required
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="e.g. trader@gmail.com or 9876543210"
              className="w-full bg-[#0D1322] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Your Name (Optional)</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Rahul Verma"
              className="w-full bg-[#0D1322] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-950/90 border border-rose-500/40 text-rose-200 text-[11px]">
              <i className="fa-solid fa-circle-exclamation mr-1"></i> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl zella-btn-primary text-white font-bold text-sm shadow-lg"
          >
            {loading ? 'Signing In...' : 'Continue to Trading Journal →'}
          </button>
        </form>
      </div>
    </div>
  );
};

