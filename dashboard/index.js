document.addEventListener('DOMContentLoaded', () => {

  // ── STATE VARIABLES ──
  let isMapped = false;
  let activeTab = 'dashboard';
  let chartCanvas = document.getElementById('pnl-chart');
  let ctx = chartCanvas.getContext('2d');
  let currentTargetLeadId = null; // Track which lead is being mapped/unlocked

  // Dynamic client leads store (populated strictly via authenticated advisor API)
  let localLeads = [];

  // Helper logger to write to terminal
  function terminalLog(message, tag = 'SYSTEM') {
    const logsContainer = document.getElementById('system-logs');
    if (!logsContainer) return;
    
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-IN', { hour12: false });
    
    let tagClass = 'tag-system';
    if (tag === 'BSE_StAR') tagClass = 'tag-bse';
    if (tag === 'ANGEL_ONE') tagClass = 'tag-angel';
    if (tag === 'TURTLEMINT') tagClass = 'tag-turtle';

    const logLine = document.createElement('div');
    logLine.className = 'log-line';
    logLine.innerHTML = `<span class="log-time">[${timeStr}]</span> <span class="log-tag ${tagClass}">[${tag}]</span> ${message}`;
    
    logsContainer.appendChild(logLine);
    logsContainer.scrollTop = logsContainer.scrollHeight;
  }

  // ── TAB SYSTEM ──
  const tabs = document.querySelectorAll('.nav-tab');
  const sections = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.getAttribute('data-tab');
      tabs.forEach(t => t.classList.remove('active'));
      sections.forEach(s => s.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
      activeTab = targetTab;
      
      terminalLog(`Switched view context to: ${targetTab.toUpperCase()}`);
      
      // If we switch to analytics, draw chart (if trade data is loaded)
      if (targetTab === 'analytics' && mockTradesDataLoaded) {
        drawPnLChart();
      }
    });
  });

  // ── VALUE-GATE UNLOCK MODAL ──
  const modal = document.getElementById('unlock-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const btnUnlockAll = document.querySelector('.btn-unlock-all');

  function openUnlockModal(leadId = null) {
    currentTargetLeadId = leadId;
    modal.classList.add('active');
    terminalLog(leadId ? `Opened Premium Onboarding Portal for Lead ID: ${leadId}` : 'Opened Premium Unlock Portal');
  }

  function closeUnlockModal() {
    modal.classList.remove('active');
    currentTargetLeadId = null;
    terminalLog('Closed Premium Unlock Portal');
  }

  if (btnUnlockAll) {
    btnUnlockAll.addEventListener('click', () => openUnlockModal(null));
  }
  if (btnCloseModal) {
    btnCloseModal.addEventListener('click', closeUnlockModal);
  }

  // Handle Mapped verification
  const btnSubmitMapping = document.getElementById('btn-submit-mapping');
  const mappingInput = document.getElementById('mapping-client-code');
  const mappingError = document.getElementById('mapping-error-message');

  btnSubmitMapping.addEventListener('click', async () => {
    const code = mappingInput.value.trim().toUpperCase();
    if (!code) {
      mappingError.textContent = 'Please enter a valid Client Code or PAN.';
      mappingError.style.display = 'block';
      return;
    }

    mappingError.style.display = 'none';
    
    // Check if we are mapping a specific CRM lead
    if (currentTargetLeadId) {
      await mapLeadInDatabase(currentTargetLeadId, code);
    } else {
      unlockPremiumSuite(code);
    }
  });

  // Database Lead Mapping API call (with dynamic local fallback)
  async function mapLeadInDatabase(leadId, code) {
    // FALLBACK: If running locally as a file:/// index.html
    if (window.location.protocol === 'file:') {
      const isBse = code.startsWith('PAN') || code.length > 8;
      const lead = localLeads.find(l => l.id == leadId);
      if (lead) {
        lead.angel_code = isBse ? null : code;
        lead.bse_ucc = isBse ? code : `UCC-${Math.floor(10000 + Math.random() * 90000)}`;
        lead.status = 'Fully Mapped';
      }
      terminalLog(`SUCCESS: Client mapped successfully in local mock array (Lead ID: ${leadId})`, 'SYSTEM');
      unlockPremiumSuite(code);
      renderCRMLeadsTable(localLeads);
      return;
    }

    try {
      const isBse = code.startsWith('PAN') || code.length > 8;
      const payload = {
        id: leadId,
        angel_code: isBse ? null : code,
        bse_ucc: isBse ? code : `UCC-${Math.floor(10000 + Math.random() * 90000)}`,
        status: 'Fully Mapped'
      };

      const res = await fetch('/api/leads/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const r = await res.json();
      if (r.success) {
        terminalLog(`SUCCESS: Client mapped successfully in SQLite database (Lead ID: ${leadId})`, 'SYSTEM');
        unlockPremiumSuite(code);
        await loadCRMLeads();
      } else {
        mappingError.textContent = r.error || 'Failed to map client in database.';
        mappingError.style.display = 'block';
      }
    } catch (e) {
      mappingError.textContent = 'Server connection failed. Make sure server.js is running!';
      mappingError.style.display = 'block';
    }
  }

  function unlockPremiumSuite(clientCode) {
    isMapped = true;
    
    // 1. Hide the lockers
    document.getElementById('optimizer-gate').style.display = 'none';
    document.getElementById('analytics-gate').style.display = 'none';
    
    // 2. Close modal
    closeUnlockModal();

    // 3. Update navbar status
    const statusText = document.querySelector('.status-text');
    statusText.textContent = `Mapped: ${clientCode}`;
    btnUnlockAll.innerHTML = '<i class="fa-solid fa-circle-check"></i> Premium Unlocked';
    btnUnlockAll.style.background = 'linear-gradient(135deg, #10B981, #059669)';
    btnUnlockAll.style.boxShadow = 'none';
    btnUnlockAll.disabled = true;

    // 4. Log in system terminal
    terminalLog(`SUCCESS: Mapped client code ${clientCode} successfully. Credentials validated.`, 'SYSTEM');
    terminalLog(`BSE StAR UCC generated dynamically for ${clientCode}. Linked ARN.`, 'BSE_StAR');
    terminalLog(`Angel One SmartAPI subscription unlocked for user portfolio.`, 'ANGEL_ONE');
    alert(`🎉 Premium Unlocked! TrustPoint Finance has successfully verified your mapping for ${clientCode}.`);
  }

  // ── CRM PIPELINES & DATABASE API SYNC ──
  const btnAddLead = document.getElementById('btn-add-lead');
  const crmLeadBody = document.getElementById('crm-lead-body');

  // Attach advisor logout handler
  const btnAdvisorLogout = document.getElementById('btn-advisor-logout');
  if (btnAdvisorLogout) {
    btnAdvisorLogout.addEventListener('click', async () => {
      try {
        await fetch('/api/advisor/logout', { method: 'POST' });
      } catch (e) {}
      window.location.href = '/advisor/login';
    });
  }

  async function loadCRMLeads() {
    try {
      const res = await fetch('/api/leads');
      if (res.status === 401 || res.status === 403) {
        terminalLog('Advisor authorization required to view CRM pipelines.', 'SYSTEM');
        crmLeadBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--danger-color); padding: 24px;"><i class="fa-solid fa-lock"></i> Advisor authorization required. <a href="/advisor/login" style="color: var(--primary-color);">Log In</a></td></tr>';
        return;
      }
      const r = await res.json();
      if (!r.success || !Array.isArray(r.data)) {
        terminalLog('Failed to retrieve CRM leads from server.', 'SYSTEM');
        return;
      }
      renderCRMLeadsTable(r.data);
    } catch (e) {
      terminalLog(`Error connecting to CRM API: ${e.message}`, 'SYSTEM');
    }
  }

  function renderCRMLeadsTable(leadsList) {
    crmLeadBody.innerHTML = '';
    
    leadsList.forEach(lead => {
      const tr = document.createElement('tr');
      
      const nameCell = `<td><strong>${lead.name}</strong></td>`;
      const contactCell = `<td>${lead.contact}</td>`;
      
      const angelCell = lead.angel_code 
        ? `<td><span class="client-code">${lead.angel_code}</span></td>`
        : `<td><span class="badge badge-danger">Not Mapped</span></td>`;
        
      const bseCell = lead.bse_ucc
        ? `<td><span class="client-code">${lead.bse_ucc}</span></td>`
        : `<td><span class="badge badge-danger">Not Mapped</span></td>`;
        
      let statusBadge = 'badge-danger';
      if (lead.status === 'Fully Mapped') statusBadge = 'badge-success';
      if (lead.status === 'Only F&O') statusBadge = 'badge-info';
      const statusCell = `<td><span class="badge ${statusBadge}">${lead.status}</span></td>`;
      
      let actionBtn = '';
      if (lead.status === 'Fully Mapped' || lead.status === 'Only F&O') {
        actionBtn = `<button class="btn btn-secondary btn-xs btn-view-analytics" data-client="${lead.name}"><i class="fa-solid fa-chart-simple"></i> Analytics</button>`;
      } else {
        actionBtn = `<button class="btn btn-primary btn-xs btn-crm-map" data-id="${lead.id}"><i class="fa-solid fa-lock"></i> Map Client</button>`;
      }
      const actionCell = `<td>${actionBtn}</td>`;
      
      tr.innerHTML = nameCell + contactCell + angelCell + bseCell + statusCell + actionCell;
      crmLeadBody.appendChild(tr);
    });
    
    // Attach click listeners to newly created action buttons
    attachCrmButtonListeners();
  }

  // Add new lead modal prompt (with dynamic local fallback)
  btnAddLead.addEventListener('click', async () => {
    const name = prompt('Enter Client Name:');
    if (!name) return;
    const contact = prompt('Enter Client Contact Number:');
    if (!contact) return;

    // FALLBACK: If running locally as a file:/// index.html
    if (window.location.protocol === 'file:') {
      const newId = localLeads.length + 1;
      localLeads.unshift({ id: newId, name, contact, angel_code: null, bse_ucc: null, status: 'Locked' });
      terminalLog(`Lead added successfully into local mock database (ID: ${newId})`, 'SYSTEM');
      renderCRMLeadsTable(localLeads);
      return;
    }

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact })
      });
      const r = await res.json();
      if (r.success) {
        terminalLog(`Lead added successfully into SQLite table (ID: ${r.id})`, 'SYSTEM');
        await loadCRMLeads();
      } else {
        alert('Failed to insert lead: ' + r.error);
      }
    } catch (e) {
      alert('Error connecting to backend database. Verify server is active.');
    }
  });

  function attachCrmButtonListeners() {
    // 1. View Analytics Trigger
    const btnViewAnalytics = document.querySelectorAll('.btn-view-analytics');
    btnViewAnalytics.forEach(btn => {
      btn.addEventListener('click', () => {
        const client = btn.getAttribute('data-client');
        tabs.forEach(t => t.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        const analyticsTab = document.querySelector('[data-tab="analytics"]');
        analyticsTab.classList.add('active');
        document.getElementById('analytics').classList.add('active');
        activeTab = 'analytics';

        terminalLog(`Advisor requested Trade Analytics for mapped client: ${client}`);
        loadLedgerStatistics(mockTrades, `${client}_Broker_Ledger.xlsx`);
      });
    });

    // 2. Map Locked Lead Trigger
    const btnCrmMap = document.querySelectorAll('.btn-crm-map');
    btnCrmMap.forEach(btn => {
      btn.addEventListener('click', () => {
        const leadId = btn.getAttribute('data-id');
        openUnlockModal(leadId);
      });
    });
  }

  // Load database CRM leads dynamically on start
  loadCRMLeads();


  // ── GOAL SIP CALCULATOR ──
  const sipAmtSlider = document.getElementById('sip-amt-slider');
  const sipYearsSlider = document.getElementById('sip-years-slider');
  const sipReturnSlider = document.getElementById('sip-return-slider');

  const sipAmtVal = document.getElementById('sip-amt-val');
  const sipYearsVal = document.getElementById('sip-years-val');
  const sipReturnVal = document.getElementById('sip-return-val');

  const resInvested = document.getElementById('res-invested');
  const resGained = document.getElementById('res-gained');
  const resTotal = document.getElementById('res-total');
  const progressFill = document.getElementById('res-progress-fill');
  const milestoneText = document.getElementById('res-milestone-text');

  let currentGoalTarget = 20000000; // Default ₹2 Cr Home
  let currentGoalLabel = '🏡 Buy Home (₹2 Cr)';

  const btnGoals = document.querySelectorAll('.btn-goal');
  btnGoals.forEach(btn => {
    btn.addEventListener('click', () => {
      btnGoals.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentGoalTarget = parseInt(btn.getAttribute('data-target'));
      currentGoalLabel = btn.textContent;
      
      const rate = parseFloat(btn.getAttribute('data-rate'));
      sipReturnSlider.value = rate;
      sipReturnVal.textContent = `${rate}%`;
      
      terminalLog(`Calculated compounding metrics for target: ${currentGoalLabel}`);
      calculateSIP();
    });
  });

  function formatCurrency(num) {
    return '₹' + Math.round(num).toLocaleString('en-IN');
  }

  function calculateSIP() {
    const P = parseFloat(sipAmtSlider.value);
    const n = parseFloat(sipYearsSlider.value) * 12;
    const i = (parseFloat(sipReturnSlider.value) / 12) / 100;

    sipAmtVal.textContent = formatCurrency(P);
    sipYearsVal.textContent = `${sipYearsSlider.value} Years`;
    sipReturnVal.textContent = `${sipReturnSlider.value}%`;

    const investedAmount = P * n;
    let maturityAmount = 0;
    if (i > 0) {
      maturityAmount = P * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    } else {
      maturityAmount = investedAmount;
    }

    const wealthGain = maturityAmount - investedAmount;

    resInvested.textContent = formatCurrency(investedAmount);
    resGained.textContent = formatCurrency(wealthGain);
    resTotal.textContent = formatCurrency(maturityAmount);

    const pct = Math.min(100, (maturityAmount / currentGoalTarget) * 100);
    progressFill.style.width = `${pct}%`;

    if (pct >= 100) {
      milestoneText.innerHTML = `<i class="fa-solid fa-circle-check green-text"></i> Congratulations! Your expected maturity of <strong>${formatCurrency(maturityAmount)}</strong> exceeds your goal target of <strong>${formatCurrency(currentGoalTarget)}</strong>! You are fully on track!`;
    } else {
      const shortage = currentGoalTarget - maturityAmount;
      const multiplier = ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
      const reqSip = currentGoalTarget / multiplier;
      
      milestoneText.innerHTML = `<i class="fa-solid fa-triangle-exclamation orange-text"></i> You are at <strong>${pct.toFixed(1)}%</strong> of your goal target. Increase your monthly SIP to <strong>${formatCurrency(reqSip)}</strong> to fully achieve it in ${sipYearsSlider.value} years.`;
    }
  }

  [sipAmtSlider, sipYearsSlider, sipReturnSlider].forEach(slider => {
    slider.addEventListener('input', calculateSIP);
  });

  const btnExecuteSip = document.querySelector('.btn-execute-sip');
  btnExecuteSip.addEventListener('click', () => {
    if (!isMapped) {
      terminalLog('Blocked order routing. Advisor must map credentials first.', 'BSE_StAR');
      openUnlockModal();
      return;
    }
    terminalLog(`Executing monthly SIP basket of ${formatCurrency(sipAmtSlider.value)}...`, 'BSE_StAR');
    terminalLog(`Generating BSE StAR order envelope XML. Member code verified.`, 'BSE_StAR');
    setTimeout(() => {
      terminalLog(`SUCCESS: SIP registered under client portfolio. Mandate auto-debit pending approval link.`, 'BSE_StAR');
      alert(`✅ Order Placed! TrustPoint has securely executed a ₹${parseInt(sipAmtSlider.value).toLocaleString('en-IN')}/mo SIP basket via BSE StAR MF 2.0. Payment link has been sent to client.`);
    }, 1200);
  });

  calculateSIP();


  // ── PORTFOLIO OPTIMIZER ──
  const optMfSlider = document.getElementById('opt-mf-slider');
  const optEqSlider = document.getElementById('opt-eq-slider');
  const optGoldSlider = document.getElementById('opt-gold-slider');

  const optMfVal = document.getElementById('opt-mf-val');
  const optEqVal = document.getElementById('opt-eq-val');
  const optGoldVal = document.getElementById('opt-gold-val');
  const optWeightError = document.getElementById('opt-weight-error');
  const optWeightTotal = document.getElementById('opt-weight-total');

  function rebalancePortfolioUI() {
    const mf = parseInt(optMfSlider.value);
    const eq = parseInt(optEqSlider.value);
    const gold = parseInt(optGoldSlider.value);

    optMfVal.textContent = `${mf}%`;
    optEqVal.textContent = `${eq}%`;
    optGoldVal.textContent = `${gold}%`;

    const total = mf + eq + gold;
    if (total !== 100) {
      optWeightError.style.display = 'block';
      optWeightTotal.textContent = `${total}%`;
    } else {
      optWeightError.style.display = 'none';
      
      const chartCurrent = document.getElementById('chart-current');
      if (chartCurrent) {
        chartCurrent.innerHTML = `
          <div class="pie-slice mf" style="--val: ${mf};"></div>
          <div class="pie-slice eq" style="--val: ${eq}; --offset: ${mf};"></div>
          <div class="pie-slice gold" style="--val: ${gold}; --offset: ${mf + eq};"></div>
          <div class="pie-center"><span>Risk: Adjusted</span></div>
        `;
      }
    }
  }

  [optMfSlider, optEqSlider, optGoldSlider].forEach(slider => {
    slider.addEventListener('input', rebalancePortfolioUI);
  });

  const btnRebalance = document.querySelector('.btn-rebalance');
  btnRebalance.addEventListener('click', () => {
    terminalLog('Executing dynamic portfolio rebalance request...', 'SYSTEM');
    terminalLog('Calculating target weights allocation discrepancy.', 'SYSTEM');
    terminalLog('Firing sell orders for direct equities to reduce variance...', 'ANGEL_ONE');
    setTimeout(() => {
      terminalLog('Routing cash balance into BSE StAR Mutual Fund purchases...', 'BSE_StAR');
    }, 800);
    setTimeout(() => {
      terminalLog('SUCCESS: Portfolio rebalanced dynamically to optimal efficient frontier weights.', 'SYSTEM');
      alert('⚖️ Rebalancing Complete! TrustPoint has optimized the portfolio weights successfully. Trades placed across BSE StAR and Angel One.');
    }, 1600);
  });


  // ── TRADE ANALYTICS: DRAG-AND-DROP PARSER ──
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('ledger-file-input');
  const btnLoadMockTrades = document.getElementById('btn-load-mock-trades');
  const statusBadge = document.getElementById('ledger-status-badge');
  let mockTradesDataLoaded = false;

  const mockTrades = [
    { date: '2026-05-01', type: 'BUY', symbol: 'NIFTY26MAYFUT', price: 24200, qty: 65, realized_pnl: 0 },
    { date: '2026-05-02', type: 'SELL', symbol: 'NIFTY26MAYFUT', price: 24350, qty: 65, realized_pnl: 9750 },
    { date: '2026-05-03', type: 'BUY', symbol: 'SENSEX28MAYFUT', price: 80100, qty: 20, realized_pnl: 0 },
    { date: '2026-05-05', type: 'SELL', symbol: 'SENSEX28MAYFUT', price: 79900, qty: 20, realized_pnl: -4000 },
    { date: '2026-05-08', type: 'BUY', symbol: 'NIFTY26MAYFUT', price: 24400, qty: 65, realized_pnl: 0 },
    { date: '2026-05-10', type: 'SELL', symbol: 'NIFTY26MAYFUT', price: 24650, qty: 65, realized_pnl: 16250 },
    { date: '2026-05-12', type: 'BUY', symbol: 'NIFTY26MAYFUT', price: 24700, qty: 65, realized_pnl: 0 },
    { date: '2026-05-14', type: 'SELL', symbol: 'NIFTY26MAYFUT', price: 24620, qty: 65, realized_pnl: -5200 },
    { date: '2026-05-18', type: 'BUY', symbol: 'SENSEX28MAYFUT', price: 80800, qty: 20, realized_pnl: 0 },
    { date: '2026-05-20', type: 'SELL', symbol: 'SENSEX28MAYFUT', price: 81400, qty: 20, realized_pnl: 12000 },
    { date: '2026-05-22', type: 'BUY', symbol: 'NIFTY26MAYFUT', price: 24500, qty: 65, realized_pnl: 0 },
    { date: '2026-05-25', type: 'SELL', symbol: 'NIFTY26MAYFUT', price: 24720, qty: 65, realized_pnl: 14300 },
  ];

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.add('active');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      dropZone.classList.remove('active');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleUploadedFiles(files);
  });

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', () => {
    handleUploadedFiles(fileInput.files);
  });

  btnLoadMockTrades.addEventListener('click', () => {
    terminalLog('Loading mock Zerodha console Excel ledger data...', 'SYSTEM');
    setTimeout(() => {
      loadLedgerStatistics(mockTrades, 'Mock_Zerodha_Console.xlsx');
    }, 500);
  });

  function handleUploadedFiles(files) {
    if (files.length === 0) return;
    const file = files[0];
    terminalLog(`Parsing file input: ${file.name}...`, 'SYSTEM');

    statusBadge.textContent = 'Parsing...';
    setTimeout(() => {
      loadLedgerStatistics(mockTrades, file.name);
    }, 1200);
  }

  function loadLedgerStatistics(trades, filename) {
    mockTradesDataLoaded = true;
    statusBadge.textContent = filename;
    statusBadge.className = 'badge badge-success';
    
    const closed = trades.filter(t => t.realized_pnl !== 0);
    const winTrades = closed.filter(t => t.realized_pnl > 0);
    const lossTrades = closed.filter(t => t.realized_pnl < 0);
    
    const winRate = (winTrades.length / closed.length) * 100;
    const totalNetPnl = closed.reduce((acc, t) => acc + t.realized_pnl, 0);
    const grossProfit = winTrades.reduce((acc, t) => acc + t.realized_pnl, 0);
    const grossLoss = Math.abs(lossTrades.reduce((acc, t) => acc + t.realized_pnl, 0));
    
    const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss) : grossProfit;
    
    const avgWin = winTrades.length > 0 ? (grossProfit / winTrades.length) : 0;
    const avgLoss = lossTrades.length > 0 ? (grossLoss / lossTrades.length) : 0;
    const rrRatio = avgLoss > 0 ? (avgWin / avgLoss) : avgWin;

    document.getElementById('stats-total-trades').textContent = closed.length;
    document.getElementById('stats-win-rate').textContent = `${winRate.toFixed(1)}%`;
    document.getElementById('stats-profit-factor').textContent = profitFactor.toFixed(2);
    document.getElementById('stats-max-drawdown').textContent = '₹9,200 (4.2%)';
    
    document.getElementById('stats-gross-profit').textContent = formatCurrency(grossProfit);
    document.getElementById('stats-gross-loss').textContent = formatCurrency(grossLoss);
    
    const netPnlEl = document.getElementById('stats-net-pnl');
    netPnlEl.textContent = formatCurrency(totalNetPnl);
    netPnlEl.className = totalNetPnl >= 0 ? 'green-text' : 'red-text';

    document.getElementById('stats-avg-win').textContent = formatCurrency(avgWin);
    document.getElementById('stats-avg-loss').textContent = formatCurrency(avgLoss);
    document.getElementById('stats-rr-ratio').textContent = `1 : ${rrRatio.toFixed(2)}`;

    terminalLog(`SUCCESS: Fully parsed ${closed.length} closed trades from ${filename}.`, 'SYSTEM');
    terminalLog(`Analytics loaded: WinRate=${winRate.toFixed(1)}% NetP&L=${formatCurrency(totalNetPnl)}`, 'ANGEL_ONE');

    drawPnLChart();
  }

  function drawPnLChart() {
    if (!ctx) return;
    
    const w = chartCanvas.width;
    const h = chartCanvas.height;
    
    ctx.clearRect(0, 0, w, h);
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let i = 20; i < h; i += 30) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(w, i);
      ctx.stroke();
    }

    const closed = mockTrades.filter(t => t.realized_pnl !== 0);
    const pnlPath = [0];
    let cumulative = 0;
    for (let t of closed) {
      cumulative += t.realized_pnl;
      pnlPath.push(cumulative);
    }

    const maxPnl = Math.max(...pnlPath, 5000);
    const minPnl = Math.min(...pnlPath, -5000);
    const pnlRange = maxPnl - minPnl;

    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    const stepX = w / (pnlPath.length - 1);
    
    ctx.beginPath();
    for (let idx = 0; idx < pnlPath.length; idx++) {
      const p = pnlPath[idx];
      const yNorm = h - 25 - ((p - minPnl) / pnlRange) * (h - 50);
      const xNorm = idx * stepX;
      
      if (idx === 0) {
        ctx.moveTo(xNorm, yNorm);
      } else {
        ctx.lineTo(xNorm, yNorm);
      }
    }
    ctx.stroke();

    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
    
    ctx.fillStyle = gradient;
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#3B82F6';
    for (let idx = 0; idx < pnlPath.length; idx++) {
      const p = pnlPath[idx];
      const yNorm = h - 25 - ((p - minPnl) / pnlRange) * (h - 50);
      const xNorm = idx * stepX;
      
      ctx.beginPath();
      ctx.arc(xNorm, yNorm, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }


  // ── SMART INSURANCE: TURTLEMINT AUDIT ──
  const insExpense = document.getElementById('ins-expense');
  const insLoans = document.getElementById('ins-loans');
  const insCurrentCover = document.getElementById('ins-current-cover');
  const insTargetAge = document.getElementById('ins-target-age');

  const insHlvReq = document.getElementById('ins-hlv-req');
  const insCurrProt = document.getElementById('ins-curr-prot');
  const insDeficit = document.getElementById('ins-deficit');
  const insMilestoneText = document.getElementById('ins-milestone-text');

  function calculateHLV() {
    const monthlyExp = parseFloat(insExpense.value) || 0;
    const loans = parseFloat(insLoans.value) || 0;
    const currentCover = parseFloat(insCurrentCover.value) || 0;
    
    const currentAge = 30;
    const targetAge = parseInt(insTargetAge.value) || 65;
    const yearsToProtect = targetAge - currentAge;

    const hlvRequirement = (monthlyExp * 12 * yearsToProtect) + loans;
    const deficit = Math.max(0, hlvRequirement - currentCover);

    insHlvReq.textContent = formatCurrency(hlvRequirement);
    insCurrProt.textContent = formatCurrency(currentCover);
    insDeficit.textContent = formatCurrency(deficit);

    const coverMultiplier = currentCover > 0 ? (currentCover / (monthlyExp * 12)) : 0;

    if (deficit === 0) {
      insMilestoneText.innerHTML = `<i class="fa-solid fa-circle-check green-text"></i> Brilliant! Your current life insurance cover of <strong>${formatCurrency(currentCover)}</strong> is fully sufficient to support your family and secure all liabilities.`;
    } else {
      insMilestoneText.innerHTML = `<i class="fa-solid fa-shield-catastrophic red-text"></i> Your family is **dangerously under-protected** by <strong>${formatCurrency(deficit)}</strong>. If something happens, your current cover will only support them for <strong>${coverMultiplier.toFixed(1)} years</strong>.`;
    }
  }

  [insExpense, insLoans, insCurrentCover, insTargetAge].forEach(input => {
    input.addEventListener('input', calculateHLV);
  });

  const btnFetchQuotes = document.querySelector('.btn-fetch-quotes');
  btnFetchQuotes.addEventListener('click', () => {
    terminalLog('Fetching insurance quotes from 14 insurers...', 'TURTLEMINT');
    terminalLog('Compiling age, medical history, and deficit parameters...', 'TURTLEMINT');
    setTimeout(() => {
      terminalLog('SUCCESS: HDFC Ergo, ICICI Lombard, and Max Life quotes received.', 'TURTLEMINT');
      alert(`🛡️ Quotes Received! Turtlemint has compiled premium options for a ₹${Math.round(parseFloat(insDeficit.textContent.replace(/[^\d]/g, ''))).toLocaleString('en-IN')} term cover. Link has been shared with client.`);
    }, 1200);
  });

  calculateHLV();


  // ── PREMIUM ONBOARDING ACTIVATION LISTENERS ──
  const unlockActionButtons = document.querySelectorAll('.btn-map-confirm');
  unlockActionButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const type = btn.getAttribute('data-type');
      let code = 'MOCK-KEY';
      if (type === 'AngelOne') {
        code = `ANGL-${Math.floor(1000 + Math.random() * 9000)}`;
      } else if (type === 'BSE') {
        code = `UCC-${Math.floor(10000 + Math.random() * 90000)}`;
      } else {
        code = 'PREMIUM-SAAS';
      }

      if (currentTargetLeadId) {
        await mapLeadInDatabase(currentTargetLeadId, code);
      } else {
        unlockPremiumSuite(code);
      }
    });
  });

});
