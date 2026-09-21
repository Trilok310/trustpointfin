// ── test_staging_local.js ──────────────────────────────────────────────────
// TrustPoint Finance Academy Full-Stack Verification Suite
// Tests: Auth, Sessions, Quiz Grading, Gating, Isolation, Persistence, Security

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

// Set test database path so tests run against clean test DB
const TEST_DB_PATH = path.join(__dirname, 'test_staging.db');
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}
process.env.DATABASE_PATH = TEST_DB_PATH;
process.env.PORT = '3099';
process.env.NODE_ENV = 'staging';

const { server, db, AUTHORITATIVE_ACADEMY } = require('./server.js');

const TEST_PORT = 3099;
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

function extractCookie(resHeaders) {
  const setCookie = resHeaders['set-cookie'];
  if (!setCookie) return null;
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const match = cookieStr.match(/(tpf_candidate_session=[^;]+)/);
  return match ? match[1] : null;
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

async function runTests() {
  console.log('═════════════════════════════════════════════════════════════');
  console.log(' TRUSTPOINT FINANCE ACADEMY — STAGING AUTOMATED TEST SUITE   ');
  console.log('═════════════════════════════════════════════════════════════\n');

  // Start test server
  await new Promise(resolve => server.listen(TEST_PORT, resolve));
  console.log(`[TEST SERVER] Active on http://localhost:${TEST_PORT}\n`);

  try {
    // ── TEST GROUP 1: Health & Public CRM ──
    console.log('▶ [1/9] Verifying Health & Existing CRM Endpoints...');
    const healthRes = await makeRequest('GET', '/api/health');
    assert(healthRes.statusCode === 200, 'Health check returns 200');
    assert(healthRes.body.status === 'online', 'Health status is online');

    const leadsRes = await makeRequest('GET', '/api/leads');
    assert(leadsRes.statusCode === 401, 'Unauthenticated /api/leads is blocked with 401');

    // ── TEST GROUP 2: Unauthenticated Security & Route Protection ──
    console.log('\n▶ [2/9] Verifying Unauthenticated Access Denials (401)...');
    const progUnauth = await makeRequest('GET', '/api/academy/progress');
    assert(progUnauth.statusCode === 401, 'GET /api/academy/progress without session returns 401');

    const quizUnauth = await makeRequest('POST', '/api/academy/quiz/submit', {}, { lessonId: 'M01_L01', answers: [1,2,0,1,2] });
    assert(quizUnauth.statusCode === 401, 'POST /api/academy/quiz/submit without session returns 401');

    const lessonUnauth = await makeRequest('GET', '/api/academy/lessons/M01_L01');
    assert(lessonUnauth.statusCode === 401, 'GET /api/academy/lessons/M01_L01 without session returns 401');

    // ── TEST GROUP 3: Candidate OTP Authentication Flow ──
    console.log('\n▶ [3/9] Testing Candidate OTP Request & Verification...');
    // Invalid mobile
    const badMobRes = await makeRequest('POST', '/api/auth/request-otp', {}, { mobile: '123' });
    assert(badMobRes.statusCode === 400, 'Invalid mobile number rejected with 400');

    // Valid mobile for Candidate A
    const candAMobile = '9876543210';
    const otpResA = await makeRequest('POST', '/api/auth/request-otp', {}, { mobile: candAMobile });
    assert(otpResA.statusCode === 200, 'OTP request for 9876543210 succeeds');
    assert(otpResA.body.stagingOtp && otpResA.body.stagingOtp.length === 6, 'Staging OTP is returned in response');
    const candAOtp = otpResA.body.stagingOtp;

    // Invalid OTP attempt
    const wrongOtpRes = await makeRequest('POST', '/api/auth/verify-otp', {}, { mobile: candAMobile, otp: '000000' });
    assert(wrongOtpRes.statusCode === 400, 'Incorrect OTP rejected with 400');
    assert(wrongOtpRes.body.error.includes('2 attempt(s) remaining'), 'Attempts tracked accurately');

    // Valid OTP verification
    const verifyResA = await makeRequest('POST', '/api/auth/verify-otp', {}, { mobile: candAMobile, otp: candAOtp });
    assert(verifyResA.statusCode === 200, 'Correct OTP verified with 200');
    assert(verifyResA.body.candidate && verifyResA.body.candidate.mobile === candAMobile, 'Candidate A record created/returned');

    const cookieA = extractCookie(verifyResA.headers);
    assert(cookieA && cookieA.startsWith('tpf_candidate_session='), 'HttpOnly session cookie received');

    // Auth verification endpoint
    const meResA = await makeRequest('GET', '/api/auth/me', { Cookie: cookieA });
    assert(meResA.statusCode === 200 && meResA.body.authenticated === true, '/api/auth/me returns authenticated: true');
    assert(meResA.body.candidate.mobile === candAMobile, 'Auth identity correctly identifies Candidate A');

    // ── TEST GROUP 4: Initial Authoritative State for Candidate A ──
    console.log('\n▶ [4/9] Testing Initial Academy State & Lesson Lock Enforcement...');
    const progResA = await makeRequest('GET', '/api/academy/progress', { Cookie: cookieA });
    assert(progResA.statusCode === 200, 'Progress endpoint returns 200 for Candidate A');
    assert(JSON.stringify(progResA.body.unlockedLessons) === JSON.stringify(['M01_L01']), 'Only M01_L01 is initially unlocked');
    assert(progResA.body.completedLessons.length === 0, 'Zero lessons initially completed');

    // M01_L01 should be accessible
    const l1ResA = await makeRequest('GET', '/api/academy/lessons/M01_L01', { Cookie: cookieA });
    assert(l1ResA.statusCode === 200, 'M01_L01 content is accessible');

    // M01_L02 should be strictly 403 locked
    const l2LockedResA = await makeRequest('GET', '/api/academy/lessons/M01_L02', { Cookie: cookieA });
    assert(l2LockedResA.statusCode === 403, 'M01_L02 is locked with 403 Forbidden');

    // ── TEST GROUP 5: Quiz Evaluation — Failing Attempt (<70%) ──
    console.log('\n▶ [5/9] Testing Quiz Evaluation — Failing Attempt (<70%)...');
    // Correct answers for L01: [1, 2, 0, 1, 2]
    // Submitting wrong answers: [0, 0, 0, 0, 0] -> score 1/5 (20%)
    const failQuizRes = await makeRequest('POST', '/api/academy/quiz/submit', { Cookie: cookieA }, {
      lessonId: 'M01_L01',
      answers: [0, 0, 0, 0, 0]
    });
    assert(failQuizRes.statusCode === 200, 'Quiz submission evaluated by server');
    assert(failQuizRes.body.passed === false, 'Quiz result passed === false');
    assert(failQuizRes.body.score === 1, 'Score calculated correctly (1/5)');
    assert(failQuizRes.body.percentage === 20, 'Percentage calculated correctly (20%)');
    assert(!failQuizRes.body.unlockedLessons.includes('M01_L02'), 'M01_L02 remains LOCKED after failing');

    // Verify L02 is STILL 403
    const l2StillLocked = await makeRequest('GET', '/api/academy/lessons/M01_L02', { Cookie: cookieA });
    assert(l2StillLocked.statusCode === 403, 'M01_L02 is still locked with 403');

    // ── TEST GROUP 6: Quiz Evaluation — Passing Attempt (>=70%) & Unlock ──
    console.log('\n▶ [6/9] Testing Quiz Evaluation — Passing Attempt (>=70%) & Unlock...');
    // Submitting 4/5 correct answers: [1, 2, 0, 1, 0] -> score 4/5 (80% >= 70%)
    const passQuizRes = await makeRequest('POST', '/api/academy/quiz/submit', { Cookie: cookieA }, {
      lessonId: 'M01_L01',
      answers: [1, 2, 0, 1, 0]
    });
    assert(passQuizRes.statusCode === 200, 'Passing quiz submission processed');
    assert(passQuizRes.body.passed === true, 'Quiz result passed === true (80% >= 70%)');
    assert(passQuizRes.body.score === 4, 'Score is 4/5');
    assert(passQuizRes.body.completedLessons.includes('M01_L01'), 'M01_L01 is recorded in completedLessons');
    assert(passQuizRes.body.unlockedLessons.includes('M01_L02'), 'M01_L02 is NOW UNLOCKED');

    // Verify M01_L02 is NOW accessible with 200!
    const l2UnlockedRes = await makeRequest('GET', '/api/academy/lessons/M01_L02', { Cookie: cookieA });
    assert(l2UnlockedRes.statusCode === 200, 'M01_L02 is now ACCESSIBLE (200 OK)');
    assert(l2UnlockedRes.body.success === true, 'M01_L02 returns success: true');

    // Verify M01_L03 is still locked (strict sequential gating)
    const l3LockedRes = await makeRequest('GET', '/api/academy/lessons/M01_L03', { Cookie: cookieA });
    assert(l3LockedRes.statusCode === 403, 'M01_L03 remains locked (403)');

    // ── TEST GROUP 7: Multi-Session Persistence & Relogin ──
    console.log('\n▶ [7/9] Testing Multi-Session Progression Persistence & Relogin...');
    // Logout Candidate A
    const logoutRes = await makeRequest('POST', '/api/auth/logout', { Cookie: cookieA });
    assert(logoutRes.statusCode === 200, 'Candidate A successfully logged out');

    // Progress request with old session should fail or be unauthenticated
    const postLogoutProg = await makeRequest('GET', '/api/academy/progress', { Cookie: cookieA });
    assert(postLogoutProg.statusCode === 401, 'Logged out session rejected with 401');

    // Re-request OTP and login Candidate A again
    const reloginOtpReq = await makeRequest('POST', '/api/auth/request-otp', {}, { mobile: candAMobile });
    const reloginVerify = await makeRequest('POST', '/api/auth/verify-otp', {}, {
      mobile: candAMobile,
      otp: reloginOtpReq.body.stagingOtp
    });
    const newCookieA = extractCookie(reloginVerify.headers);
    assert(newCookieA !== null, 'Candidate A successfully re-authenticated with new session');

    // Verify persisted state from SQLite
    const persistProgRes = await makeRequest('GET', '/api/academy/progress', { Cookie: newCookieA });
    assert(persistProgRes.body.completedLessons.includes('M01_L01'), 'Completed M01_L01 persisted in database');
    assert(persistProgRes.body.unlockedLessons.includes('M01_L02'), 'Unlocked M01_L02 persisted in database');

    // ── TEST GROUP 8: Candidate Isolation & Anti-Tampering ──
    console.log('\n▶ [8/9] Testing Candidate Isolation (Candidate A vs Candidate B)...');
    // Register/login Candidate B
    const candBMobile = '9123456780';
    const otpResB = await makeRequest('POST', '/api/auth/request-otp', {}, { mobile: candBMobile });
    const verifyResB = await makeRequest('POST', '/api/auth/verify-otp', {}, {
      mobile: candBMobile,
      otp: otpResB.body.stagingOtp
    });
    const cookieB = extractCookie(verifyResB.headers);

    // Candidate B should have brand new fresh state (M01_L02 locked)
    const progResB = await makeRequest('GET', '/api/academy/progress', { Cookie: cookieB });
    assert(progResB.body.completedLessons.length === 0, 'Candidate B has 0 completed lessons');
    assert(!progResB.body.unlockedLessons.includes('M01_L02'), 'Candidate B does NOT have M01_L02 unlocked');

    // Candidate B cannot access M01_L02
    const l2CandB = await makeRequest('GET', '/api/academy/lessons/M01_L02', { Cookie: cookieB });
    assert(l2CandB.statusCode === 403, 'Candidate B receives 403 for M01_L02');

    // Candidate B attempts to send Candidate A ID in body/query to bypass gating
    const spoofRes = await makeRequest('POST', '/api/academy/quiz/submit', { Cookie: cookieB }, {
      studentId: meResA.body.candidate.id,
      candidateId: meResA.body.candidate.id,
      lessonId: 'M01_L01',
      answers: [0, 0, 0, 0, 0]
    });
    assert(spoofRes.body.candidateId === verifyResB.body.candidate.id, 'Server enforces session candidateId, ignoring client spoofing');

    // ── TEST GROUP 9: Direct File Protection & Answer Key Secrecy ──
    console.log('\n▶ [9/9] Testing Direct Static File Blocking & Answer Key Secrecy...');
    // Direct access to _quiz.json must return 403
    const directQuiz = await makeRequest('GET', '/academy/data/lesson01_quiz.json');
    assert(directQuiz.statusCode === 403, 'Direct access to /academy/data/lesson01_quiz.json blocked with 403');

    // Static access to locked lesson02.json without unlock
    const staticL2Locked = await makeRequest('GET', '/academy/data/lesson02.json', { Cookie: cookieB });
    assert(staticL2Locked.statusCode === 403, 'Static access to locked lesson02.json returns 403 for Candidate B');

    // Verify no answer keys in static lesson01.json
    const staticL1 = await makeRequest('GET', '/academy/data/lesson01.json');
    assert(!staticL1.rawBody.includes('correctAnswerIndex'), 'lesson01.json does NOT contain correctAnswerIndex');
    assert(!staticL1.rawBody.includes('correctAnswers'), 'lesson01.json does NOT contain correctAnswers');

    // Verify index.html does NOT expose correctAnswerIndex
    const indexHtml = await makeRequest('GET', '/academy/index.html');
    assert(!indexHtml.rawBody.includes('correctAnswerIndex'), 'index.html does NOT contain correctAnswerIndex');

    console.log('\n═════════════════════════════════════════════════════════════');
    console.log(` ALL ${totalTests} TESTS PASSED PERFECTLY! (${passedTests}/${totalTests})`);
    console.log('═════════════════════════════════════════════════════════════\n');

  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch (_) {}
    }
  }
}

runTests();
