/**
 * TrustPoint Finance Academy — Interactive Course Player (V2.1 Security Patch)
 * Server-Authoritative Quiz Grading & Progression Engine
 * LocalStorage is NEVER trusted for authorization. All unlocking is server-verified.
 */

class AcademyPlayer {
  constructor() {
    this.lessonData = null;
    this.currentIndex = 0;
    this.quizAnswers = {};
    this.quizScore = 0;
    this.currentQuizQ = 0;
    
    // Student Identity (Supports custom student or default session)
    this.studentId = this.getOrCreateStudentId();

    // Determine initial lesson from URL
    const urlParams = new URLSearchParams(window.location.search);
    this.currentLessonId = urlParams.get('lessonId') || urlParams.get('lesson') || 'M01_L01';

    // Authoritative state (Default: Only M01_L01 is unlocked)
    this.unlockedLessons = ['M01_L01'];
    this.completedLessons = [];
    
    // DOM elements
    this.screenContainer = document.getElementById('screen-viewport');
    this.progressFill = document.getElementById('progress-fill');
    this.stepIndicator = document.getElementById('step-indicator');
    this.btnPrev = document.getElementById('btn-prev');
    this.btnNext = document.getElementById('btn-next');
    this.dotsContainer = document.getElementById('screen-dots');
    this.drawer = document.getElementById('curriculum-drawer');
    this.drawerBackdrop = document.getElementById('drawer-backdrop');
    this.drawerList = document.getElementById('drawer-list');

    this.init();
  }

  getOrCreateStudentId() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const queryStudent = urlParams.get('studentId');
      if (queryStudent) return queryStudent;

