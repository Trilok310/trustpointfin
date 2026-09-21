// ── test_security_and_remediation.js ──────────────────────────────────────────
// Complete Security, Advisor Authentication, CRM Gating & Navigation Verification
// Tests all 12 requested security test cases + Academy regression

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

// Ensure clean test DB
const TEST_DB_PATH = path.join(__dirname, 'test_remediation.db');
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}
process.env.DATABASE_PATH = TEST_DB_PATH;
process.env.PORT = '3098';
process.env.NODE_ENV = 'staging';
process.env.STAGING_ADVISOR_USERNAME = 'advisor_staging';
process.env.STAGING_ADVISOR_PASSWORD = 'StagingAdvisor2026!Sec';

const { server, db, AUTHORITATIVE_ACADEMY } = require('./server.js');

const TEST_PORT = 3098;
const BASE_URL = `http://localhost:${TEST_PORT}`;

function makeRequest(method, reqPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(reqPath, BASE_URL);
    const reqOptions = {
      method,
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      headers: { ...headers }
    };

    let bodyStr = null;
    if (body !== null) {
      bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const req = http.request(reqOptions, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (_) {
          parsed = data;
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
          rawBody: data
        });
      });
    });

    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

function extractCookie(headers, cookieName) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  const cookieStr = Array.isArray(setCookie) ? setCookie.find(c => c.startsWith(`${cookieName}=`)) : setCookie;
  if (!cookieStr) return null;
  return cookieStr.split(';')[0];
}

let totalTests = 0;
let passedTests = 0;

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

