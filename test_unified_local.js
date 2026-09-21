// ── test_unified_local.js ──────────────────────────────────────────────────
// TrustPoint Unified Architecture Verification Suite
// Tests: Marketing Website, Academy, Dashboard, APIs, Static MIME Types,
// Integrations, Canonical URLs, SEO, Security, Viewports & Regression

const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

// Set test database path so tests run against clean test DB
const TEST_DB_PATH = path.join(__dirname, 'test_unified.db');
if (fs.existsSync(TEST_DB_PATH)) {
  fs.unlinkSync(TEST_DB_PATH);
}
process.env.DATABASE_PATH = TEST_DB_PATH;
process.env.PORT = '3100';
process.env.NODE_ENV = 'staging';

const { server, db } = require('./server.js');

const TEST_PORT = 3100;
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
  console.log(' TRUSTPOINT UNIFIED PLATFORM — LOCAL VERIFICATION SUITE       ');
  console.log('═════════════════════════════════════════════════════════════\n');

  await new Promise(resolve => server.listen(TEST_PORT, resolve));
  console.log(`[TEST SERVER] Active on http://localhost:${TEST_PORT}\n`);

  try {
    // ── GROUP 1: Public Marketing Website Routes ──
    console.log('▶ [1/6] Verifying Public Marketing Website Routes...');
    const homeRes = await makeRequest('GET', '/');
    assert(homeRes.statusCode === 200, 'GET / returns 200 OK');
    assert(homeRes.headers['content-type'].includes('text/html'), 'GET / Content-Type is text/html');
    assert(homeRes.rawBody.includes('TrustPoint'), 'GET / contains brand name TrustPoint');
    assert(homeRes.rawBody.includes('Start Your Investment Journey'), 'GET / contains marketing headline');

    const insightsRes = await makeRequest('GET', '/insights.html');
    assert(insightsRes.statusCode === 200, 'GET /insights.html returns 200 OK');
    assert(insightsRes.headers['content-type'].includes('text/html'), 'GET /insights.html is text/html');
    assert(insightsRes.rawBody.includes('insights-grid'), 'GET /insights.html contains insights grid');

    const privacyRes = await makeRequest('GET', '/privacy.html');
    assert(privacyRes.statusCode === 200, 'GET /privacy.html returns 200 OK');
    assert(privacyRes.rawBody.includes('Privacy Policy'), 'GET /privacy.html contains Privacy Policy');

    const sitemapRes = await makeRequest('GET', '/sitemap.xml');
    assert(sitemapRes.statusCode === 200, 'GET /sitemap.xml returns 200 OK');
    assert(sitemapRes.headers['content-type'].includes('xml'), 'GET /sitemap.xml is application/xml');
    assert(sitemapRes.rawBody.includes('https://trustpointfin.org/'), 'GET /sitemap.xml contains production domain URLs');

    const robotsRes = await makeRequest('GET', '/robots.txt');
    assert(robotsRes.statusCode === 200, 'GET /robots.txt returns 200 OK');
    assert(robotsRes.headers['content-type'].includes('text/plain'), 'GET /robots.txt is text/plain');
    assert(robotsRes.rawBody.includes('Sitemap: https://trustpointfin.org/sitemap.xml'), 'GET /robots.txt references sitemap');

    // ── GROUP 2: Sample Article Pages & SEO Meta ──
    console.log('\n▶ [2/6] Verifying 5 Sample Financial Articles & SEO Metadata...');
    const sampleArticles = [
      'gold-etfs-analysis-how-indian-investors-can-avoid-massive-dr.html',
      'hdfc-bank-analysis-from-long-term-wealth-creation-to-fibonac.html',
      'nifty-50-analysis-for-working-professionals-leveraging-volum.html',
      'the-can-slim-method-explained-for-long-term-wealth-creation-.html',
      'understanding-option-greeks-a-retail-traders-guide-to-winnin.html'
    ];

    for (const article of sampleArticles) {
      const artRes = await makeRequest('GET', `/${article}`);
      assert(artRes.statusCode === 200, `GET /${article} returns 200 OK`);
      assert(artRes.headers['content-type'].includes('text/html'), `/${article} has text/html content-type`);
      assert(artRes.rawBody.includes('<title>'), `/${article} contains title tag`);
      assert(artRes.rawBody.includes('meta name="description"'), `/${article} contains meta description`);
      assert(artRes.rawBody.includes('application/ld+json'), `/${article} contains Schema.org JSON-LD`);
      assert(artRes.rawBody.includes('a.aonelink.in/ANGOne'), `/${article} contains Angel One partner CTA`);
    }

    // ── GROUP 3: Static Assets & Styles ──
    console.log('\n▶ [3/6] Verifying Marketing Static Assets & MIME Types...');
    const cssRes = await makeRequest('GET', '/styles.css');
    assert(cssRes.statusCode === 200, 'GET /styles.css returns 200 OK');
    assert(cssRes.headers['content-type'].includes('text/css'), 'GET /styles.css is text/css');
    assert(cssRes.byteLength > 1000, 'GET /styles.css has non-trivial size');

    const jsRes = await makeRequest('GET', '/main.js');
    assert(jsRes.statusCode === 200, 'GET /main.js returns 200 OK');
    assert(jsRes.headers['content-type'].includes('javascript'), 'GET /main.js is application/javascript');

    const logoRes = await makeRequest('GET', '/logo.jpg');
    assert(logoRes.statusCode === 200, 'GET /logo.jpg returns 200 OK');
    assert(logoRes.headers['content-type'].includes('image/jpeg'), 'GET /logo.jpg is image/jpeg');

    // ── GROUP 4: Marketing Website Integrations (Local Audit) ──
    console.log('\n▶ [4/6] Verifying External Integrations in Marketing Homepage...');
    assert(homeRes.rawBody.includes('api.web3forms.com') || jsRes.rawBody.includes('api.web3forms.com'), 'Web3Forms contact endpoint configured');
    assert(homeRes.rawBody.includes('tradingview.com') || homeRes.rawBody.includes('TradingView'), 'TradingView widget embedded in homepage');
    assert(homeRes.rawBody.includes('wa.me'), 'WhatsApp chat CTA present');
    assert(homeRes.rawBody.includes('t.me'), 'Telegram community CTA present');
    assert(homeRes.rawBody.includes('angelone.in') || homeRes.rawBody.includes('Angel One') || homeRes.rawBody.includes('ROHA4322'), 'Angel One partner CTA present');

    // ── GROUP 5: Dashboard Terminal Routing ──
    console.log('\n▶ [5/6] Verifying Relocated Wealth Terminal (/dashboard/)...');
    const dashRedirect = await makeRequest('GET', '/dashboard');
    assert(dashRedirect.statusCode === 302, 'GET /dashboard redirects (302) to /dashboard/');
    assert(dashRedirect.headers['location'] === '/dashboard/', 'Redirect target is /dashboard/');

    const dashRes = await makeRequest('GET', '/dashboard/');
    assert(dashRes.statusCode === 200, 'GET /dashboard/ returns 200 OK');
    assert(dashRes.headers['content-type'].includes('text/html'), 'GET /dashboard/ is text/html');
    assert(dashRes.rawBody.includes('Universal Wealth & Order Flow Terminal'), 'GET /dashboard/ contains Cockpit Terminal title');

    const dashCss = await makeRequest('GET', '/dashboard/index.css');
    assert(dashCss.statusCode === 200, 'GET /dashboard/index.css returns 200 OK');
    assert(dashCss.headers['content-type'].includes('text/css'), 'GET /dashboard/index.css is text/css');

    const dashJs = await makeRequest('GET', '/dashboard/index.js');
    assert(dashJs.statusCode === 200, 'GET /dashboard/index.js returns 200 OK');
    assert(dashJs.headers['content-type'].includes('javascript'), 'GET /dashboard/index.js is application/javascript');

    // ── GROUP 6: Academy & Backend API Integration ──
    console.log('\n▶ [6/6] Verifying Academy & Backend API Endpoints...');
    const acadRedirect = await makeRequest('GET', '/academy');
    assert(acadRedirect.statusCode === 302, 'GET /academy redirects (302) to /academy/');
    assert(acadRedirect.headers['location'] === '/academy/', 'Redirect target is /academy/');

    const acadHome = await makeRequest('GET', '/academy/');
    assert(acadHome.statusCode === 200, 'GET /academy/ returns 200 OK');
    assert(acadHome.headers['content-type'].includes('text/html'), 'GET /academy/ is text/html');
    assert(acadHome.rawBody.includes('TrustPoint Finance Academy'), 'GET /academy/ contains Academy title');

    const acadSvg = await makeRequest('GET', '/academy/assets/visuals/business_value_engine.svg');
    assert(acadSvg.statusCode === 200, 'GET /academy/assets/visuals/business_value_engine.svg returns 200 OK');
    assert(acadSvg.headers['content-type'].includes('svg'), 'SVG MIME type is image/svg+xml');

    const acadPdf = await makeRequest('GET', '/academy/downloads/M01_L01_Lesson_Notes.pdf');
    assert(acadPdf.statusCode === 200, 'GET /academy/downloads/M01_L01_Lesson_Notes.pdf returns 200 OK');
    assert(acadPdf.headers['content-type'].includes('pdf'), 'PDF MIME type is application/pdf');

    const healthRes = await makeRequest('GET', '/api/health');
    assert(healthRes.statusCode === 200, 'GET /api/health returns 200 OK');
    assert(healthRes.body.status === 'online', 'GET /api/health status is online');

    const authMeRes = await makeRequest('GET', '/api/auth/me');
    assert(authMeRes.statusCode === 200, 'GET /api/auth/me returns 200 OK');
    assert(authMeRes.body.authenticated === false, 'GET /api/auth/me returns authenticated: false without cookie');

    const unauthProg = await makeRequest('GET', '/api/academy/progress');
    assert(unauthProg.statusCode === 401, 'GET /api/academy/progress returns 401 without cookie');

    const blockedQuiz = await makeRequest('GET', '/academy/data/lesson01_quiz.json');
    assert(blockedQuiz.statusCode === 403, 'GET /academy/data/lesson01_quiz.json blocked with 403');

    console.log('\n═════════════════════════════════════════════════════════════');
    console.log(` ALL ${totalTests} UNIFIED ROUTE & REGRESSION TESTS PASSED! (${passedTests}/${totalTests})`);
    console.log('═════════════════════════════════════════════════════════════\n');
  } catch (err) {
    console.error('\n❌ TEST SUITE FAILED:', err);
    process.exitCode = 1;
  } finally {
    server.close();
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch (_) {}
    }
  }
}

runTests();