      let stored = localStorage.getItem('tpf_student_id');
      if (!stored) {
        stored = 'student_' + Math.random().toString(36).substring(2, 9);
        localStorage.setItem('tpf_student_id', stored);
      }
      return stored;
    } catch (e) {
      return 'student_guest_01';
    }
  }

  async init() {
    // 1. Fetch authoritative state from the server FIRST (Do NOT trust localStorage)
    await this.fetchAuthoritativeProgress();

    // 2. Fetch lesson educational data
    await this.fetchLessonData();

    // 3. Bind UI events & Render
    this.bindEvents();
    this.renderCurrentScreen();
    this.updateCurriculumDrawer();
  }

  async fetchAuthoritativeProgress() {
    try {
      const res = await fetch(`/api/academy/progress?studentId=${encodeURIComponent(this.studentId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Strictly apply server-authoritative state
          this.unlockedLessons = Array.isArray(data.unlockedLessons) ? data.unlockedLessons : ['M01_L01'];
          this.completedLessons = Array.isArray(data.completedLessons) ? data.completedLessons : [];
          console.log('[ACADEMY SECURITY] Authoritative progress loaded from server:', {
            studentId: this.studentId,
            unlocked: this.unlockedLessons,
            completed: this.completedLessons
          });
          return;
        }
      }
    } catch (err) {
      console.warn('[ACADEMY SECURITY] Server unreachable or running standalone. Enforcing strict default lock:', err);
    }
    // Hard security fallback: Only M01_L01 is unlocked if server cannot be reached
    this.unlockedLessons = ['M01_L01'];
    this.completedLessons = [];
  }

  async fetchLessonData(targetLessonId = null) {
    if (targetLessonId) {
      this.currentLessonId = targetLessonId;
    }
    const lessonKey = this.currentLessonId;
    const fileName = lessonKey.toLowerCase().replace('m01_l', 'lesson') + '.json';

    try {
      // 1. Check authoritative server endpoint for protected lesson access
      const apiRes = await fetch(`/api/academy/lessons/${lessonKey}?studentId=${encodeURIComponent(this.studentId)}`);
      if (apiRes.status === 403) {
        alert(`⛔ सर्वर प्राधिकरण अस्वीकृत (403 Forbidden):\nअध्याय ${lessonKey} अभी लॉक है। कृपया पिछला अध्याय 70% अंक के साथ उत्तीर्ण करें।`);
        this.currentLessonId = 'M01_L01';
        return this.fetchLessonData('M01_L01');
      }
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData.success && apiData.lesson) {
          this.lessonData = apiData.lesson;
          return;
        }
      }

      // 2. Fetch from static data endpoint
      const response = await fetch(`data/${fileName}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      this.lessonData = await response.json();
    } catch (err) {
      console.warn(`[ACADEMY] Could not fetch ${fileName}, checking fallbacks:`, err);
      if (lessonKey === 'M01_L01' && window.FALLBACK_LESSON_01) {
        this.lessonData = window.FALLBACK_LESSON_01;
      } else if (lessonKey === 'M01_L02' && window.FALLBACK_LESSON_02) {
        this.lessonData = window.FALLBACK_LESSON_02;
      }
    }
  }

  bindEvents() {
    this.btnPrev.addEventListener('click', () => this.navigate(-1));
    this.btnNext.addEventListener('click', () => this.navigate(1));
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' && !this.btnNext.disabled) this.navigate(1);
      if (e.key === 'ArrowLeft' && !this.btnPrev.disabled) this.navigate(-1);
    });

    // Drawer triggers
    const btnCurriculum = document.getElementById('btn-curriculum');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    if (btnCurriculum) btnCurriculum.addEventListener('click', () => this.toggleDrawer(true));
    if (btnCloseDrawer) btnCloseDrawer.addEventListener('click', () => this.toggleDrawer(false));
    if (this.drawerBackdrop) this.drawerBackdrop.addEventListener('click', () => this.toggleDrawer(false));
  }

  toggleDrawer(open) {
    if (open) {
      this.drawer.classList.add('open');
      this.drawerBackdrop.classList.add('show');
    } else {
      this.drawer.classList.remove('open');
      this.drawerBackdrop.classList.remove('show');
    }
  }

  navigate(dir) {
    if (!this.lessonData || !this.lessonData.screens) return;
    const total = this.lessonData.screens.length;
    const newIndex = this.currentIndex + dir;
    if (newIndex >= 0 && newIndex < total) {
      this.currentIndex = newIndex;
      this.renderCurrentScreen();
    }
  }

  goToScreen(index) {
    if (!this.lessonData || !this.lessonData.screens) return;
    if (index >= 0 && index < this.lessonData.screens.length) {
      this.currentIndex = index;
      this.renderCurrentScreen();
    }
  }

  renderCurrentScreen() {
    if (!this.lessonData) return;
    const screens = this.lessonData.screens;
    const total = screens.length;
    const screen = screens[this.currentIndex];

    // Update Progress bar & Indicators
    const percent = Math.round(((this.currentIndex + 1) / total) * 100);
    this.progressFill.style.width = `${percent}%`;
    this.stepIndicator.innerText = `Screen ${this.currentIndex + 1} of ${total}`;

    // Nav buttons state
    this.btnPrev.disabled = (this.currentIndex === 0);
    this.btnNext.disabled = (this.currentIndex === total - 1);
    this.btnNext.innerText = (this.currentIndex === total - 1) ? 'समाप्त ✓' : 'अगला (Next) →';

    // Render dot indicators
    this.renderDots(total);

    // Build Screen HTML
    let html = `
      <div class="screen-card">
        <div class="screen-header">
          <span class="screen-badge">${screen.badge || 'LESSON 01'}</span>
          <span class="screen-step">स्क्रीन ${this.currentIndex + 1} / ${total}</span>
        </div>
        <h2 class="screen-title">${this.highlightTitle(screen.title)}</h2>
        <div class="screen-content">
          ${this.getScreenContentHtml(screen)}
        </div>
      </div>
    `;

    this.screenContainer.innerHTML = html;
    this.attachScreenInteractivity(screen);
  }

  highlightTitle(title) {
    if (!title) return '';
    return title.replace(/([A-Za-z]+|Profit|Revenue|Costs|Capital|Business|Share)/g, '<span>$1</span>');
  }

  renderDots(total) {
    if (!this.dotsContainer) return;
    let dotsHtml = '';
    for (let i = 0; i < total; i++) {
      dotsHtml += `<div class="dot ${i === this.currentIndex ? 'active' : ''}" onclick="window.player.goToScreen(${i})" title="Screen ${i+1}"></div>`;
    }
    this.dotsContainer.innerHTML = dotsHtml;
  }

  getScreenContentHtml(screen) {
    switch (screen.type) {
      case 'TITLE':
        return `
          <div class="title-hero">
            <p class="title-tagline">${screen.content.tagline}</p>
            <p class="title-desc">${screen.content.description}</p>
            <div class="objectives-card">
              <h3>🎯 ${this.lessonData.objective.headline}</h3>
              <ul class="objectives-list">
                ${this.lessonData.objective.points.map(p => `<li>${p}</li>`).join('')}
              </ul>
            </div>
            <button class="nav-btn btn-next" onclick="window.player.navigate(1)" style="margin: 0 auto; display: inline-flex;">
              अध्याय शुरू करें (Start Lesson) →
            </button>
          </div>
        `;

      case 'CONCEPT':
        if (screen.content.revealCards) {
          return `
            <div class="core-concept-box">
              💡 ${screen.content.coreConcept}
            </div>
            <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 20px;">${screen.content.leadText}</p>
            <div class="reveal-grid">
              ${screen.content.revealCards.map(c => `
                <div class="reveal-card" data-card="${c.id}" onclick="this.classList.toggle('active')">
                  <div class="card-icon"><i class="fa-solid ${c.icon}"></i></div>
                  <h4>${c.title}</h4>
                  <p>${c.text}</p>
                  <span style="font-size: 0.75rem; color: var(--accent-sky); margin-top: 10px; display: inline-block;">👆 क्लिक करके समझें</span>
                </div>
              `).join('')}
            </div>
            <div style="background: rgba(255,255,255,0.03); border-left: 3px solid var(--accent-green); padding: 12px 18px; border-radius: 4px; font-size: 0.95rem; color: #A7F3D0;">
              ✨ <b>निष्कर्ष:</b> ${screen.content.takeaway}
            </div>
          `;
        } else {
          return `
            <p style="font-size: 1.1rem; color: var(--text-primary); margin-bottom: 24px; line-height: 1.5;">${screen.content.leadText}</p>
            <div style="display: flex; justify-content: center; margin-bottom: 24px;">
              <img src="assets/visuals/capital_fuel_gauge.svg" alt="Capital Fuel Gauge" style="max-height: 240px; width: auto; border-radius: 12px;">
            </div>
            <div style="background: rgba(0, 82, 255, 0.15); border-left: 4px solid #0052FF; padding: 14px 20px; border-radius: 8px; font-size: 1rem; color: #E2E8F0;">
              🚗 ${screen.content.quote}
            </div>
          `;
        }

      case 'FLOW':
        const flowImg = screen.content.visualPath || 'assets/visuals/revenue_flow.svg';
        return `
          <div class="flow-container">
            <p style="font-size: 1rem; color: var(--text-secondary);">${screen.content.description}</p>
            <div class="flow-svg-box">
              <img src="${flowImg}" alt="${screen.title}">
            </div>
            <div class="flow-formula-bar">
              सूत्र (The Golden Formula): <span>${screen.content.formula}</span>
            </div>
          </div>
        `;

      case 'NUMERICAL_EXAMPLE':
        if (screen.content.breakdown) {
          return `
            <div style="font-size: 0.8rem; color: var(--accent-yellow); margin-bottom: 12px; letter-spacing: 0.05em; font-weight: 700;">
              ${screen.content.notice}
            </div>
            <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 20px;">${screen.content.intro}</p>
            <div class="table-responsive" style="overflow-x:auto; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse; text-align: left; background: rgba(15, 23, 42, 0.6); border: 1px solid #1E3A8A; border-radius: 8px;">
                <thead>
                  <tr style="background: rgba(30, 58, 138, 0.4); border-bottom: 2px solid #38BDF8;">
                    <th style="padding: 12px 16px; color: #FFFFFF; font-size: 0.95rem;">लाइन आइटम (Line Item)</th>
                    <th style="padding: 12px 16px; color: #38BDF8; font-size: 0.95rem;">राशि (₹)</th>
                    <th style="padding: 12px 16px; color: #FBBF24; font-size: 0.95rem;">प्रतिशत (%)</th>
                    <th style="padding: 12px 16px; color: #94A3B8; font-size: 0.95rem;">विवरण</th>
                  </tr>
                </thead>
                <tbody>
                  ${screen.content.breakdown.map((row, idx) => `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.06); ${idx === screen.content.breakdown.length - 1 ? 'background: rgba(16, 185, 129, 0.15); font-weight: bold;' : ''}">
                      <td style="padding: 10px 16px; color: ${idx === screen.content.breakdown.length - 1 ? '#34D399' : '#FFFFFF'};">${row.item}</td>
                      <td style="padding: 10px 16px; color: ${idx === screen.content.breakdown.length - 1 ? '#10B981' : '#E2E8F0'}; font-weight: 700;">${row.amount}</td>
                      <td style="padding: 10px 16px; color: #FBBF24; font-weight: 700;">${row.percent}</td>
                      <td style="padding: 10px 16px; color: #94A3B8; font-size: 0.85rem;">${row.desc}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            <div style="background: rgba(16, 185, 129, 0.1); border-left: 4px solid #10B981; padding: 12px 18px; border-radius: 6px; font-size: 0.95rem; color: #A7F3D0;">
              💡 <b>महत्वपूर्ण निष्कर्ष:</b> ${screen.content.takeaway}
            </div>
          `;
        }
        return `
          <div style="font-size: 0.8rem; color: var(--accent-yellow); margin-bottom: 12px; letter-spacing: 0.05em; font-weight: 700;">
            ${screen.content.notice}
          </div>
          <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 20px;">${screen.content.intro}</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>कुल बिक्री (Revenue / Top-line)</span>
                  <span class="calc-val" id="rev-val">₹10,00,000</span>
                </div>
                <input type="range" class="calc-slider" id="rev-slider" 
                  min="${screen.content.calculator ? screen.content.calculator.minRevenue : 100000}" 
                  max="${screen.content.calculator ? screen.content.calculator.maxRevenue : 5000000}" 
                  step="${screen.content.calculator ? screen.content.calculator.stepRevenue : 50000}" 
                  value="${screen.content.calculator ? screen.content.calculator.defaultRevenue : 1000000}">
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>कुल खर्चे व लागत (Costs)</span>
                  <span class="calc-val" id="cost-val" style="color: var(--accent-red);">₹7,00,000</span>
                </div>
                <input type="range" class="calc-slider red" id="cost-slider" 
                  min="${screen.content.calculator ? screen.content.calculator.minCosts : 100000}" 
                  max="${screen.content.calculator ? screen.content.calculator.maxCosts : 4000000}" 
                  step="${screen.content.calculator ? screen.content.calculator.stepCosts : 50000}" 
                  value="${screen.content.calculator ? screen.content.calculator.defaultCosts : 700000}">
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">
                💡 स्लाइडर को खींचकर देखें कि बिक्री बढ़ने या लागत घटने पर मुनाफे पर क्या असर होता है।
              </div>
            </div>

            <div class="calc-result-box" id="calc-result-card">
              <div class="result-item">
                <span>Revenue:</span>
                <span id="res-rev" style="color: #00E676; font-weight: bold;">₹10,00,000</span>
              </div>
              <div class="result-item">
                <span>Total Costs:</span>
                <span id="res-cost" style="color: #EF4444; font-weight: bold;">₹7,00,000</span>
              </div>
              <div class="result-item highlight">
                <span>Net Profit (Bottom-line):</span>
                <span class="result-num profit" id="res-profit">₹3,00,000</span>
              </div>
              <div class="result-item">
                <span>Profit Margin:</span>
                <span id="res-margin" style="color: #FBBF24; font-weight: bold;">30.0%</span>
              </div>
              <div id="res-status" style="font-size: 0.85rem; color: #A7F3D0; margin-top: 4px;">
                ✅ व्यापार स्वस्थ मुनाफे में है।
              </div>
            </div>
          </div>
        `;

      case 'MARGIN_SIMULATOR':
        const sim = screen.content.simulator;
        return `
          <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 20px;">${screen.content.intro}</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>कुल बिक्री (Revenue)</span>
                  <span class="calc-val" id="sim-rev-val">₹50,00,000</span>
                </div>
                <input type="range" class="calc-slider" id="sim-rev" min="${sim.minRev}" max="${sim.maxRev}" step="${sim.stepRev}" value="${sim.defaultRev}">
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>कच्चा माल व उत्पादन लागत (COGS %)</span>
                  <span class="calc-val" id="sim-cogs-val" style="color: var(--accent-red);">50%</span>
                </div>
                <input type="range" class="calc-slider red" id="sim-cogs" min="${sim.minCogs}" max="${sim.maxCogs}" step="${sim.stepCogs}" value="${sim.defaultCogs}">
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>परिचालन खर्चे (OpEx %)</span>
                  <span class="calc-val" id="sim-opex-val" style="color: var(--accent-yellow);">30%</span>
                </div>
                <input type="range" class="calc-slider" id="sim-opex" min="${sim.minOpex}" max="${sim.maxOpex}" step="${sim.stepOpex}" value="${sim.defaultOpex}">
              </div>
            </div>

            <div class="calc-result-box" id="sim-result-card">
              <div class="result-item">
                <span>Gross Profit (सकल लाभ):</span>
                <span id="sim-gross" style="color: #38BDF8; font-weight: bold;">₹25,00,000</span>
              </div>
              <div class="result-item">
                <span>Operating Profit (परिचालन लाभ):</span>
                <span id="sim-op-profit" style="color: #FBBF24; font-weight: bold;">₹10,00,000</span>
              </div>
              <div class="result-item highlight">
                <span>Net Profit (शुद्ध लाभ):</span>
                <span class="result-num profit" id="sim-net-profit">₹7,50,000</span>
              </div>
              <div class="result-item">
                <span>Net Profit Margin:</span>
                <span id="sim-net-margin" style="color: #00E676; font-weight: bold;">15.0%</span>
              </div>
              <div id="sim-status" style="font-size: 0.85rem; color: #A7F3D0; margin-top: 4px;">
                ✅ स्वस्थ मुनाफा (Strong Health)
              </div>
            </div>
          </div>
        `;

      case 'LEVERAGE_SIMULATOR':
        const lev = screen.content.simulator;
        return `
          <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 20px;">${screen.content.intro}</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>ऑपरेटिंग लाभ (EBIT / कमाई)</span>
                  <span class="calc-val" id="lev-ebit-val">₹8,00,000</span>
                </div>
                <input type="range" class="calc-slider" id="lev-ebit" min="${lev.minEbit}" max="${lev.maxEbit}" step="${lev.stepEbit}" value="${lev.defaultEbit}">
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                  <span>मंदी (₹1 लाख)</span>
                  <span>सामान्य (₹8 लाख)</span>
                  <span>बूम (₹20 लाख)</span>
                </div>
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>बैंक लोन (Debt Amount @ 10%)</span>
                  <span class="calc-val" id="lev-debt-val" style="color: var(--accent-red);">₹30,00,000</span>
                </div>
                <input type="range" class="calc-slider red" id="lev-debt" min="${lev.minDebt}" max="${lev.maxDebt}" step="${lev.stepDebt}" value="${lev.defaultDebt}">
                <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-muted); margin-top: 2px;">
                  <span>ऋण-मुक्त (₹0)</span>
                  <span>मध्यम (₹30 लाख)</span>
                  <span>अत्यधिक कर्ज (₹60 लाख)</span>
                </div>
              </div>
              <div style="font-size: 0.85rem; color: var(--text-muted); line-height: 1.4;">
                💡 कमाई को घटाकर (मंदी) देखें कि भारी कर्ज होने पर कंपनी कब डिफ़ॉल्ट ज़ोन में प्रवेश करती है।
              </div>
            </div>

            <div class="calc-result-box" id="lev-result-card">
              <div class="result-item">
                <span>वार्षिक ब्याज (Annual Interest):</span>
                <span id="lev-interest" style="color: #EF4444; font-weight: bold;">₹3,00,000</span>
              </div>
              <div class="result-item">
                <span>ब्याज कवरेज (Interest Coverage):</span>
                <span id="lev-icr" style="color: #38BDF8; font-weight: bold;">2.67x</span>
              </div>
              <div class="result-item highlight">
                <span>शेयरधारकों का शुद्ध लाभ:</span>
                <span class="result-num profit" id="lev-equity-profit">₹5,00,000</span>
              </div>
              <div id="lev-status" style="font-size: 0.85rem; color: #A7F3D0; margin-top: 8px; font-weight: 700;">
                ✅ सुरक्षित स्तर (Safe Coverage)
              </div>
            </div>
          </div>
        `;

      case 'SHARE_SIMULATOR':
        const sh = screen.content.simulator;
        return `
          <p style="font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 18px;">${screen.content.intro}</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>शेयर संख्या (Shares Owned)</span>
                  <span class="calc-val" id="sh-qty-val">500 शेयर्स</span>
                </div>
                <input type="range" class="calc-slider" id="sh-qty" min="${sh.minShares}" max="${sh.maxShares}" step="${sh.stepShares}" value="${sh.defaultShares}">
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>खरीद भाव (Buy Price प्रति शेयर)</span>
                  <span class="calc-val" id="sh-buy-val" style="color: var(--accent-sky);">₹200</span>
                </div>
                <input type="range" class="calc-slider" id="sh-buy" min="${sh.minBuyPrice}" max="${sh.maxBuyPrice}" step="${sh.stepBuyPrice}" value="${sh.defaultBuyPrice}">
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>वर्तमान बाजार भाव (Market Price)</span>
                  <span class="calc-val" id="sh-mkt-val" style="color: var(--accent-green);">₹320</span>
                </div>
                <input type="range" class="calc-slider" id="sh-mkt" min="${sh.minMarketPrice}" max="${sh.maxMarketPrice}" step="${sh.stepMarketPrice}" value="${sh.defaultMarketPrice}">
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>घोषित लाभांश (Dividend / Share)</span>
                  <span class="calc-val" id="sh-div-val" style="color: var(--accent-yellow);">₹8</span>
                </div>
                <input type="range" class="calc-slider red" id="sh-div" min="${sh.minDividend}" max="${sh.maxDividend}" step="${sh.stepDividend}" value="${sh.defaultDividend}">
              </div>
              <div style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.3;">
                💡 स्लाइडर्स बदलकर देखें कि शेयर का भाव बढ़ने और लाभांश मिलने पर कुल धन-सृजन कैसे होता है।
              </div>
            </div>

            <div class="calc-result-box" id="sh-result-card">
              <div class="result-item">
                <span>कुल निवेश (Invested Capital):</span>
                <span id="sh-invested" style="color: #94A3B8; font-weight: bold;">₹1,00,000</span>
              </div>
              <div class="result-item">
                <span>वर्तमान पोर्टफोलियो मूल्य:</span>
                <span id="sh-current-val" style="color: #38BDF8; font-weight: bold;">₹1,60,000</span>
              </div>
              <div class="result-item">
                <span>पूंजीगत लाभ (Unrealized Gain):</span>
                <span id="sh-cap-gain" style="color: #34D399; font-weight: bold;">+₹60,000 (+60.0%)</span>
              </div>
              <div class="result-item">
                <span>प्राप्त नकद लाभांश (Dividend Cash):</span>
                <span id="sh-div-cash" style="color: #FBBF24; font-weight: bold;">₹4,000</span>
              </div>
              <div class="result-item highlight">
                <span>कुल शेयरधारक रिटर्न (Total Return):</span>
                <span class="result-num profit" id="sh-total-return">+₹64,000 (+64.0%)</span>
              </div>
              <div id="sh-status" style="font-size: 0.85rem; color: #A7F3D0; margin-top: 6px; font-weight: 700;">
                ✅ सकारात्मक रिटर्न: कैपिटल गेन + लाभांश का दोहरा लाभ
              </div>
              <div style="font-size: 0.72rem; color: #64748B; margin-top: 8px; border-top: 1px dashed rgba(255,255,255,0.1); padding-top: 6px;">
                * नोट: यह गणना कर (Taxes) और ब्रोकरेज शुल्कों से पूर्व की है। लाभांश कंपनी की घोषणा पर आधारित है।
              </div>
            </div>
          </div>
        `;

      
      case 'PRICE_CAUSALITY_SIMULATOR':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">${screen.content.intro || 'मल्टी-फैक्टर मूल्य निर्धारण सिमुलेटर:'}</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>1. कंपनी के तिमाही नतीजे (Earnings Performance)</span>
                </div>
                <select id="sim-earnings" class="calc-slider" style="background:#0F172A; color:#FFF; border:1px solid #1E3A8A; padding:6px; border-radius:6px; width:100%;">
                  <option value="beat">अपेक्षा से बेहतर (Earnings Beat +25%)</option>
                  <option value="inline" selected>अपेक्षा अनुसार (In-line with Street)</option>
                  <option value="miss">अपेक्षा से कमजोर (Earnings Miss -15%)</option>
                </select>
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>2. बाजार की पूर्व-उम्मीदें (Prior Expectations)</span>
                </div>
                <select id="sim-expectations" class="calc-slider" style="background:#0F172A; color:#FFF; border:1px solid #1E3A8A; padding:6px; border-radius:6px; width:100%;">
                  <option value="high" selected>अत्यधिक आशावादी (Already Priced In)</option>
                  <option value="moderate">संतुलित उम्मीदें (Moderate)</option>
                  <option value="low">कम उम्मीदें (Low Expectations)</option>
                </select>
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>3. व्यापक बाजार का मूड (Macro Tide)</span>
                </div>
                <select id="sim-macro" class="calc-slider" style="background:#0F172A; color:#FFF; border:1px solid #1E3A8A; padding:6px; border-radius:6px; width:100%;">
                  <option value="crash">वैश्विक मंदी / पैनिक (-2.5% Crash)</option>
                  <option value="neutral" selected>तटस्थ / सामान्य दिन (Neutral)</option>
                  <option value="rally">चौतरफा बुलिश रैली (+1.8% Rally)</option>
                </select>
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>4. संस्थागत ऑर्डर फ्लो (FII/DII Net Flow)</span>
                </div>
                <select id="sim-flow" class="calc-slider" style="background:#0F172A; color:#FFF; border:1px solid #1E3A8A; padding:6px; border-radius:6px; width:100%;">
                  <option value="buy">भारी संस्थागत खरीदारी (+₹2,000 Cr)</option>
                  <option value="balanced" selected>संतुलित प्रवाह (Neutral Flow)</option>
                  <option value="sell">आक्रामक संस्थागत बिकवाली (-₹3,500 Cr)</option>
                </select>
              </div>
            </div>

            <div class="calc-result-box" id="causality-result-card">
              <div class="result-item">
                <span>अनुमानित मूल्य प्रतिक्रिया (Price Reaction):</span>
                <span id="res-price-move" style="font-size:1.3rem; font-weight:800; color:#FBBF24;">-1.5%</span>
              </div>
              <div class="result-item">
                <span>नेट सेंटीमेंट स्कोर (Net Driver Score):</span>
                <span id="res-sentiment-score" style="color:#38BDF8; font-weight:700;">Neutral (-10)</span>
              </div>
              <div class="result-item highlight">
                <span>प्राथमिक कारण विश्लेषण (Causality Diagnostic):</span>
                <div id="res-causality-diag" style="font-size:0.85rem; color:#A7F3D0; line-height:1.4; margin-top:4px;">
                  कंपनी ने अच्छे नतीजे दिए, लेकिन बाजार पहले से ही इसे मानकर चल रहा था (Priced In)। मैक्रो मंदी के कारण भाव संभल नहीं सका।
                </div>
              </div>
              <div style="font-size:0.75rem; color:#64748B; margin-top:8px; border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px;">
                💡 निष्कर्ष: कोई भी एकल कारक शेयर भाव की 100% गारंटी नहीं दे सकता।
              </div>
            </div>
          </div>
        `;

      case 'MARKET_STRUCTURE_SIMULATOR':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">प्राइमरी (IPO) बनाम सेकेंडरी (एक्सचेंज) मार्केट में नकदी प्रवाह का सिमुलेशन:</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>बाजार का प्रकार चुनें:</span>
                </div>
                <select id="mkt-type" class="calc-slider" style="background:#0F172A; color:#FFF; border:1px solid #1E3A8A; padding:6px; border-radius:6px; width:100%;">
                  <option value="primary" selected>Primary Market (IPO - नई पूंजी)</option>
                  <option value="secondary">Secondary Market (NSE/BSE - शेयरधारक अदला-बदली)</option>
                </select>
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>निवेश राशि (Investment Amount)</span>
                  <span class="calc-val" id="mkt-amt-val">₹50,000</span>
                </div>
                <input type="range" class="calc-slider" id="mkt-amt" min="10000" max="200000" step="10000" value="50000">
              </div>
            </div>
            <div class="calc-result-box" id="mkt-result-card">
              <div class="result-item">
                <span>कंपनी के बैंक खाते में गया:</span>
                <span id="mkt-company-cash" style="color:#34D399; font-weight:800; font-size:1.1rem;">₹50,000 (100%)</span>
              </div>
              <div class="result-item">
                <span>शेयर बेचने वाले पुराने निवेशक को गया:</span>
                <span id="mkt-seller-cash" style="color:#94A3B8; font-weight:700;">₹0</span>
              </div>
              <div class="result-item highlight">
                <span>आर्थिक भूमिका (Economic Role):</span>
                <span id="mkt-role-desc" style="font-size:0.85rem; color:#38BDF8;">पूंजी निर्माण (Capital Formation): कंपनी नई फैक्ट्री और मशीनें लगाएगी।</span>
              </div>
            </div>
          </div>
        `;

      case 'IPO_APPLICATION_SIMULATOR':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">आईपीओ लॉट साइज, ASBA ब्लॉक और अलॉटमेंट संभावना का सिमुलेटर:</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>प्राइस बैंड (Issue Price): ₹300</span>
                  <span class="calc-val">लॉट: 50 शेयर</span>
                </div>
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>आवेदन किए गए लॉट्स (Lots Applied)</span>
                  <span class="calc-val" id="ipo-lots-val">1 लॉट</span>
                </div>
                <input type="range" class="calc-slider" id="ipo-lots" min="1" max="13" step="1" value="1">
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>रिटेल ओवर-सब्सक्रिप्शन (Subscription Multiple)</span>
                  <span class="calc-val" id="ipo-sub-val">10x</span>
                </div>
                <input type="range" class="calc-slider red" id="ipo-sub" min="1" max="50" step="1" value="10">
              </div>
            </div>
            <div class="calc-result-box">
              <div class="result-item">
                <span>बैंक में ASBA ब्लॉक राशि:</span>
                <span id="ipo-block-amt" style="color:#FBBF24; font-weight:800;">₹15,000</span>
              </div>
              <div class="result-item">
                <span>अलॉटमेंट प्रायिकता (Allotment Probability):</span>
                <span id="ipo-odds" style="color:#38BDF8; font-weight:700;">10.0% (10 में से 1)</span>
              </div>
              <div class="result-item highlight">
                <span>SEBI रिटेल अलॉटमेंट नियम:</span>
                <span style="font-size:0.8rem; color:#A7F3D0;">ओवर-सब्सक्रिप्शन पर प्रति व्यक्ति अधिकतम 1 लॉट का कंप्यूटरीकृत रैंडम ड्रॉ होता है।</span>
              </div>
            </div>
          </div>
        `;

      case 'ECOSYSTEM_ROLES_SIMULATOR':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">भारतीय बाजार के 4 स्तंभों पर क्लिक करके उनकी भूमिका व सुरक्षा कवच समझें:</p>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:8px; margin-bottom:16px;">
            <button class="scenario-btn correct" onclick="window.player.showEcosystemRole('sebi')">🛡️ SEBI</button>
            <button class="scenario-btn" onclick="window.player.showEcosystemRole('exchanges')">🏛️ NSE / BSE</button>
            <button class="scenario-btn" onclick="window.player.showEcosystemRole('depositories')">🔐 NSDL / CDSL</button>
            <button class="scenario-btn" onclick="window.player.showEcosystemRole('brokers')">📱 Stock Broker</button>
          </div>
          <div class="calc-result-box" id="eco-detail-card">
            <h4 id="eco-title" style="color:#38BDF8; margin-bottom:6px;">SEBI (Securities & Exchange Board of India)</h4>
            <p id="eco-desc" style="font-size:0.9rem; color:#E2E8F0; line-height:1.5;">संसद के SEBI Act 1992 द्वारा अधिकृत सर्वोच्च स्वतंत्र नियामक। निवेशकों के अधिकारों की रक्षा करना और धोखाधड़ी रोकना इसका मुख्य कार्य है।</p>
            <div id="eco-safety" style="margin-top:8px; font-size:0.85rem; color:#34D399; border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px;">
              ✅ सुरक्षा कवच: SCORES शिकायत पोर्टल और ₹25 लाख का IPF सुरक्षा फंड।
            </div>
          </div>
        `;

      case 'INDEX_WEIGHTAGE_SIMULATOR':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">फ्री-फ्लोट मार्केट कैप और इंडेक्स (निफ्टी 50) पर प्रभाव का सिमुलेटर:</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>कंपनी का शेयर भाव परिवर्तन (% Move)</span>
                  <span class="calc-val" id="idx-move-val">+3.0%</span>
                </div>
                <input type="range" class="calc-slider" id="idx-move" min="-5" max="5" step="0.5" value="3">
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>कंपनी का इंडेक्स वेटेज (Free-Float Weight)</span>
                  <span class="calc-val" id="idx-wt-val">10.0% (दिग्गज हैवीवेट)</span>
                </div>
                <input type="range" class="calc-slider red" id="idx-wt" min="0.5" max="12.0" step="0.5" value="10">
              </div>
            </div>
            <div class="calc-result-box">
              <div class="result-item">
                <span>निफ्टी 50 पर कुल प्रभाव (Points Impact):</span>
                <span id="idx-pts" style="color:#34D399; font-weight:800; font-size:1.2rem;">+75.0 अंक</span>
              </div>
              <div class="result-item highlight">
                <span>फ्री-फ्लोट सिद्धांत:</span>
                <span style="font-size:0.8rem; color:#E2E8F0;">उच्च वेटेज वाली कंपनी (जैसे HDFC Bank / Reliance) के अकेले 3% हिलने से पूरा निफ्टी हिल जाता है, जबकि कम वेटेज वाले शेयर का असर नगण्य होता है।</span>
              </div>
            </div>
          </div>
        `;

      case 'PARTICIPANT_FLOW_TRACKER':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">संस्थागत FII बिकवाली बनाम घरेलू DII SIP खरीदारी का संतुलन सिमुलेटर:</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>विदेशी FII शुद्ध प्रवाह (Net Outflow/Inflow)</span>
                  <span class="calc-val" id="part-fii-val" style="color:#EF4444;">-₹4,000 Cr</span>
                </div>
                <input type="range" class="calc-slider red" id="part-fii" min="-8000" max="8000" step="500" value="-4000">
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>घरेलू DII शुद्ध प्रवाह (Domestic SIP/Inflow)</span>
                  <span class="calc-val" id="part-dii-val" style="color:#34D399;">+₹4,500 Cr</span>
                </div>
                <input type="range" class="calc-slider" id="part-dii" min="0" max="10000" step="500" value="4500">
              </div>
            </div>
            <div class="calc-result-box">
              <div class="result-item">
                <span>कुल संस्थागत तरलता संतुलन (Net Liquidity):</span>
                <span id="part-net-liq" style="color:#34D399; font-weight:800; font-size:1.1rem;">+₹500 Cr (सकारात्मक)</span>
              </div>
              <div class="result-item highlight">
                <span>बाजार की स्थिरता का नतीजा:</span>
                <span id="part-status" style="font-size:0.85rem; color:#A7F3D0;">घरेलू SIP की निरंतर पूंजी ने विदेशी बिकवाली को पूरी तरह सोख लिया। बाजार स्थिर रहेगा।</span>
              </div>
            </div>
          </div>
        `;

      case 'TRINITY_FLOW_SIMULATOR':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">बैंक, ट्रेडिंग और डीमैट खातों के बीच ₹25,000 के शेयर लेनदेन का लाइव सिमुलेटर:</p>
          <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
            <button class="scenario-btn" onclick="window.player.simulateTrinityStep(1)">1. बैंक से पे-इन करें</button>
            <button class="scenario-btn" onclick="window.player.simulateTrinityStep(2)">2. शेयर खरीदें</button>
            <button class="scenario-btn" onclick="window.player.simulateTrinityStep(3)">3. T+1 सेटलमेंट</button>
            <button class="scenario-btn" onclick="window.player.simulateTrinityStep(4)">4. शेयर बेचकर नकद निकालें</button>
          </div>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;" id="trinity-cards">
            <div class="calc-result-box" style="text-align:center;">
              <span style="color:#94A3B8; font-size:0.8rem;">🏦 बचत बैंक खाता</span>
              <div id="tri-bank" style="font-size:1.1rem; color:#38BDF8; font-weight:800; margin-top:4px;">₹1,00,000</div>
            </div>
            <div class="calc-result-box" style="text-align:center;">
              <span style="color:#94A3B8; font-size:0.8rem;">💻 ट्रेडिंग लेजर मार्जिन</span>
              <div id="tri-trading" style="font-size:1.1rem; color:#FBBF24; font-weight:800; margin-top:4px;">₹0</div>
            </div>
            <div class="calc-result-box" style="text-align:center;">
              <span style="color:#94A3B8; font-size:0.8rem;">🔐 NSDL/CDSL डीमैट</span>
              <div id="tri-demat" style="font-size:1.1rem; color:#34D399; font-weight:800; margin-top:4px;">0 शेयर्स</div>
            </div>
          </div>
          <div id="tri-status-text" style="font-size:0.85rem; color:#E2E8F0; margin-top:12px; background:rgba(30,58,138,0.3); padding:10px; border-radius:6px;">
            चरण 1 पर क्लिक करके बैंक से ₹25,000 ट्रेडिंग खाते में ट्रांसफर करें।
          </div>
        `;

      case 'SETTLEMENT_TIMELINE_SIMULATOR':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">T+1 रोलिंग सेटलमेंट कैलेंडर और कॉर्पोरेट एक्शन पात्रता की जांच करें:</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row"><span>ट्रेड का दिन चुनें (Trade Day T):</span></div>
                <select id="stl-day" class="calc-slider" style="background:#0F172A; color:#FFF; border:1px solid #1E3A8A; padding:6px; border-radius:6px; width:100%;">
                  <option value="mon" selected>सोमवार (Monday)</option>
                  <option value="thu">गुरुवार (Thursday)</option>
                  <option value="fri">शुक्रवार (Friday)</option>
                </select>
              </div>
            </div>
            <div class="calc-result-box">
              <div class="result-item">
                <span>डीमैट क्रेडिट दिवस (T+1 Settlement Day):</span>
                <span id="stl-credit-day" style="color:#34D399; font-weight:800; font-size:1.1rem;">मंगलवार (Tuesday) दोपहर</span>
              </div>
              <div class="result-item highlight">
                <span>डिविडेंड / बोनस पात्रता नियम:</span>
                <span style="font-size:0.8rem; color:#E2E8F0;">लाभांश पाने के लिए शेयर हमेशा Ex-Date से कम से कम 1 दिन पहले खरीदना अनिवार्य होता है।</span>
              </div>
            </div>
          </div>
        `;

      case 'CONTRACT_NOTE_CALCULATOR':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">रियल कॉन्ट्रैक्ट नोट और वैधानिक टैक्स (STT, Stamp, GST) कैलकुलेटर:</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row"><span>शेयर खरीद भाव (Buy Price): ₹500</span></div>
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>बिक्री भाव (Sell Price)</span>
                  <span class="calc-val" id="cn-sell-val">₹520</span>
                </div>
                <input type="range" class="calc-slider" id="cn-sell" min="480" max="550" step="1" value="520">
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>शेयर क्वांटिटी (Shares Quantity)</span>
                  <span class="calc-val" id="cn-qty-val">100 शेयर्स</span>
                </div>
                <input type="range" class="calc-slider" id="cn-qty" min="10" max="500" step="10" value="100">
              </div>
            </div>
            <div class="calc-result-box">
              <div class="result-item">
                <span>ग्रॉस प्रॉफिट (Gross Profit):</span>
                <span id="cn-gross" style="color:#38BDF8; font-weight:700;">+₹2,000</span>
              </div>
              <div class="result-item">
                <span>कुल वैधानिक टैक्स व शुल्क (STT, Stamp, GST):</span>
                <span id="cn-taxes" style="color:#EF4444; font-weight:700;">-₹165.40</span>
              </div>
              <div class="result-item highlight">
                <span>शुद्ध लाभ (Net Realized P&L in Bank):</span>
                <span id="cn-net" style="color:#34D399; font-weight:800; font-size:1.1rem;">+₹1,834.60</span>
              </div>
              <div style="font-size:0.75rem; color:#FBBF24; margin-top:4px;">
                💡 ब्रेक-ईवन भाव: <b>₹501.65</b> (इसके ऊपर का हर पैसा शुद्ध लाभ है)
              </div>
            </div>
          </div>
        `;

      case 'ORDER_EXECUTION_SANDBOX':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">मार्केट ऑर्डर बनाम लिमिट ऑर्डर निष्पादन सैंडबॉक्स:</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row"><span>स्क्रीन पर अंतिम भाव (LTP): ₹200.00</span></div>
                <div style="font-size:0.8rem; color:#94A3B8;">ऑर्डर बुक: Ask 1: 50 @ ₹200 | Ask 2: 100 @ ₹202 | Ask 3: 200 @ ₹205</div>
              </div>
              <div style="display:flex; gap:8px; margin-top:12px;">
                <button class="scenario-btn" onclick="window.player.execOrderSandbox('market')">Market Order (150 शेयर्स)</button>
                <button class="scenario-btn" onclick="window.player.execOrderSandbox('limit')">Limit Order @ ₹200 (150 शेयर्स)</button>
              </div>
            </div>
            <div class="calc-result-box" id="order-sandbox-res">
              <div class="result-item">
                <span>निष्पादित औसत भाव (Fill Price):</span>
                <span id="ord-fill-price" style="color:#FBBF24; font-weight:800;">₹201.33</span>
              </div>
              <div class="result-item">
                <span>स्लिपेज (Slippage Impact):</span>
                <span id="ord-slippage" style="color:#EF4444; font-weight:700;">+₹1.33 प्रति शेयर अतिरिक्त खर्च!</span>
              </div>
              <div class="result-item highlight">
                <span>सबक:</span>
                <span style="font-size:0.8rem; color:#A7F3D0;">मार्केट ऑर्डर में गति पक्की होती है लेकिन भाव अनपेक्षित रूप से फिसल जाता है।</span>
              </div>
            </div>
          </div>
        `;

      case 'LEVERAGE_DOUBLE_EDGE_SIMULATOR':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">5x लीवरेज की दोधारी तलवार: मुनाफा और विनाश का आवर्धन सिमुलेटर:</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row"><span>मूल पूंजी: ₹20,000</span></div>
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>लीवरेज चुनें (Leverage Multiple)</span>
                  <span class="calc-val" id="lev2-mult-val">5x (इंट्राडे MIS)</span>
                </div>
                <input type="range" class="calc-slider red" id="lev2-mult" min="1" max="5" step="1" value="5">
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>शेयर की चाल (% Movement)</span>
                  <span class="calc-val" id="lev2-move-val">-10.0%</span>
                </div>
                <input type="range" class="calc-slider" id="lev2-move" min="-20" max="20" step="1" value="-10">
              </div>
            </div>
            <div class="calc-result-box">
              <div class="result-item">
                <span>आपकी पूंजी पर वास्तविक रिटर्न:</span>
                <span id="lev2-capital-ret" style="color:#EF4444; font-weight:800; font-size:1.2rem;">-50.0% (-₹10,000)</span>
              </div>
              <div class="result-item highlight">
                <span>जोखिम निदान (Risk Diagnostic):</span>
                <span id="lev2-alert" style="font-size:0.85rem; color:#FBBF24;">शेयर केवल 10% गिरा, लेकिन 5x लीवरेज के कारण आपकी आधी पूंजी 1 ही दिन में नष्ट हो गई!</span>
              </div>
            </div>
          </div>
        `;

      case 'POSITION_SIZING_CALCULATOR':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">1-2% रिस्क ह्यूरिस्टिक और पोजीशन साइजिंग कैलकुलेटर:</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>कुल ट्रेडिंग पूंजी (Total Capital)</span>
                  <span class="calc-val" id="pos-cap-val">₹1,00,000</span>
                </div>
                <input type="range" class="calc-slider" id="pos-cap" min="20000" max="500000" step="10000" value="100000">
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>स्वीकार्य जोखिम % (Risk Heuristic)</span>
                  <span class="calc-val" id="pos-risk-val">1.0% (₹1,000)</span>
                </div>
                <input type="range" class="calc-slider red" id="pos-risk" min="0.5" max="2.0" step="0.5" value="1.0">
              </div>
              <div class="calc-group">
                <div class="calc-label-row"><span>एंट्री: ₹500 | स्टॉप-लॉस: ₹480 (₹20 रिस्क)</span></div>
              </div>
            </div>
            <div class="calc-result-box">
              <div class="result-item">
                <span>खरीदने योग्य सटीक क्वांटिटी:</span>
                <span id="pos-qty" style="color:#34D399; font-weight:800; font-size:1.2rem;">50 शेयर्स</span>
              </div>
              <div class="result-item">
                <span>ट्रेड में लगने वाली पूंजी:</span>
                <span id="pos-outflow" style="color:#38BDF8; font-weight:700;">₹25,000 (पूंजी का 25%)</span>
              </div>
              <div class="result-item highlight">
                <span>1:2 टारगेट भाव (Target Price):</span>
                <span id="pos-target" style="color:#FBBF24; font-weight:700;">₹540 (+₹2,000 लाभ का लक्ष्य)</span>
              </div>
            </div>
          </div>
        `;

      case 'TIMEFRAME_PERSPECTIVE_SWITCHER':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">टाइमफ्रेम स्विचर: देखें कि कैसे छोटा शोर बड़े टाइमफ्रेम पर साफ ट्रेंड बन जाता है:</p>
          <div style="display:flex; gap:8px; margin-bottom:16px;">
            <button class="scenario-btn" onclick="window.player.switchTimeframe('5m')">5-Minute (Noise)</button>
            <button class="scenario-btn" onclick="window.player.switchTimeframe('1h')">1-Hour (Setup)</button>
            <button class="scenario-btn correct" onclick="window.player.switchTimeframe('daily')">Daily (Trend)</button>
            <button class="scenario-btn" onclick="window.player.switchTimeframe('weekly')">Weekly (Macro)</button>
          </div>
          <div class="calc-result-box" id="tf-display-card">
            <h4 id="tf-title" style="color:#34D399;">Daily Chart: स्पष्ट प्राथमिक अपट्रेंड (Primary Trend)</h4>
            <p id="tf-desc" style="font-size:0.9rem; color:#E2E8F0; line-height:1.5;">शेयर 20 EMA के ऊपर मजबूती से स्थित है। 5-मिनट का छोटा फॉल केवल एक स्वस्थ पुलबैक था। बड़े टाइमफ्रेम के साथ चलना ही सफलता का रहस्य है।</p>
          </div>
        `;

      case 'CANDLESTICK_ANATOMY_EXPLORER':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">कैंडलस्टिक एनाटॉमी और पैटर्न डिटेक्टर एक्सप्लोरर:</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>Open: <b id="cnd-o-val">₹500</b> | Close: <b id="cnd-c-val">₹502</b></span>
                </div>
                <input type="range" class="calc-slider" id="cnd-c" min="475" max="525" step="1" value="502">
              </div>
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>Low: <b id="cnd-l-val">₹475</b> | High: <b id="cnd-h-val">₹505</b></span>
                </div>
                <input type="range" class="calc-slider red" id="cnd-l" min="460" max="498" step="1" value="475">
              </div>
            </div>
            <div class="calc-result-box">
              <div class="result-item">
                <span>पहचाना गया पैटर्न (Detected Pattern):</span>
                <span id="cnd-pattern-name" style="color:#34D399; font-weight:800; font-size:1.1rem;">Bullish Hammer (हथौड़ा)</span>
              </div>
              <div class="result-item highlight">
                <span>मनोवैज्ञानिक विश्लेषण:</span>
                <span id="cnd-psych" style="font-size:0.85rem; color:#A7F3D0;">निचले स्तर ₹475 पर बिकवाल पूरी तरह नकारे गए; लंबी निचली विक खरीदारों की आक्रामकता दर्शाती है।</span>
              </div>
            </div>
          </div>
        `;

      case 'SUPPORT_RESISTANCE_ZONE_SIMULATOR':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">सपोर्ट, रेजिस्टेंस और वॉल्यूम की पुष्टि का सैंडबॉक्स:</p>
          <div class="calc-grid">
            <div class="calc-controls">
              <div class="calc-group">
                <div class="calc-label-row">
                  <span>मूल्य स्थिति (Price Action at Level)</span>
                </div>
                <select id="sr-pos" class="calc-slider" style="background:#0F172A; color:#FFF; border:1px solid #1E3A8A; padding:6px; border-radius:6px; width:100%;">
                  <option value="bounce" selected>सपोर्ट ₹300 पर उछाल (Support Bounce)</option>
                  <option value="breakout_low">रेजिस्टेंस ₹350 टूटा (कम वॉल्यूम पर)</option>
                  <option value="breakout_high">रेजिस्टेंस ₹350 टूटा (भारी वॉल्यूम पर)</option>
                </select>
              </div>
            </div>
            <div class="calc-result-box">
              <div class="result-item">
                <span>तकनीकी वर्गीकरण (Technical Verdict):</span>
                <span id="sr-verdict" style="color:#34D399; font-weight:800; font-size:1.1rem;">वैध सपोर्ट बाउंस (Valid Demand Zone)</span>
              </div>
              <div class="result-item highlight">
                <span>ट्रेडिंग नियम:</span>
                <span id="sr-desc" style="font-size:0.85rem; color:#A7F3D0;">संस्थागत खरीदारों ने ₹300 के स्तर का सम्मान किया; स्टॉप लॉस ₹295 के नीचे लगाकर खरीदारी का अवसर।</span>
              </div>
            </div>
          </div>
        `;

      case 'CLEAN_CHART_SETUP_PLAYGROUND':
        return `
          <p style="font-size:0.95rem; color:var(--text-secondary); margin-bottom:16px;">क्लीन संगम सेटअप बनाम इंडिकेटर सूप प्लेग्राउंड:</p>
          <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
            <button class="scenario-btn correct" id="btn-tgl-ema" onclick="window.player.toggleIndicator('ema')">✅ 20/50 EMA (Trend)</button>
            <button class="scenario-btn correct" id="btn-tgl-rsi" onclick="window.player.toggleIndicator('rsi')">✅ RSI (Momentum)</button>
            <button class="scenario-btn correct" id="btn-tgl-vwap" onclick="window.player.toggleIndicator('vwap')">✅ VWAP (Anchor)</button>
            <button class="scenario-btn" id="btn-tgl-soup" onclick="window.player.toggleIndicator('soup')">❌ Add 10 More (Soup!)</button>
          </div>
          <div class="calc-result-box" id="soup-card">
            <h4 id="soup-title" style="color:#34D399;">क्लीन संगम सेटअप (High Confluence)</h4>
            <p id="soup-desc" style="font-size:0.85rem; color:#E2E8F0; line-height:1.4;">
              स्क्रीन साफ है। 20 EMA ट्रेंड फिल्टर करता है, RSI मोमेंटम संदर्भ देता है, और मुख्य ध्यान प्राइस एक्शन और वॉल्यूम पर है। कोई कन्फ्यूजन नहीं!
            </p>
          </div>
        `;

      case 'SCENARIO':
        return `
          <div class="scenario-grid">
            <div class="scenario-dilemma">
              <h3 style="font-size: 1.15rem; color: var(--text-primary); margin-bottom: 12px;">🏪 स्थिति (The Situation):</h3>
              <p style="font-size: 0.95rem; color: var(--text-secondary); line-height: 1.5;">${screen.content.context}</p>
              <div class="dilemma-stats">
                <div class="stat-row"><span>वर्तमान लाभ / स्थिति:</span> <b>${screen.content.mathBox.currentMonthlyProfit}</b></div>
                <div class="stat-row"><span>बिक्री / बचत:</span> <b>${screen.content.mathBox.annualSavings}</b></div>
                <div class="stat-row"><span>दायित्व / मांग:</span> <b style="color: var(--accent-green);">${screen.content.mathBox.expansionRequirement}</b></div>
                <div class="stat-row"><span>नकदी स्थिति:</span> <b style="color: var(--accent-yellow);">${screen.content.mathBox.timeNeededSelfFunded}</b></div>
              </div>
            </div>

            <div class="scenario-choices">
              <h3 style="font-size: 1.1rem; color: var(--accent-sky); margin-bottom: 10px;">❓ ${screen.content.question}</h3>
              ${screen.content.options.map(opt => `
                <button class="scenario-btn" onclick="window.player.handleScenarioOption('${opt.id}', ${opt.isCorrect})">
                  ${opt.text}
                </button>
              `).join('')}
              <div class="feedback-box" id="scenario-feedback"></div>
            </div>
          </div>
        `;

      case 'COMPARISON':
        const compImg = screen.content.visualPath ? `
          <div style="display: flex; justify-content: center; margin-bottom: 20px;">
            <img src="${screen.content.visualPath}" alt="${screen.title}" style="max-height: 260px; width: 100%; border-radius: 12px;">
          </div>
        ` : '';
        return `
          <p style="font-size: 1rem; color: var(--text-secondary); margin-bottom: 20px;">${screen.content.lead}</p>
          ${compImg}
          <div class="comparison-grid">
            ${screen.content.columns.map(col => `
              <div class="comp-column ${col.type.toLowerCase()}">
                <h3>${col.title}</h3>
                <ul class="comp-list">
                  ${col.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
                <div class="comp-risk-tag">${col.riskNote}</div>
              </div>
            `).join('')}
          </div>
          <div style="background: rgba(255, 255, 255, 0.04); border: 1px dashed rgba(255,255,255,0.2); padding: 14px 20px; border-radius: 8px; font-size: 0.9rem; color: #CBD5E1;">
            ${screen.content.previewNote}
          </div>
        `;

      case 'MYTH_VS_FACT':
        return `
          <div class="myths-container">
            ${screen.content.items.map(item => `
              <div class="myth-card">
                <div class="myth-side">
                  <b>❌ ${item.myth}</b>
                </div>
                <div class="fact-side">
                  <b>✅ ${item.fact}</b>
                </div>
              </div>
            `).join('')}
          </div>
        `;

      case 'RECAP':
        return `
          <div class="recap-grid">
            ${screen.content.takeaways.map(t => `
              <div class="recap-item">
                <div class="recap-num">${t.number}</div>
                <div class="recap-text">
                  <h4>${t.heading}</h4>
                  <p>${t.text}</p>
                </div>
              </div>
            `).join('')}
          </div>
          <div class="next-teaser-box">
            <div>
              <span style="font-size: 0.75rem; color: var(--accent-sky); text-transform: uppercase; font-weight: 700;">${screen.content.nextTeaser.label}</span>
              <div style="font-size: 1.05rem; font-weight: 700; color: #FFFFFF;">${screen.content.nextTeaser.title}</div>
            </div>
            <button class="btn-icon" onclick="window.player.navigate(1)" style="border-color: #0052FF; color: #38BDF8;">
              परीक्षा दें (Quiz) ➔
            </button>
          </div>
        `;

      case 'KNOWLEDGE_CHECK':
        return `
          <div style="max-width: 800px; margin: 0 auto;">
            <div class="quiz-question-box">
              ${screen.content.question}
            </div>
            <div class="quiz-options-list">
              ${screen.content.options.map((opt, i) => `
                <div class="quiz-option" onclick="window.player.handleKnowledgeCheck(this, ${opt.isCorrect})">
                  <div class="opt-circle">${String.fromCharCode(65 + i)}</div>
                  <span>${opt.text}</span>
                </div>
              `).join('')}
            </div>
            <div class="quiz-explanation-box" id="kc-explanation">
              💡 <b>व्याख्या:</b> ${screen.content.explanation}
            </div>
          </div>
        `;

      case 'QUIZ':
        return this.renderQuizHtml(screen);

      case 'COMPLETION':
        return `
          <div class="completion-container">
            <div class="badge-trophy">🏆</div>
            <div class="score-card">
              <div style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 6px;">सर्वर सत्यापित स्कोर (Server-Verified Score)</div>
              <div class="score-number">${this.quizScore} / 5</div>
              <div style="font-size: 1rem; color: var(--accent-green); font-weight: 700;">
                उत्तीर्ण प्रतिशत: ${Math.round((this.quizScore / 5) * 100)}% (पास मानदंड: 70%)
              </div>
            </div>
            <p style="font-size: 1.1rem; color: var(--text-secondary);">${screen.content.congratulations}</p>
            <div class="unlock-badge">
              <span>🔓</span> <b>${screen.content.unlockMessage}</b>
            </div>
            <div class="download-links-row">
              <a href="${screen.content.downloads[0].file}" class="btn-download" target="_blank">
                <i class="fa-solid fa-file-pdf" style="color: #EF4444;"></i>
                <span>${screen.content.downloads[0].label}</span>
              </a>
              <a href="${screen.content.downloads[1].file}" class="btn-download" target="_blank">
                <i class="fa-solid fa-bolt" style="color: #FBBF24;"></i>
                <span>${screen.content.downloads[1].label}</span>
              </a>
            </div>
            <button class="nav-btn btn-next" onclick="window.player.toggleDrawer(true)" style="margin-top: 16px;">
              पाठ्यक्रम सूची देखें (View Curriculum) ➔
            </button>
          </div>
        `;

      default:
        return `<p>${JSON.stringify(screen.content)}</p>`;
    }
  }

  attachScreenInteractivity(screen) {
    if (screen.type === 'NUMERICAL_EXAMPLE') {
      const revSlider = document.getElementById('rev-slider');
      const costSlider = document.getElementById('cost-slider');
      if (revSlider && costSlider) {
        const updateCalc = () => {
          const rev = parseInt(revSlider.value);
          const cost = parseInt(costSlider.value);
          const profit = rev - cost;
          const margin = ((profit / rev) * 100).toFixed(1);

          document.getElementById('rev-val').innerText = `₹${rev.toLocaleString('en-IN')}`;
          document.getElementById('cost-val').innerText = `₹${cost.toLocaleString('en-IN')}`;
          document.getElementById('res-rev').innerText = `₹${rev.toLocaleString('en-IN')}`;
          document.getElementById('res-cost').innerText = `₹${cost.toLocaleString('en-IN')}`;
          
          const resProfit = document.getElementById('res-profit');
          const resMargin = document.getElementById('res-margin');
          const resStatus = document.getElementById('res-status');
          const calcCard = document.getElementById('calc-result-card');

          if (profit >= 0) {
            resProfit.className = 'result-num profit';
            resProfit.innerText = `₹${profit.toLocaleString('en-IN')}`;
            resMargin.innerText = `${margin}%`;
            resStatus.innerText = '✅ व्यापार स्वस्थ मुनाफे में है।';
            resStatus.style.color = '#A7F3D0';
            calcCard.classList.remove('loss');
          } else {
            resProfit.className = 'result-num loss';
            resProfit.innerText = `-₹${Math.abs(profit).toLocaleString('en-IN')}`;
            resMargin.innerText = `${margin}% (Loss)`;
            resStatus.innerText = '⚠️ चेतावनी: लागत अधिक होने से व्यापार घाटे में चल रहा है!';
            resStatus.style.color = '#FCA5A5';
            calcCard.classList.add('loss');
          }
        };

        revSlider.addEventListener('input', updateCalc);
        costSlider.addEventListener('input', updateCalc);
      }
    }

    // 3. Margin Simulator (Lesson 02)
    const simRev = document.getElementById('sim-rev');
    const simCogs = document.getElementById('sim-cogs');
    const simOpex = document.getElementById('sim-opex');

    if (simRev && simCogs && simOpex) {
      const updateSim = () => {
        const rev = parseFloat(simRev.value);
        const cogsPct = parseFloat(simCogs.value) / 100;
        const opexPct = parseFloat(simOpex.value) / 100;

        document.getElementById('sim-rev-val').innerText = '₹' + rev.toLocaleString('en-IN');
        document.getElementById('sim-cogs-val').innerText = (cogsPct * 100).toFixed(0) + '%';
        document.getElementById('sim-opex-val').innerText = (opexPct * 100).toFixed(0) + '%';

        const grossProfit = rev * (1 - cogsPct);
        const opProfit = grossProfit - (rev * opexPct);
        const netProfit = opProfit * 0.75; // standard 25% tax/deductions
        const netMargin = (netProfit / rev) * 100;

        document.getElementById('sim-gross').innerText = '₹' + Math.round(grossProfit).toLocaleString('en-IN');
        document.getElementById('sim-op-profit').innerText = '₹' + Math.round(opProfit).toLocaleString('en-IN');
        
        const netEl = document.getElementById('sim-net-profit');
        const marginEl = document.getElementById('sim-net-margin');
        const statusEl = document.getElementById('sim-status');
        const cardEl = document.getElementById('sim-result-card');

        netEl.innerText = '₹' + Math.round(netProfit).toLocaleString('en-IN');
        marginEl.innerText = netMargin.toFixed(1) + '%';

        if (netProfit > 0) {
          netEl.className = 'result-num profit';
          if (netMargin >= 15) {
            statusEl.innerText = '✅ उच्च मार्जिन (मजबूत वित्तीय स्थिति)';
            statusEl.style.color = '#A7F3D0';
          } else if (netMargin >= 5) {
            statusEl.innerText = '⚡ मध्यम मार्जिन (स्थिर उद्योग)';
            statusEl.style.color = '#FDE68A';
          } else {
            statusEl.innerText = '⚠️ पतला मार्जिन (लागत बढ़ने पर घाटे का भारी जोखिम)';
            statusEl.style.color = '#FCA5A5';
          }
          cardEl.classList.remove('loss');
        } else {
          netEl.className = 'result-num loss';
          statusEl.innerText = '❌ गंभीर घाटा! (लागत आमदनी से अधिक है)';
          statusEl.style.color = '#FCA5A5';
          cardEl.classList.add('loss');
        }
      };

      simRev.addEventListener('input', updateSim);
      simCogs.addEventListener('input', updateSim);
      simOpex.addEventListener('input', updateSim);
    }

    // 4. Leverage Simulator (Lesson 03)
    const levEbit = document.getElementById('lev-ebit');
    const levDebt = document.getElementById('lev-debt');

    if (levEbit && levDebt) {
      const updateLev = () => {
        const ebit = parseFloat(levEbit.value);
        const debt = parseFloat(levDebt.value);
        const interest = debt * 0.10; // 10% interest rate
        const netAfterInterest = ebit - interest;

        document.getElementById('lev-ebit-val').innerText = '₹' + ebit.toLocaleString('en-IN');
        document.getElementById('lev-debt-val').innerText = '₹' + debt.toLocaleString('en-IN');
        document.getElementById('lev-interest').innerText = '₹' + Math.round(interest).toLocaleString('en-IN');

        const icrEl = document.getElementById('lev-icr');
        const equityEl = document.getElementById('lev-equity-profit');
        const statusEl = document.getElementById('lev-status');
        const cardEl = document.getElementById('lev-result-card');

        if (debt === 0) {
          icrEl.innerText = '∞ (ऋण-मुक्त)';
          equityEl.innerText = '₹' + Math.round(ebit).toLocaleString('en-IN');
          equityEl.className = 'result-num profit';
          statusEl.innerText = '🟢 ऋण-मुक्त (Zero Debt): कोई बैंक ब्याज नहीं! मंदी में भी कंपनी 100% सुरक्षित है।';
          statusEl.style.color = '#34D399';
          cardEl.classList.remove('loss');
        } else {
          const icr = ebit / interest;
          icrEl.innerText = icr.toFixed(2) + 'x';
          equityEl.innerText = (netAfterInterest >= 0 ? '₹' : '-₹') + Math.abs(Math.round(netAfterInterest)).toLocaleString('en-IN');

          if (netAfterInterest > 0) {
            equityEl.className = 'result-num profit';
            if (icr >= 3.0) {
              statusEl.innerText = '✅ मजबूत सॉल्वेंसी (Strong Coverage): कमाई ब्याज से 3x अधिक है।';
              statusEl.style.color = '#34D399';
              cardEl.classList.remove('loss');
            } else if (icr >= 1.0) {
              statusEl.innerText = '⚠️ तनावपूर्ण स्थिति (Financial Stress): कमाई का बड़ा भाग बैंक ब्याज में जा रहा है!';
              statusEl.style.color = '#FBBF24';
              cardEl.classList.remove('loss');
            }
          } else {
            equityEl.className = 'result-num loss';
            statusEl.innerText = '🚨 डिफॉल्ट / दिवालियापन का खतरा (Insolvent / Default): ब्याज चुकाने के लिए भी पैसा कम पड़ गया!';
            statusEl.style.color = '#EF4444';
            cardEl.classList.add('loss');
          }
        }
      };

      levEbit.addEventListener('input', updateLev);
      levDebt.addEventListener('input', updateLev);
    }

    // 5. Share Simulator (Lesson 04)
    const shQty = document.getElementById('sh-qty');
    const shBuy = document.getElementById('sh-buy');
    const shMkt = document.getElementById('sh-mkt');
    const shDiv = document.getElementById('sh-div');

    if (shQty && shBuy && shMkt && shDiv) {
      const updateShareSim = () => {
        const qty = parseInt(shQty.value);
        const buy = parseFloat(shBuy.value);
        const mkt = parseFloat(shMkt.value);
        const divPerShare = parseFloat(shDiv.value);

        const invested = qty * buy;
        const currentVal = qty * mkt;
        const capGain = currentVal - invested;
        const capGainPct = invested > 0 ? ((capGain / invested) * 100).toFixed(1) : 0;
        const divCash = qty * divPerShare;
        const totalReturn = capGain + divCash;
        const totalReturnPct = invested > 0 ? ((totalReturn / invested) * 100).toFixed(1) : 0;

        document.getElementById('sh-qty-val').innerText = `${qty} शेयर्स`;
        document.getElementById('sh-buy-val').innerText = `₹${buy.toLocaleString('en-IN')}`;
        document.getElementById('sh-mkt-val').innerText = `₹${mkt.toLocaleString('en-IN')}`;
        document.getElementById('sh-div-val').innerText = `₹${divPerShare}`;

        document.getElementById('sh-invested').innerText = `₹${Math.round(invested).toLocaleString('en-IN')}`;
        document.getElementById('sh-current-val').innerText = `₹${Math.round(currentVal).toLocaleString('en-IN')}`;

        const capGainEl = document.getElementById('sh-cap-gain');
        capGainEl.innerText = `${capGain >= 0 ? '+₹' : '-₹'}${Math.abs(Math.round(capGain)).toLocaleString('en-IN')} (${capGainPct}%)`;
        capGainEl.style.color = capGain >= 0 ? '#34D399' : '#EF4444';

        document.getElementById('sh-div-cash').innerText = `₹${Math.round(divCash).toLocaleString('en-IN')}`;

        const retEl = document.getElementById('sh-total-return');
        const statusEl = document.getElementById('sh-status');
        const cardEl = document.getElementById('sh-result-card');

        retEl.innerText = `${totalReturn >= 0 ? '+₹' : '-₹'}${Math.abs(Math.round(totalReturn)).toLocaleString('en-IN')} (${totalReturnPct}%)`;

        if (totalReturn > 0) {
          retEl.className = 'result-num profit';
          statusEl.innerText = '✅ सकारात्मक रिटर्न: कैपिटल गेन + लाभांश का दोहरा लाभ';
          statusEl.style.color = '#34D399';
          cardEl.classList.remove('loss');
        } else if (totalReturn === 0) {
          retEl.className = 'result-num';
          statusEl.innerText = '⚡ कोई लाभ/हानि नहीं (Break-even)';
          statusEl.style.color = '#FBBF24';
          cardEl.classList.remove('loss');
        } else {
          retEl.className = 'result-num loss';
          statusEl.innerText = '⚠️ पूंजीगत घाटा (Unrealized Loss): वर्तमान बाजार भाव खरीद भाव से कम है';
          statusEl.style.color = '#EF4444';
          cardEl.classList.add('loss');
        }
      };

      shQty.addEventListener('input', updateShareSim);
      shBuy.addEventListener('input', updateShareSim);
      shMkt.addEventListener('input', updateShareSim);
      shDiv.addEventListener('input', updateShareSim);
    }
  }

  handleScenarioOption(optId, isCorrect) {
    const feedbackBox = document.getElementById('scenario-feedback');
    const screen = this.lessonData.screens[this.currentIndex];
    const option = screen.content.options.find(o => o.id === optId);

    document.querySelectorAll('.scenario-btn').forEach(btn => {
      btn.classList.remove('correct', 'wrong');
    });

    if (isCorrect) {
      event.target.classList.add('correct');
      feedbackBox.className = 'feedback-box show correct';
    } else {
      event.target.classList.add('wrong');
      feedbackBox.className = 'feedback-box show wrong';
    }
    feedbackBox.innerText = option.feedback;
  }

  handleKnowledgeCheck(element, isCorrect) {
    document.querySelectorAll('.quiz-option').forEach(el => el.classList.remove('selected', 'correct', 'wrong'));
    if (isCorrect) {
      element.classList.add('correct');
    } else {
      element.classList.add('wrong');
    }
    document.getElementById('kc-explanation').classList.add('show');
  }

  /* ── Quiz Rendering & Handling ── */
  renderQuizHtml(screen) {
    const questions = screen.content.questions;
    const qIndex = this.currentQuizQ;
    const q = questions[qIndex];
    const isAnswered = this.quizAnswers[qIndex] !== undefined;
    const selectedAns = this.quizAnswers[qIndex];

    return `
      <div class="quiz-wrapper">
        <div class="quiz-meta-row">
          <span>प्रश्न ${qIndex + 1} / ${questions.length} • [${q.type}]</span>
          <span>पासिंग कटऑफ: 70% (सर्वर द्वारा मूल्यांकन)</span>
        </div>
        
        <div class="quiz-question-box">
          ${q.question}
        </div>

        <div class="quiz-options-list">
          ${q.options.map((optText, i) => {
            let optClass = 'quiz-option';
            if (isAnswered) {
              if (selectedAns === i) optClass += ' selected';
            }
            return `
              <div class="${optClass}" onclick="window.player.selectQuizOption(${qIndex}, ${i})">
                <div class="opt-circle">${String.fromCharCode(65 + i)}</div>
                <span>${optText}</span>
              </div>
            `;
          }).join('')}
        </div>

        <div class="quiz-actions-row">
          <button class="btn-hint" onclick="document.getElementById('q-hint').classList.toggle('show')">
            💡 हिंट देखें (Show Hint)
          </button>
          <div style="display: flex; gap: 10px;">
            ${qIndex > 0 ? `<button class="btn-icon" onclick="window.player.changeQuizQ(-1)">← पिछला प्रश्न</button>` : ''}
            ${qIndex < questions.length - 1 ? 
              `<button class="btn-icon" onclick="window.player.changeQuizQ(1)" style="background: #0052FF; color: white;">अगला प्रश्न →</button>` : 
              `<button class="btn-icon" id="btn-submit-quiz" onclick="window.player.submitFinalQuiz()" style="background: var(--accent-green); color: #0A1128; font-weight: 800;">सर्वर पर सबमिट करें (Submit Quiz) ✓</button>`
            }
          </div>
        </div>

        <div class="hint-text" id="q-hint">${q.hint}</div>
      </div>
    `;
  }

  selectQuizOption(qIndex, optIndex) {
    this.quizAnswers[qIndex] = optIndex;
    this.renderCurrentScreen();
  }

  changeQuizQ(dir) {
    const questions = this.lessonData.screens[this.currentIndex].content.questions;
    const nextQ = this.currentQuizQ + dir;
    if (nextQ >= 0 && nextQ < questions.length) {
      this.currentQuizQ = nextQ;
      this.renderCurrentScreen();
    }
  }

  async submitFinalQuiz() {
    const screen = this.lessonData.screens[this.currentIndex];
    const questions = screen.content.questions;
    
    // Check if all answered
    const answersArray = [];
    for (let i = 0; i < questions.length; i++) {
      if (this.quizAnswers[i] === undefined) {
        alert(`कृपया सभी 5 प्रश्नों के उत्तर दें! (आपने ${Object.keys(this.quizAnswers).length}/5 के उत्तर दिए हैं)`);
        return;
      }
      answersArray.push(this.quizAnswers[i]);
    }

    const submitBtn = document.getElementById('btn-submit-quiz');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerText = 'मूल्यांकन जारी है...';
    }

    try {
      // ══════════════════════════════════════════════════════════════════════
      // SERVER-AUTHORITATIVE GRADING CALL
      // ══════════════════════════════════════════════════════════════════════
      const res = await fetch('/api/academy/quiz/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-student-id': this.studentId
        },
        body: JSON.stringify({
          studentId: this.studentId,
          lessonId: this.currentLessonId || 'M01_L01',
          answers: answersArray
        })
      });

      if (!res.ok) throw new Error(`Server returned HTTP ${res.status}`);
      const result = await res.json();

      if (result.success) {
        this.quizScore = result.score;
        // Strictly adopt server's authoritative unlock & completion state
        this.unlockedLessons = result.unlockedLessons;
        this.completedLessons = result.completedLessons;
        this.updateCurriculumDrawer();

        if (result.passed) {
          // Passed on server!
          this.navigate(1); // Proceed to completion screen
        } else {
          // Failed on server!
          const nextLessonNum = parseInt((this.currentLessonId || 'M01_L01').replace('M01_L', ''), 10) + 1;
          const nextLessonKey = `Lesson ${nextLessonNum.toString().padStart(2, '0')}`;
          alert(`सर्वर मूल्यांकन परिणाम:\nआपका स्कोर: ${result.score}/5 (${result.percentage}%)\nउत्तीर्ण होने के लिए 70% अंक अनिवार्य हैं।\n${nextLessonKey} लॉक रहेगा। कृपया पुनः प्रयास करें।`);
          this.quizAnswers = {};
          this.currentQuizQ = 0;
          this.renderCurrentScreen();
        }
      } else {
        throw new Error(result.error || 'Evaluation failed');
      }
    } catch (err) {
      console.error('[ACADEMY SECURITY] Server submission failed:', err);
      // Fallback for standalone/local inspection without backend
      alert('सर्वर से संपर्क नहीं हो सका। कृपया सुनिश्चित करें कि ट्रस्टपॉइंट बैकएंड सर्वर सक्रिय है।');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerText = 'पुनः सबमिट करें ✓';
      }
    }
  }

  updateCurriculumDrawer() {
    if (!this.drawerList) return;
    const curriculum = [
      { id: 'M01_L01', title: 'Lesson 01: Business & Capital' },
      { id: 'M01_L02', title: 'Lesson 02: Revenue, Costs & Net Profit' },
      { id: 'M01_L03', title: 'Lesson 03: Debt vs Equity' },
      { id: 'M01_L04', title: 'Lesson 04: What Is a Share & Ownership' },
      { id: 'M01_L05', title: 'Lesson 05: Why Stock Prices Move' },
      { id: 'M01_L06', title: 'Lesson 06: What Is the Stock Market' },
      { id: 'M01_L07', title: 'Lesson 07: IPO & Public Listing' },
      { id: 'M01_L08', title: 'Lesson 08: Market Ecosystem NSE BSE SEBI' },
      { id: 'M01_L09', title: 'Lesson 09: Market Indices & Market Cap' },
      { id: 'M01_L10', title: 'Lesson 10: Market Participants' },
      { id: 'M01_L11', title: 'Lesson 11: The Trinity of Accounts' },
      { id: 'M01_L12', title: 'Lesson 12: Trade Lifecycle & Settlement' },
      { id: 'M01_L13', title: 'Lesson 13: Market Timings Brokerage Charges' },
      { id: 'M01_L14', title: 'Lesson 14: Order Types' },
      { id: 'M01_L15', title: 'Lesson 15: Delivery vs Intraday & Margin' },
      { id: 'M01_L16', title: 'Lesson 16: P&L Risk Management & Styles' },
      { id: 'M01_L17', title: 'Lesson 17: Stock Charts & Timeframes' },
      { id: 'M01_L18', title: 'Lesson 18: Japanese Candlesticks' },
      { id: 'M01_L19', title: 'Lesson 19: Trend Support Resistance Volume' },
      { id: 'M01_L20', title: 'Lesson 20: EMA RSI VWAP & Golden Rules' }
    ];

    let listHtml = '';
    curriculum.forEach(item => {
      const isUnlocked = this.unlockedLessons.includes(item.id);
      const isCompleted = this.completedLessons.includes(item.id);
      const isActive = (item.id === this.currentLessonId);

      let statusIcon = '🔒';
      let itemClass = 'drawer-item';

      if (isCompleted) {
        statusIcon = '✅';
        itemClass += ' completed';
      } else if (isUnlocked) {
        statusIcon = '🔓';
      } else {
        itemClass += ' locked';
      }

      if (isActive) itemClass += ' active';

      listHtml += `
        <div class="${itemClass}" onclick="window.player.handleDrawerItemClick('${item.id}', ${isUnlocked})">
          <span>${item.title}</span>
          <span>${statusIcon}</span>
        </div>
      `;
    });

    this.drawerList.innerHTML = listHtml;
  }

  async handleDrawerItemClick(lessonId, isUnlocked) {
    if (!isUnlocked) {
      alert(`⚠️ यह अध्याय (${lessonId}) अभी लॉक है!\nअनलॉक करने के लिए पिछला पाठ 70% या अधिक अंक के साथ पूरा करें।`);
      return;
    }
    this.toggleDrawer(false);
    if (lessonId === this.currentLessonId) {
      this.goToScreen(0);
      return;
    }
    // Load the selected unlocked lesson dynamically
    await this.fetchLessonData(lessonId);
    this.currentIndex = 0;
    this.quizAnswers = {};
    this.quizScore = 0;
    this.currentQuizQ = 0;
    this.renderCurrentScreen();
    this.updateCurriculumDrawer();
  }
}

// Bootstrap Player upon DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  window.player = new AcademyPlayer();
});