async function runRemediationTests() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log(' SECURITY REMEDIATION & ADVISOR AUTH VERIFICATION SUITE       ');
  console.log(' Target: Local Staging Server (Port 3098)                    ');
  console.log('═════════════════════════════════════════════════════════════\n');

  await new Promise(resolve => server.listen(TEST_PORT, resolve));

  try {
    // ── 1. BLOCKER 1: Marketing Website Navigation Verification ──
    console.log('▶ [1/12] Verifying Academy Link in Primary Navigation...');
    const homeHtml = await makeRequest('GET', '/');
    assert(homeHtml.statusCode === 200, 'GET / returns 200 OK');
    assert(homeHtml.rawBody.includes('href="/academy/"') && homeHtml.rawBody.includes('>Academy<'),
      'Homepage navbar contains visible <a href="/academy/">Academy</a> link');
    
    const insightsHtml = await makeRequest('GET', '/insights.html');
    assert(insightsHtml.statusCode === 200, 'GET /insights.html returns 200 OK');
    assert(insightsHtml.rawBody.includes('href="/academy/"'),
      'insights.html navbar contains visible <a href="/academy/">Academy</a> link');

    // ── 2. Fresh Visitor → /dashboard/ and /api/leads Denied ──
    console.log('\n▶ [2/12] Verifying Fresh Unauthenticated Visitor Denied Access...');
    const dashBrowserRes = await makeRequest('GET', '/dashboard/', { 'Accept': 'text/html' });
    assert(dashBrowserRes.statusCode === 302, 'Browser request to /dashboard/ redirects (302) to /advisor/login');
    assert(dashBrowserRes.headers.location === '/advisor/login', 'Redirect destination is /advisor/login');

    const dashDirectRes = await makeRequest('GET', '/dashboard/', { 'Accept': 'application/json' });
    assert(dashDirectRes.statusCode === 401, 'Direct/API request to /dashboard/ returns 401 Unauthorized');
    assert(dashDirectRes.body.success === false, 'Dashboard API returns success: false');

    const unauthLeads = await makeRequest('GET', '/api/leads');
    assert(unauthLeads.statusCode === 401, 'GET /api/leads without auth returns 401 Unauthorized');
    assert(unauthLeads.body.success === false, '/api/leads returns success: false');

    // ── 3. Data Exposure Check: Static Files Free of Sensitive Leads ──
    console.log('\n▶ [3/12] Verifying Sensitive Data Sanitization in Static Assets...');
    const staticHtml = fs.readFileSync(path.join(__dirname, 'dashboard', 'index.html'), 'utf8');
    assert(!staticHtml.includes('Rohan Sharma'), 'dashboard/index.html does NOT contain "Rohan Sharma"');
    assert(!staticHtml.includes('+91 98765 43210'), 'dashboard/index.html does NOT contain "+91 98765 43210"');
    assert(!staticHtml.includes('Priya Patel'), 'dashboard/index.html does NOT contain "Priya Patel"');
    assert(!staticHtml.includes('ROHA4322'), 'dashboard/index.html does NOT contain "ROHA4322"');
    assert(!staticHtml.includes('UCC-90812'), 'dashboard/index.html does NOT contain "UCC-90812"');

    const staticJs = fs.readFileSync(path.join(__dirname, 'dashboard', 'index.js'), 'utf8');
    assert(!staticJs.includes('Rohan Sharma'), 'dashboard/index.js does NOT contain "Rohan Sharma"');
    assert(!staticJs.includes('+91 98765 43210'), 'dashboard/index.js does NOT contain "+91 98765 43210"');

    // ── 4. Candidate Authentication & Isolation from Dashboard ──
    console.log('\n▶ [4/12] Authenticating Academy Candidate A & Verifying Isolation...');
    const candOtpReq = await makeRequest('POST', '/api/auth/request-otp', {}, { mobile: '9876543210' });
    assert(candOtpReq.statusCode === 200, 'Candidate OTP request returns 200');
    const candOtp = candOtpReq.body.stagingOtp;
    
    const candVerifyReq = await makeRequest('POST', '/api/auth/verify-otp', {}, { mobile: '9876543210', otp: candOtp });
    assert(candVerifyReq.statusCode === 200, 'Candidate OTP verification returns 200');
    const candCookie = extractCookie(candVerifyReq.headers, 'tpf_candidate_session');
    assert(candCookie !== null, 'Candidate received tpf_candidate_session cookie');

    // Candidate CAN access Academy
    const candProg = await makeRequest('GET', '/api/academy/progress', { Cookie: candCookie });
    assert(candProg.statusCode === 200, 'Candidate CAN access Academy progress');

    // Candidate CANNOT access Dashboard (403 Forbidden)
    const candDash = await makeRequest('GET', '/dashboard/', { Cookie: candCookie, Accept: 'application/json' });
    assert(candDash.statusCode === 403, 'Candidate access to /dashboard/ returns 403 Forbidden');
    assert(candDash.body.error.includes('Forbidden: Academy candidates'), 'Error states candidate forbidden');

    // Candidate CANNOT access /api/leads (403 Forbidden)
    const candLeads = await makeRequest('GET', '/api/leads', { Cookie: candCookie });
    assert(candLeads.statusCode === 403, 'Candidate access to /api/leads returns 403 Forbidden');
    assert(candLeads.body.error.includes('Forbidden: Academy candidates'), 'Error states candidate forbidden on CRM');

    // Candidate CANNOT post new leads (403 Forbidden)
    const candPostLead = await makeRequest('POST', '/api/leads', { Cookie: candCookie }, { name: 'Hack', contact: '123' });
    assert(candPostLead.statusCode === 403, 'Candidate POST /api/leads returns 403 Forbidden');

    // ── 5. Advisor Login Page & Authentication ──
    console.log('\n▶ [5/12] Testing Advisor Login UI & POST /api/advisor/login...');
    const loginPage = await makeRequest('GET', '/advisor/login');
    assert(loginPage.statusCode === 200, 'GET /advisor/login returns 200 OK');
    assert(loginPage.rawBody.includes('Advisor Terminal'), 'Login page displays Advisor Terminal branding');
    assert(loginPage.rawBody.includes('advisor-login-form'), 'Login page contains advisor login form');

    // Bad advisor credentials
    const badLogin = await makeRequest('POST', '/api/advisor/login', {}, { username: 'advisor_staging', password: 'WrongPassword' });
    assert(badLogin.statusCode === 401, 'Invalid password returns 401 Unauthorized');

    // Valid advisor credentials
    const goodLogin = await makeRequest('POST', '/api/advisor/login', {}, {
      username: 'advisor_staging',
      password: 'StagingAdvisor2026!Sec'
    });
    assert(goodLogin.statusCode === 200, 'Valid advisor login returns 200 OK');
    assert(goodLogin.body.success === true, 'Login response success: true');
    assert(goodLogin.body.advisor.username === 'advisor_staging', 'Advisor profile matches');

    const advisorCookie = extractCookie(goodLogin.headers, 'tpf_advisor_session');
    assert(advisorCookie !== null, 'Advisor received tpf_advisor_session cookie');
    assert(!advisorCookie.includes('tpf_candidate_session'), 'Advisor cookie is distinct from candidate cookie');

    // ── 6. GET /api/advisor/me ──
    console.log('\n▶ [6/12] Verifying GET /api/advisor/me...');
    const advisorMe = await makeRequest('GET', '/api/advisor/me', { Cookie: advisorCookie });
    assert(advisorMe.statusCode === 200, '/api/advisor/me returns 200');
    assert(advisorMe.body.authenticated === true, 'Advisor is authenticated');
    assert(advisorMe.body.advisor.username === 'advisor_staging', 'Advisor username is advisor_staging');

    // ── 7. Authenticated Advisor → /dashboard/ Access ──
    console.log('\n▶ [7/12] Verifying Authorized Advisor Access to /dashboard/...');
    const advisorDash = await makeRequest('GET', '/dashboard/', { Cookie: advisorCookie });
    assert(advisorDash.statusCode === 200, 'Advisor GET /dashboard/ returns 200 OK');
    assert(advisorDash.rawBody.includes('TrustPoint Finance — Universal Wealth & Order Flow Terminal'),
      'Advisor receives Wealth Terminal HTML');

    // ── 8. Authenticated Advisor → CRM APIs ──
    console.log('\n▶ [8/12] Verifying Authorized Advisor Access to CRM APIs...');
    const advisorLeads = await makeRequest('GET', '/api/leads', { Cookie: advisorCookie });
    assert(advisorLeads.statusCode === 200, 'Advisor GET /api/leads returns 200 OK');
    assert(Array.isArray(advisorLeads.body.data) && advisorLeads.body.data.length >= 3,
      'Advisor can retrieve CRM leads from database');

    // Map lead
    const firstLead = advisorLeads.body.data[0];
    const mapRes = await makeRequest('POST', '/api/leads/map', { Cookie: advisorCookie }, {
      id: firstLead.id,
      status: 'Fully Mapped'
    });
    assert(mapRes.statusCode === 200, 'Advisor POST /api/leads/map succeeds with 200 OK');

    // ── 9. Advisor Logout & Session Invalidation ──
    console.log('\n▶ [9/12] Verifying Advisor Logout & Session Invalidation...');
    const logoutRes = await makeRequest('POST', '/api/advisor/logout', { Cookie: advisorCookie });
    assert(logoutRes.statusCode === 200, 'Advisor logout returns 200 OK');

    const meAfterLogout = await makeRequest('GET', '/api/advisor/me', { Cookie: advisorCookie });
    assert(meAfterLogout.body.authenticated === false, 'Invalidated session returns authenticated: false');

    const dashAfterLogout = await makeRequest('GET', '/dashboard/', { Cookie: advisorCookie, Accept: 'application/json' });
    assert(dashAfterLogout.statusCode === 401, 'Logged out advisor access to /dashboard/ returns 401 Unauthorized');

    const leadsAfterLogout = await makeRequest('GET', '/api/leads', { Cookie: advisorCookie });
    assert(leadsAfterLogout.statusCode === 401, 'Logged out advisor access to /api/leads returns 401 Unauthorized');

    // ── 10. Academy Progression Regression Test ──
    console.log('\n▶ [10/12] Running Academy Regression (Quiz Submission & L02 Unlock)...');
    const passQuiz = await makeRequest('POST', '/api/academy/quiz/submit', { Cookie: candCookie }, {
      lessonId: 'M01_L01',
      answers: [1, 2, 0, 1, 2] // 5/5
    });
    assert(passQuiz.statusCode === 200, 'Candidate quiz submission returns 200');
    assert(passQuiz.body.passed === true, 'Quiz passed is true');
    assert(passQuiz.body.unlockedLessons.includes('M01_L02'), 'M01_L02 is unlocked for candidate');

    const l02Content = await makeRequest('GET', '/api/academy/lessons/M01_L02', { Cookie: candCookie });
    assert(l02Content.statusCode === 200, 'Unlocked lesson content accessible with 200 OK');

    // ── 11. Health Check Includes Advisor Security Flag ──
    console.log('\n▶ [11/12] Verifying Platform Health Check...');
    const health = await makeRequest('GET', '/api/health');
    assert(health.statusCode === 200, 'GET /api/health returns 200');
    assert(health.body.advisorSecurity === 'ACTIVE (Separate Advisor Session & Gating)',
      'Health endpoint advertises active advisor security');

    // ── 12. Security Separation Summary ──
    console.log('\n▶ [12/12] Summary of Identity & Session Separation...');
    console.log('    • Candidate Cookie: tpf_candidate_session (Academy Only)');
    console.log('    • Advisor Cookie:   tpf_advisor_session   (Wealth Terminal Only)');
    console.log('    • Candidate -> Dashboard: 403 FORBIDDEN');
    console.log('    • Unauth    -> Dashboard: 302/401 DENIED');
    console.log('    • Advisor   -> Dashboard: 200 ALLOWED');

    console.log('\n═════════════════════════════════════════════════════════════');
    console.log(` ALL ${totalTests} SECURITY & REMEDIATION TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('═════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ REMEDIATION TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
  }
}

runRemediationTests();
