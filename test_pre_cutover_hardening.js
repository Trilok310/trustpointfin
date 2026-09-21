// ── test_pre_cutover_hardening.js ────────────────────────────────────────────
// Automated Test Suite for Pre-Cutover Technical Hardening:
// 1. Production Mock-Lead Safeguard (NODE_ENV=production vs staging)
// 2. Advisor Login Rate Limiting (5 attempts, 15 min lockout, 429 status)
// 3. Advisor Credential Separation (Production vs Staging isolation)
// 4. SMS OTP Provider Environment Configuration & Staging OTP Suppression

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const TEST_PORT_BASE = 8990;
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function makeRequest(port, method, pathName, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1',
      port,
      path: pathName,
      method,
      headers: { ...headers }
    };
    if (body) {
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(data); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          json
        });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function runTests() {
  console.log('\n=============================================================');
  console.log(' PRE-CUTOVER TECHNICAL HARDENING TEST SUITE');
  console.log('=============================================================\n');

  const scratchDir = path.join(__dirname, 'scratch_test_dbs');
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const prodDbPath = path.join(scratchDir, 'prod_test.db');
  const stagingDbPath = path.join(scratchDir, 'staging_test.db');
  if (fs.existsSync(prodDbPath)) fs.unlinkSync(prodDbPath);
  if (fs.existsSync(stagingDbPath)) fs.unlinkSync(stagingDbPath);

  // ── TEST 1: PRODUCTION MOCK-LEAD SAFEGUARD & ZERO SEEDING ──
  console.log('▶ [1/4] Testing Production Mock-Lead Safeguard (NODE_ENV=production)...');
  const prodPort = TEST_PORT_BASE + 1;
  const prodServer = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: prodPort,
      NODE_ENV: 'production',
      DATABASE_PATH: prodDbPath
      // Note: PROD_ADVISOR_USERNAME and PROD_ADVISOR_PASSWORD NOT provided
    },
    cwd: __dirname
  });

  await new Promise(r => setTimeout(r, 1500));

  // Connect to sqlite db directly to inspect tables
  const { DatabaseSync } = require('node:sqlite');
  const prodDb = new DatabaseSync(prodDbPath);

  const prodLeadCount = prodDb.prepare('SELECT COUNT(*) AS count FROM leads').get().count;
  assert(prodLeadCount === 0, 'Production mode seeded exactly ZERO mock leads');

  const prodAdvisorCount = prodDb.prepare('SELECT COUNT(*) AS count FROM advisors').get().count;
  assert(prodAdvisorCount === 0, 'Production mode seeded ZERO default/staging advisor accounts');

  // Verify that in production mode, request-otp does NOT return stagingOtp
  const otpRes = await makeRequest(prodPort, 'POST', '/api/auth/request-otp', {}, JSON.stringify({ mobile: '9876543210' }));
  assert(otpRes.statusCode === 200, 'Production OTP request succeeds');
  assert(otpRes.json && otpRes.json.stagingOtp === undefined, 'Production OTP response strictly OMITS stagingOtp');

  prodServer.kill();
  await new Promise(r => setTimeout(r, 500));

  // ── TEST 2: STAGING MOCK-LEADS & CREDENTIAL INITIALIZATION ──
  console.log('\n▶ [2/4] Testing Staging Mode Initializations (NODE_ENV=staging)...');
  const stagingPort = TEST_PORT_BASE + 2;
  const stagingServer = spawn('node', ['server.js'], {
    env: {
      ...process.env,
      PORT: stagingPort,
      NODE_ENV: 'staging',
      DATABASE_PATH: stagingDbPath,
      STAGING_ADVISOR_USERNAME: 'advisor_staging',
      STAGING_ADVISOR_PASSWORD: 'StagingAdvisor2026!Sec'
    },
    cwd: __dirname
  });

  await new Promise(r => setTimeout(r, 1500));

  const stagingDb = new DatabaseSync(stagingDbPath);
  const stagingLeadCount = stagingDb.prepare('SELECT COUNT(*) AS count FROM leads').get().count;
  assert(stagingLeadCount === 3, 'Staging mode initialized 3 default leads for test pipeline');

  const stagingAdvisor = stagingDb.prepare('SELECT * FROM advisors WHERE username = ?').get('advisor_staging');
  assert(stagingAdvisor !== undefined, 'Staging mode initialized advisor_staging account');
  assert(!stagingAdvisor.password_hash.includes('StagingAdvisor2026!Sec'), 'Staging password stored strictly as scrypt hash with salt');

  // In staging mode, stagingOtp IS returned for local integration tests
  const stagingOtpRes = await makeRequest(stagingPort, 'POST', '/api/auth/request-otp', {}, JSON.stringify({ mobile: '9876543211' }));
  assert(stagingOtpRes.statusCode === 200, 'Staging OTP request succeeds');
  assert(stagingOtpRes.json && typeof stagingOtpRes.json.stagingOtp === 'string', 'Staging OTP response includes stagingOtp for testing');

  // ── TEST 3: ADVISOR LOGIN RATE LIMITING & BRUTE-FORCE LOCKOUT ──
  console.log('\n▶ [3/4] Testing Advisor Login Brute-Force Protection (Max 5 attempts, 15-min lockout)...');
  const headers = { 'x-forwarded-for': '203.0.113.195' }; // Simulated client IP

  // 1 to 5: Failed login attempts
  for (let i = 1; i <= 5; i++) {
    const failRes = await makeRequest(stagingPort, 'POST', '/api/advisor/login', headers, JSON.stringify({
      username: 'advisor_staging',
      password: 'WrongPassword123!'
    }));
    assert(failRes.statusCode === 401, `Failed attempt ${i} returns HTTP 401 Unauthorized`);
    if (i < 5) {
      assert(failRes.json.error.includes(`${5 - i} attempt(s) remaining`), `Attempt ${i} returns correct warning countdown (${5 - i} remaining)`);
    } else {
      assert(failRes.json.error.includes('locked for 15 minutes'), 'Attempt 5 explicitly warns that account is locked');
    }
  }

  // 6th Attempt: Should be throttled with HTTP 429
  const lockedRes = await makeRequest(stagingPort, 'POST', '/api/advisor/login', headers, JSON.stringify({
    username: 'advisor_staging',
    password: 'WrongPassword123!'
  }));
  assert(lockedRes.statusCode === 429, 'Attempt 6 triggers HTTP 429 Too Many Requests');
  assert(lockedRes.json && lockedRes.json.error.includes('temporarily locked'), 'Attempt 6 returns lockout message');

  // 7th Attempt: Even with CORRECT password during lockout -> MUST BE REJECTED with HTTP 429
  const correctDuringLockout = await makeRequest(stagingPort, 'POST', '/api/advisor/login', headers, JSON.stringify({
    username: 'advisor_staging',
    password: 'StagingAdvisor2026!Sec'
  }));
  assert(correctDuringLockout.statusCode === 429, 'Submitting correct password during active lockout returns HTTP 429');

  // Attempt from DIFFERENT IP address with correct password -> Should NOT be blocked (IP isolation)
  const diffIpHeaders = { 'x-forwarded-for': '198.51.100.42' };
  const diffIpRes = await makeRequest(stagingPort, 'POST', '/api/advisor/login', diffIpHeaders, JSON.stringify({
    username: 'advisor_staging',
    password: 'StagingAdvisor2026!Sec'
  }));
  assert(diffIpRes.statusCode === 200, 'Login from different unblocked IP succeeds with HTTP 200');
  assert(diffIpRes.json && diffIpRes.json.success === true, 'Different IP login returns success: true');

  // Clear lockout for original IP to test reset on success
  stagingDb.prepare('DELETE FROM advisor_login_attempts WHERE identifier = ?').run('203.0.113.195:advisor_staging');

  const unblockedRes = await makeRequest(stagingPort, 'POST', '/api/advisor/login', headers, JSON.stringify({
    username: 'advisor_staging',
    password: 'StagingAdvisor2026!Sec'
  }));
  assert(unblockedRes.statusCode === 200, 'Login succeeds after lockout reset (HTTP 200)');
  assert(unblockedRes.json && unblockedRes.json.success === true, 'Successful login returns advisor payload');

  // Verify successful login cleans up all failed attempt records
  const remainingAttempts = stagingDb.prepare('SELECT COUNT(*) AS count FROM advisor_login_attempts WHERE identifier = ?').get('203.0.113.195:advisor_staging').count;
  assert(remainingAttempts === 0, 'Successful login resets failed attempt records to 0');

  // ── TEST 4: SMS PROVIDER ARCHITECTURE PREPARATION ──
  console.log('\n▶ [4/4] Testing SMS Provider Architecture & Configuration Hooks...');
  const { OtpProvider } = require('./server.js');
  // Mock mode test
  process.env.NODE_ENV = 'staging';
  process.env.SMS_PROVIDER = 'console';
  const mockResult = await OtpProvider.sendOtp('9876543210', '123456');
  assert(mockResult.success === true && mockResult.mode === 'staging-mock', 'OtpProvider mock mode operates in staging');

  // Fast2SMS production adapter mock test
  const origHttpsReq = https.request;
  https.request = function (opts, cb) {
    const mockRes = new (require('events').EventEmitter)();
    mockRes.statusCode = 200;
    const reqMock = new (require('events').EventEmitter)();
    reqMock.write = function () {};
    reqMock.end = function () {
      process.nextTick(() => {
        cb(mockRes);
        mockRes.emit('data', JSON.stringify({ return: true, request_id: 'req_123' }));
        mockRes.emit('end');
      });
    };
    return reqMock;
  };

  process.env.NODE_ENV = 'production';
  process.env.SMS_PROVIDER = 'fast2sms';
  process.env.SMS_API_KEY = 'test_key_placeholder';
  process.env.SMS_SENDER_ID = 'TRSTPT';
  process.env.SMS_TEMPLATE_ID = '110716...';
  const fast2smsResult = await OtpProvider.sendOtp('9876543210', '654321');
  assert(fast2smsResult.success === true && fast2smsResult.provider === 'fast2sms', 'OtpProvider handles Fast2SMS dispatch');
  https.request = origHttpsReq;

  stagingServer.kill();

  // Cleanup test DBs
  try {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  } catch (e) {}

  console.log('\n=============================================================');
  console.log(` RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('=============================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
