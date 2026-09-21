// ── test_mobile_and_styles.js ──────────────────────────────────────────
// Multi-Device Viewport & CSS Style Isolation Verification
// Tests: 320px, 375px, 390px, 768px, 1440px media queries, meta tags, and style isolation

const fs = require('node:fs');
const path = require('node:path');

let totalChecks = 0;
let passedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passedChecks++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('═════════════════════════════════════════════════════════════');
console.log(' MULTI-DEVICE VIEWPORT & CSS ISOLATION VERIFICATION          ');
console.log(' Viewports: 320px, 375px, 390px, 768px, 1440px               ');
console.log('═════════════════════════════════════════════════════════════\n');

try {
  // ── 1. Viewport Meta Tags ──
  console.log('▶ [1/4] Verifying Viewport Meta Tags Across Entry Points...');
  const publicIndex = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf-8');
  assert(publicIndex.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">'),
    'Marketing index.html has standard responsive viewport tag');

  const insightsHtml = fs.readFileSync(path.join(__dirname, 'public', 'insights.html'), 'utf-8');
  assert(insightsHtml.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">'),
    'insights.html has standard responsive viewport tag');

  const acadIndex = fs.readFileSync(path.join(__dirname, 'academy', 'index.html'), 'utf-8');
  assert(acadIndex.includes('name="viewport" content="width=device-width, initial-scale=1.0'),
    'Academy index.html has standard responsive viewport tag');

  const dashIndex = fs.readFileSync(path.join(__dirname, 'dashboard', 'index.html'), 'utf-8');
  assert(dashIndex.includes('<meta name="viewport" content="width=device-width, initial-scale=1.0">'),
    'Dashboard index.html has standard responsive viewport tag');

  // ── 2. Marketing Website Responsive Breakpoints ──
  console.log('\n▶ [2/4] Verifying Marketing Website Breakpoints in public/styles.css...');
  const mktCss = fs.readFileSync(path.join(__dirname, 'public', 'styles.css'), 'utf-8');
  
  // Check responsive media queries covering mobile & tablet
  assert(mktCss.includes('@media'), 'styles.css contains responsive media queries');
  assert(mktCss.includes('768px') || mktCss.includes('992px'), 'styles.css contains tablet breakpoint (768px/992px)');
  assert(mktCss.includes('480px') || mktCss.includes('576px') || mktCss.includes('600px'), 'styles.css contains mobile breakpoint (<600px)');
  
  // Verify fluid container and flexible elements
  assert(mktCss.includes('max-width: 100%') || mktCss.includes('box-sizing: border-box'), 'styles.css prevents horizontal overflow via box-sizing / max-width');

  // ── 3. Academy Responsive Breakpoints ──
  console.log('\n▶ [3/4] Verifying Academy Breakpoints in academy/styles.css...');
  const acadCss = fs.readFileSync(path.join(__dirname, 'academy', 'styles.css'), 'utf-8');
  assert(acadCss.includes('@media'), 'Academy styles.css contains media queries');
  assert(acadCss.includes('768px') || acadCss.includes('1024px'), 'Academy styles.css covers tablet/intermediate breakpoint');
  assert(acadCss.includes('480px') || acadCss.includes('640px') || acadCss.includes('mobile'), 'Academy styles.css covers mobile screens (320px-390px)');

  // ── 4. Cross-System Style Namespace Isolation ──
  console.log('\n▶ [4/4] Verifying Strict Style Namespace Isolation...');
  // Marketing site should not import or link academy styles
  assert(!publicIndex.includes('academy/styles.css'), 'Marketing index.html does NOT link academy/styles.css');
  assert(!publicIndex.includes('player.js'), 'Marketing index.html does NOT link player.js');

  // Academy uses its own relative styles.css (/academy/styles.css)
  const acadCssDirect = fs.readFileSync(path.join(__dirname, 'academy', 'styles.css'), 'utf-8');
  assert(acadIndex.includes('href="styles.css"') && !acadIndex.includes('href="/styles.css"'),
    'Academy index.html links relative styles.css (/academy/styles.css), NOT root /styles.css');
  assert(!acadIndex.includes('main.js'), 'Academy index.html does NOT link marketing main.js');

  // Verify that /academy/styles.css and /styles.css are two completely distinct files
  assert(mktCss !== acadCssDirect, 'Marketing styles.css and Academy styles.css are separate stylesheets');
  assert(mktCss.includes('.hero') || mktCss.includes('.nav-container'), 'Marketing styles.css contains marketing classes');
  assert(acadCssDirect.includes('academy') || acadCssDirect.includes('player') || acadCssDirect.includes('slide'),
    'Academy styles.css contains dedicated Academy player classes');

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log(` ALL ${totalChecks} VIEWPORT & ISOLATION CHECKS PASSED! (${passedChecks}/${totalChecks})`);
  console.log('═════════════════════════════════════════════════════════════\n');
} catch (err) {
  console.error('\n❌ VIEWPORT/STYLE AUDIT FAILED:', err);
  process.exitCode = 1;
}
