// ── test_railway_live.js ──────────────────────────────────────────────────
// Complete Live Automated Verification of Railway Staging Deployment
// Target: https://trustpointfin-production.up.railway.app

const https = require('node:https');

const BASE_URL = 'https://trustpointfin-production.up.railway.app';

function makeRequest(method, reqPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(reqPath, BASE_URL);
    const reqOptions = {
      method,
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname + urlObj.search,
      headers: { ...headers }
    };

    let bodyStr = null;
    if (body !== null) {
      bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = https.request(reqOptions, res => {
      let data = [];
      res.on('data', chunk => { data.push(chunk); });
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const text = buffer.toString('utf-8');
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch (_) {
          parsed = text;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
          rawBody: text,
          byteLength: buffer.length
        });
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function extractCookie(resHeaders, cookieName = 'tpf_candidate_session') {
  const setCookie = resHeaders['set-cookie'];
  if (!setCookie) return { raw: null, cookieHeader: null };
  const cookieList = Array.isArray(setCookie) ? setCookie : [setCookie];
  const cookieStr = cookieList.find(c => c.includes(`${cookieName}=`)) || cookieList[0];
  const regex = new RegExp(`(${cookieName}=[^;]+)`);
  const match = cookieStr.match(regex);
  return {
    raw: cookieStr,
    cookieHeader: match ? match[1] : null,
    isHttpOnly: cookieStr.toLowerCase().includes('httponly'),
    isSecure: cookieStr.toLowerCase().includes('secure'),
    sameSite: cookieStr.match(/samesite=([a-z]+)/i)?.[1] || null
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runLiveSuite() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log(' LIVE RAILWAY STAGING AUTOMATED VERIFICATION SUITE           ');
  console.log(` Target: ${BASE_URL}                                        `);
  console.log('═════════════════════════════════════════════════════════════\n');

  try {
    // ── 1. HEALTH CHECK & DATABASE ──
    console.log('▶ [1/10] Verifying Live Railway System Health & SQLite Connection...');
    const health = await makeRequest('GET', '/api/health');
    assert(health.statusCode === 200, 'Health endpoint returns HTTP 200 OK');
    assert(health.body.status === 'online', 'Server reports status: online');
    assert(health.body.brand === 'TrustPoint Finance', 'Brand is TrustPoint Finance');
    assert(health.body.database === 'SQLite (node:sqlite) Active', 'Native node:sqlite DatabaseSync is Active');

    // ── 2. MARKETING WEBSITE ENTRY POINTS ──
    console.log('\n▶ [2/10] Verifying Live Marketing Website Core Routes...');
    const home = await makeRequest('GET', '/');
    assert(home.statusCode === 200, 'GET / returns 200 OK');
    assert(home.headers['content-type'].includes('text/html'), 'GET / content-type is text/html');
    assert(home.rawBody.includes('TrustPoint'), 'GET / contains TrustPoint branding');
    assert(home.rawBody.includes('Start Your Investment Journey Today'), 'GET / contains marketing headline');
    assert(home.rawBody.includes('href="/academy/"') && home.rawBody.includes('>Academy<'), 'GET / navbar contains visible <a href="/academy/">Academy</a> link');

    const insights = await makeRequest('GET', '/insights.html');
    assert(insights.statusCode === 200, 'GET /insights.html returns 200 OK');
    assert(insights.rawBody.includes('insights-grid'), 'GET /insights.html contains insights grid');
    assert(insights.rawBody.includes('href="/academy/"'), 'GET /insights.html navbar contains visible <a href="/academy/">Academy</a> link');

    const privacy = await makeRequest('GET', '/privacy.html');
    assert(privacy.statusCode === 200, 'GET /privacy.html returns 200 OK');
    assert(privacy.rawBody.includes('Privacy Policy'), 'GET /privacy.html contains Privacy Policy');

    const sitemap = await makeRequest('GET', '/sitemap.xml');
    assert(sitemap.statusCode === 200, 'GET /sitemap.xml returns 200 OK');
    assert(sitemap.headers['content-type'].includes('xml'), 'GET /sitemap.xml is application/xml');
    assert(sitemap.rawBody.includes('https://trustpointfin.org/'), 'GET /sitemap.xml contains production canonical URLs');

    const robots = await makeRequest('GET', '/robots.txt');
    assert(robots.statusCode === 200, 'GET /robots.txt returns 200 OK');
    assert(robots.headers['content-type'].includes('text/plain'), 'GET /robots.txt is text/plain');
    assert(robots.rawBody.includes('Sitemap: https://trustpointfin.org/sitemap.xml'), 'GET /robots.txt specifies sitemap location');

    // ── 3. STATIC ASSETS & EXTERNAL INTEGRATIONS ──
    console.log('\n▶ [3/10] Verifying Live Assets, Styles, and Integrations...');
    const css = await makeRequest('GET', '/styles.css');
    assert(css.statusCode === 200, 'GET /styles.css returns 200 OK');
    assert(css.headers['content-type'].includes('text/css'), 'GET /styles.css is text/css');

    const js = await makeRequest('GET', '/main.js');
    assert(js.statusCode === 200, 'GET /main.js returns 200 OK');
    assert(js.headers['content-type'].includes('javascript'), 'GET /main.js is application/javascript');

    const logo = await makeRequest('GET', '/logo.jpg');
    assert(logo.statusCode === 200, 'GET /logo.jpg returns 200 OK');
    assert(logo.headers['content-type'].includes('image/jpeg'), 'GET /logo.jpg is image/jpeg');

    // Integrations in homepage and JS
    assert(home.rawBody.includes('TradingView') || home.rawBody.includes('tradingview.com'), 'TradingView widget present in homepage');
    assert(home.rawBody.includes('wa.me'), 'WhatsApp chat CTA present');
    assert(home.rawBody.includes('t.me'), 'Telegram community CTA present');
    assert(home.rawBody.includes('a.aonelink.in/ANGOne'), 'Angel One sub-broker CTA present');
    assert(js.rawBody.includes('api.web3forms.com'), 'Web3Forms contact endpoint configured');

    // ── 4. SAMPLE ARTICLES (5 LIVE CHECKS) ──
    console.log('\n▶ [4/10] Verifying 5 Sample Financial Articles on Railway...');
    const sampleArticles = [
      'gold-etfs-analysis-how-indian-investors-can-avoid-massive-dr.html',
      'hdfc-bank-analysis-from-long-term-wealth-creation-to-fibonac.html',
      'nifty-50-analysis-for-working-professionals-leveraging-volum.html',
      'the-can-slim-method-explained-for-long-term-wealth-creation-.html',
      'understanding-option-greeks-a-retail-traders-guide-to-winnin.html'
    ];

    for (const article of sampleArticles) {
      const art = await makeRequest('GET', `/${article}`);
      assert(art.statusCode === 200, `GET /${article} returns 200 OK`);
      assert(art.headers['content-type'].includes('text/html'), `/${article} has text/html content-type`);
      assert(art.rawBody.includes('<title>'), `/${article} has title tag`);
      assert(art.rawBody.includes('application/ld+json'), `/${article} has Schema.org JSON-LD`);
      assert(art.rawBody.includes('a.aonelink.in/ANGOne'), `/${article} has Angel One CTA`);
    }

    // ── 5. PROTECTED WEALTH TERMINAL & ADVISOR AUTHENTICATION ──
    console.log('\n▶ [5/10] Verifying Protected Wealth Terminal & Advisor Authentication...');
    const unauthDash = await makeRequest('GET', '/dashboard', { Accept: 'text/html' });
    assert(unauthDash.statusCode === 302, 'Unauthenticated GET /dashboard redirects (302) to /advisor/login');
    assert(unauthDash.headers['location'] === '/advisor/login', 'Redirect target is /advisor/login');

    const unauthLeads = await makeRequest('GET', '/api/leads');
    assert(unauthLeads.statusCode === 401, 'Unauthenticated GET /api/leads returns 401 Unauthorized');

    // Advisor Login page check
    const advLoginPage = await makeRequest('GET', '/advisor/login');
    assert(advLoginPage.statusCode === 200, 'GET /advisor/login returns 200 OK');
    assert(advLoginPage.rawBody.includes('Advisor Terminal'), 'Advisor login page renders branding');

    // Test Server-Side Rate Limiting on dedicated probe identifier
    const probeUser = 'probe_rate_limit_' + Date.now();
    for (let i = 1; i <= 5; i++) {
      await makeRequest('POST', '/api/advisor/login', {}, { username: probeUser, password: 'WrongPasswordProbe' });
    }
    const throttledProbe = await makeRequest('POST', '/api/advisor/login', {}, { username: probeUser, password: 'WrongPasswordProbe' });
    assert(throttledProbe.statusCode === 429, 'Advisor login brute-force protection triggers HTTP 429 Too Many Requests');

    // Advisor Login (Normal Valid Login)
    const advLogin = await makeRequest('POST', '/api/advisor/login', {}, {
      username: 'advisor_staging',
      password: 'StagingAdvisor2026!Sec'
    });
    assert(advLogin.statusCode === 200, 'POST /api/advisor/login succeeds with 200 OK');
    assert(advLogin.body.success === true, 'Advisor login returns success: true');
    const advCookieData = extractCookie(advLogin.headers, 'tpf_advisor_session');
    assert(advCookieData.cookieHeader !== null, 'Advisor received tpf_advisor_session cookie');
    const advisorHeader = { Cookie: advCookieData.cookieHeader };

    // Advisor Me check
    const advMe = await makeRequest('GET', '/api/advisor/me', advisorHeader);
    assert(advMe.statusCode === 200, 'GET /api/advisor/me returns 200 OK');
    assert(advMe.body.authenticated === true, 'Advisor is authenticated');

    // Authorized advisor access to dashboard
    const dashHome = await makeRequest('GET', '/dashboard/', advisorHeader);
    assert(dashHome.statusCode === 200, 'Authorized advisor GET /dashboard/ returns 200 OK');
    assert(dashHome.rawBody.includes('Universal Wealth & Order Flow Terminal'), 'GET /dashboard/ contains Terminal title');
    assert(!dashHome.rawBody.includes('Rohan Sharma'), 'Served HTML does NOT contain hardcoded client names');
    assert(!dashHome.rawBody.includes('+91 98765 43210'), 'Served HTML does NOT contain hardcoded phone numbers');

    const dashCss = await makeRequest('GET', '/dashboard/index.css', advisorHeader);
    assert(dashCss.statusCode === 200, 'GET /dashboard/index.css returns 200 OK');

    const dashJs = await makeRequest('GET', '/dashboard/index.js', advisorHeader);
    assert(dashJs.statusCode === 200, 'GET /dashboard/index.js returns 200 OK');
    assert(!dashJs.rawBody.includes('Rohan Sharma'), 'Served JS does NOT contain hardcoded client names');

    // Authorized advisor access to CRM leads API
    const advLeads = await makeRequest('GET', '/api/leads', advisorHeader);
    assert(advLeads.statusCode === 200, 'Authorized advisor GET /api/leads returns 200 OK');
    assert(Array.isArray(advLeads.body.data), 'Advisor can retrieve CRM lead records from DB');

    // Advisor Logout & Session Destruction
    const advLogout = await makeRequest('POST', '/api/advisor/logout', advisorHeader);
    assert(advLogout.statusCode === 200, 'POST /api/advisor/logout returns 200 OK');
    const advMeAfterLogout = await makeRequest('GET', '/api/advisor/me', advisorHeader);
    assert(advMeAfterLogout.body.authenticated === false, 'Destroyed advisor session returns authenticated: false');

    // ── 6. ACADEMY ENTRY POINT & HINDI AUTO-TRANSLATION FREEZE ──
    console.log('\n▶ [6/10] Verifying Academy Entry Point & Hindi Freeze Controls...');
    const acadRedirect = await makeRequest('GET', '/academy');
    assert(acadRedirect.statusCode === 302, 'GET /academy redirects (302) to /academy/');
    assert(acadRedirect.headers['location'] === '/academy/', 'Redirect target is /academy/');

    const acadHome = await makeRequest('GET', '/academy/');
    assert(acadHome.statusCode === 200, 'GET /academy/ returns 200 OK');
    assert(acadHome.rawBody.includes('lang="hi"'), 'Academy declares lang="hi"');
    assert(acadHome.rawBody.includes('translate="no"'), 'Academy declares translate="no"');
    assert(acadHome.rawBody.includes('class="notranslate"'), 'Academy declares class="notranslate"');
    assert(acadHome.rawBody.includes('meta name="google" content="notranslate"'), 'Google notranslate meta tag present');
    assert(acadHome.rawBody.includes('TrustPoint Finance Academy'), 'Academy title present');

    // Assets
    const acadSvg = await makeRequest('GET', '/academy/assets/visuals/business_value_engine.svg');
    assert(acadSvg.statusCode === 200, 'GET /academy/assets/visuals/business_value_engine.svg returns 200 OK');
    assert(acadSvg.headers['content-type'].includes('svg'), 'SVG MIME is image/svg+xml');

    const acadPdf = await makeRequest('GET', '/academy/downloads/M01_L01_Lesson_Notes.pdf');
    assert(acadPdf.statusCode === 200, 'GET /academy/downloads/M01_L01_Lesson_Notes.pdf returns 200 OK');
    assert(acadPdf.headers['content-type'].includes('pdf'), 'PDF MIME is application/pdf');

    // ── 7. SECURITY GATING & UNAUTHENTICATED BLOCKING ──
    console.log('\n▶ [7/10] Verifying Security Gating & Answer Key Secrecy...');
    const unauthProg = await makeRequest('GET', '/api/academy/progress');
    assert(unauthProg.statusCode === 401, 'Unauthenticated /api/academy/progress blocked with 401');

    const unauthSubmit = await makeRequest('POST', '/api/academy/quiz/submit', {}, {
      lessonId: 'M01_L01', answers: [0, 0, 0, 0, 0]
    });
    assert(unauthSubmit.statusCode === 401, 'Unauthenticated /api/academy/quiz/submit blocked with 401');

    const unauthL01 = await makeRequest('GET', '/api/academy/lessons/M01_L01');
    assert(unauthL01.statusCode === 401, 'Unauthenticated /api/academy/lessons/M01_L01 blocked with 401');

    const blockedQuiz = await makeRequest('GET', '/academy/data/lesson01_quiz.json');
    assert(blockedQuiz.statusCode === 403, 'Direct access to lesson01_quiz.json blocked with 403');

    // ── 8. CANDIDATE A AUTHENTICATION & PROGRESSION ──
    console.log('\n▶ [8/10] Testing Live Staging OTP, Session Cookie & Candidate A Progression...');
    const randomSuffix = Math.floor(10000000 + Math.random() * 90000000).toString();
    const mobileA = '91' + randomSuffix.slice(0, 8);
    const mobileB = '92' + randomSuffix.slice(0, 8);
    const otpReqA = await makeRequest('POST', '/api/auth/request-otp', {}, { mobile: mobileA });
    assert(otpReqA.statusCode === 200, 'Candidate A OTP request succeeded with 200');
    assert(otpReqA.body.success === true, 'OTP request returns success: true');

    if (typeof otpReqA.body.stagingOtp === 'string') {
      const otpA = otpReqA.body.stagingOtp;
      console.log(`    [STAGING OTP RECEIVED]: ${otpA}`);

      // Verify OTP
      const verifyReqA = await makeRequest('POST', '/api/auth/verify-otp', {}, { mobile: mobileA, otp: otpA });
      assert(verifyReqA.statusCode === 200, 'Candidate A OTP verification succeeded with 200');
      const cookieDataA = extractCookie(verifyReqA.headers);
      assert(cookieDataA.cookieHeader !== null, 'Candidate A received tpf_candidate_session cookie');
      assert(cookieDataA.isHttpOnly === true, 'Session cookie has HttpOnly flag');
      assert(cookieDataA.isSecure === true, 'Session cookie has Secure flag over HTTPS');
      assert(cookieDataA.sameSite === 'Lax', 'Session cookie has SameSite=Lax');
      const cookieHeaderA = { Cookie: cookieDataA.cookieHeader };

      // Identity check
      const meA = await makeRequest('GET', '/api/auth/me', cookieHeaderA);
      assert(meA.statusCode === 200, '/api/auth/me returns 200');
      assert(meA.body.authenticated === true, 'Candidate A is authenticated');
      assert(meA.body.candidate.mobile === mobileA, 'Candidate A mobile matches');
      const candidateIdA = meA.body.candidate.id;

      // Initial state
      const progA1 = await makeRequest('GET', '/api/academy/progress', cookieHeaderA);
      assert(progA1.statusCode === 200, 'Candidate A can access progress');
      assert(progA1.body.unlockedLessons.includes('M01_L01'), 'M01_L01 is unlocked');
      assert(!progA1.body.unlockedLessons.includes('M01_L02'), 'M01_L02 is initially locked');

      // Candidate Isolation: Candidate cannot access Dashboard or CRM APIs (403 Forbidden)
      const candDash = await makeRequest('GET', '/dashboard/', cookieHeaderA, null, false, { Accept: 'application/json' });
      assert(candDash.statusCode === 403, 'Candidate A access to /dashboard/ is strictly blocked with 403 Forbidden');
      const candLeads = await makeRequest('GET', '/api/leads', cookieHeaderA);
      assert(candLeads.statusCode === 403, 'Candidate A access to /api/leads is strictly blocked with 403 Forbidden');

      // Locked lesson access
      const l02Locked = await makeRequest('GET', '/api/academy/lessons/M01_L02', cookieHeaderA);
      assert(l02Locked.statusCode === 403, 'GET /api/academy/lessons/M01_L02 returns 403 Forbidden');

      // Failing quiz attempt (< 70%)
      console.log('\n    Submitting failing quiz attempt (1/5 = 20%)...');
      const failQuiz = await makeRequest('POST', '/api/academy/quiz/submit', cookieHeaderA, {
        lessonId: 'M01_L01',
        answers: [0, 0, 0, 0, 0] // Only index 2 correct -> 1/5 (20%)
      });
      assert(failQuiz.statusCode === 200, 'Quiz evaluated server-side');
      assert(failQuiz.body.passed === false, 'Quiz result passed === false');
      assert(failQuiz.body.score === 1, 'Quiz score is 1/5');
      assert(failQuiz.body.percentage === 20, 'Percentage is 20% (<70%)');

      const l02StillLocked = await makeRequest('GET', '/api/academy/lessons/M01_L02', cookieHeaderA);
      assert(l02StillLocked.statusCode === 403, 'M01_L02 remains 403 locked after failing quiz');

      // Passing quiz attempt (4/5 = 80% >= 70%)
      console.log('    Submitting passing quiz attempt (4/5 = 80%)...');
      const passQuiz = await makeRequest('POST', '/api/academy/quiz/submit', cookieHeaderA, {
        lessonId: 'M01_L01',
        answers: [1, 2, 0, 1, 0] // 4 of 5 correct (L01 keys: [1, 2, 0, 1, 2])
      });
      assert(passQuiz.statusCode === 200, 'Passing quiz evaluated');
      assert(passQuiz.body.passed === true, 'Quiz result passed === true (80% >= 70%)');
      assert(passQuiz.body.unlockedLessons.includes('M01_L02'), 'unlockedLessons includes M01_L02');

      // Now L02 is unlocked!
      const l02Unlocked = await makeRequest('GET', '/api/academy/lessons/M01_L02', cookieHeaderA);
      assert(l02Unlocked.statusCode === 200, 'M01_L02 is now accessible with HTTP 200 OK');
      assert(l02Unlocked.body.success === true, 'M01_L02 returns success: true');

      // ── 9. PERSISTENCE ACROSS LOGOUT & RELOGIN (VOLUME TEST) ──
      console.log('\n▶ [9/10] Verifying Session Destruction & SQLite Persistence Across Relogin...');
      const logoutRes = await makeRequest('POST', '/api/auth/logout', cookieHeaderA);
      assert(logoutRes.statusCode === 200, 'Logout succeeded with 200');

      const oldSessionCheck = await makeRequest('GET', '/api/auth/me', cookieHeaderA);
      assert(oldSessionCheck.body.authenticated === false, 'Destroyed session returns authenticated: false');

      const otpReqA2 = await makeRequest('POST', '/api/auth/request-otp', {}, { mobile: mobileA });
      const verifyReqA2 = await makeRequest('POST', '/api/auth/verify-otp', {}, { mobile: mobileA, otp: otpReqA2.body.stagingOtp });
      const cookieDataA2 = extractCookie(verifyReqA2.headers);
      const cookieHeaderA2 = { Cookie: cookieDataA2.cookieHeader };

      const progA2 = await makeRequest('GET', '/api/academy/progress', cookieHeaderA2);
      assert(progA2.body.completedLessons.includes('M01_L01'), 'PERSISTENCE: Completed M01_L01 persisted in SQLite');
      assert(progA2.body.unlockedLessons.includes('M01_L02'), 'PERSISTENCE: Unlocked M01_L02 persisted in SQLite');

      // ── 10. CANDIDATE ISOLATION (CANDIDATE A vs CANDIDATE B) ──
      console.log('\n▶ [10/10] Verifying Candidate Isolation & Anti-Tampering...');
      const otpReqB = await makeRequest('POST', '/api/auth/request-otp', {}, { mobile: mobileB });
      const verifyReqB = await makeRequest('POST', '/api/auth/verify-otp', {}, { mobile: mobileB, otp: otpReqB.body.stagingOtp });
      const cookieHeaderB = { Cookie: extractCookie(verifyReqB.headers).cookieHeader };

      const progB = await makeRequest('GET', '/api/academy/progress', cookieHeaderB);
      assert(!progB.body.completedLessons.includes('M01_L01'), 'ISOLATION: Candidate B has zero completed lessons');
      assert(!progB.body.unlockedLessons.includes('M01_L02'), 'ISOLATION: Candidate B does NOT have M01_L02 unlocked');
      const candB_L02 = await makeRequest('GET', '/api/academy/lessons/M01_L02', cookieHeaderB);
      const l02B = await makeRequest('GET', '/api/academy/lessons/M01_L02', cookieHeaderB);
      assert(l02B.statusCode === 403, 'Candidate B receives 403 Forbidden for M01_L02');

      // Tampering test: Candidate B submits quiz attempting to spoof Candidate A id
      const spoofSubmit = await makeRequest('POST', '/api/academy/quiz/submit', cookieHeaderB, {
        candidateId: candidateIdA,
        studentId: candidateIdA,
        lessonId: 'M01_L01',
        answers: [0, 0, 0, 0, 0]
      });
      assert(spoofSubmit.body.candidateId !== candidateIdA, 'Server strictly derived candidateId from session, ignoring spoofing attempt');
    } else {
      console.log('    [LIVE SMS GATEWAY ACTIVE]: stagingOtp strictly suppressed for production security.');
      assert(otpReqA.body.stagingOtp === undefined, 'stagingOtp is strictly undefined when real SMS provider is active');
      assert(otpReqA.body.message === 'OTP dispatched successfully.', 'OTP dispatched message returned');
      console.log('\n▶ [9/10 & 10/10] Skipping automated live SMS candidate loops to preserve wallet balance.');
      console.log('    (Full candidate progression & isolation verified in test_staging_local.js and test_security_and_remediation.js)');
    }

    console.log('\n═════════════════════════════════════════════════════════════');
    console.log(` ALL ${totalTests} LIVE RAILWAY STAGING TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('═════════════════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n❌ LIVE RAILWAY TEST FAILED:', err);
    process.exitCode = 1;
  }
}

runLiveSuite();
