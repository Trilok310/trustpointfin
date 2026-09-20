const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts', 'post-article.js');
const MOCK_CALENDAR = path.join(ROOT, 'content_calendar.md');
const MOCK_INSIGHTS = path.join(ROOT, 'insights.html');
const MOCK_TEMPLATE = path.join(ROOT, 'sample-insight.html');
const MOCK_SITEMAP = path.join(ROOT, 'sitemap.xml');
const STAGING_DIR = path.join(ROOT, '.staging');

function resetEnv() {
    if (fs.existsSync(STAGING_DIR)) fs.rmSync(STAGING_DIR, { recursive: true, force: true });
    
    fs.writeFileSync(MOCK_CALENDAR, "- [ ] 1. Test Topic A\n- [ ] 2. Test Topic B\n", "utf-8");
    fs.writeFileSync(MOCK_INSIGHTS, "<div class=\"insights-grid\"></div>", "utf-8");
    fs.writeFileSync(MOCK_TEMPLATE, "<title></title><meta name=\"description\" content=\"\"><script type=\"application/ld+json\"></script><header class=\"article-header\"></header><article class=\"article-content\"></article>", "utf-8");
    fs.writeFileSync(MOCK_SITEMAP, "<urlset></urlset>", "utf-8");
    
    // cleanup generated files
    if (fs.existsSync(path.join(ROOT, "test-topic-a.html"))) fs.unlinkSync(path.join(ROOT, "test-topic-a.html"));
    if (fs.existsSync(path.join(ROOT, "test-topic-b.html"))) fs.unlinkSync(path.join(ROOT, "test-topic-b.html"));
    if (fs.existsSync(path.join(ROOT, ".pending_article.json"))) fs.unlinkSync(path.join(ROOT, ".pending_article.json"));
}

function runScript(envVars = {}) {
    try {
        return execSync(`node ${SCRIPT}`, { 
            env: { ...process.env, ...envVars, GITHUB_WORKSPACE: ROOT },
            encoding: 'utf-8',
            stdio: 'pipe'
        });
    } catch (error) {
        return error.stdout || error.stderr || error.message;
    }
}

console.log("🧪 Starting State Machine Tests...\n");

// Scenario D (Missing API Key / Auth failure)
resetEnv();
let out = runScript({ OPENAI_API_KEY: "", AI_TEXT_PROVIDER: "openai" });
assert(out.includes("OPENAI_API_KEY is not set"), "Should fail on missing API key");
assert(out.includes("FINAL STATE: GENERATING"), "State should be GENERATING");
assert(out.includes("LAST ERROR: PERMANENT_AUTH"), "Error should be PERMANENT_AUTH");
console.log("✅ Scenario D (Auth Failure) passed.");

// Scenario I (Partial HTML exists in repo root -> should purge and proceed)
resetEnv();
const partialHtml = "<html><body><h1>Oops... crashed";
fs.writeFileSync(path.join(ROOT, "test-topic-a.html"), partialHtml, "utf-8");
out = runScript({ OPENAI_API_KEY: "dummy_key", AI_TEXT_PROVIDER: "openai" }); 
if (fs.existsSync(path.join(ROOT, "test-topic-a.html"))) {
    console.error("Test Failed! Script output was:\n" + out);
}
assert(!fs.existsSync(path.join(ROOT, "test-topic-a.html")), "Partial file should be purged");
assert(out.includes("Purging it"), "Should log purging partial file");
console.log("✅ Scenario I (Partial HTML handling) passed.");

// Scenario H (Complete HTML exists in repo root -> should restage PENDING)
resetEnv();
const completeHtml = "<html><title>Test Title | TrustPointFin Insights</title><body><h1>Done</h1></body></html>";
fs.writeFileSync(path.join(ROOT, "test-topic-a.html"), completeHtml, "utf-8");
out = runScript({ OPENAI_API_KEY: "dummy_key", AI_TEXT_PROVIDER: "openai" });
assert(out.includes("[RECOVERY] Found complete test-topic-a.html"), "Should detect complete file");
assert(fs.existsSync(path.join(ROOT, ".pending_article.json")), "Should generate pending state");
const state = JSON.parse(fs.readFileSync(path.join(ROOT, ".pending_article.json"), "utf-8"));
assert.strictEqual(state.title, "Test Title", "Should extract title from existing file");
assert(out.includes("FINAL STATE: STAGED"), "Final state should be STAGED");
console.log("✅ Scenario H (Recovery: Committed but incomplete state) passed.");

// Scenario G (Complete HTML exists in .staging -> should restore and restage)
resetEnv();
fs.mkdirSync(STAGING_DIR);
fs.writeFileSync(path.join(STAGING_DIR, "test-topic-a.tmp.html"), completeHtml, "utf-8");
fs.writeFileSync(path.join(STAGING_DIR, ".pending_article.json"), JSON.stringify({ staged: true, topic: "Test Topic A", filename: "test-topic-a.html" }), "utf-8");
out = runScript({ OPENAI_API_KEY: "dummy_key", AI_TEXT_PROVIDER: "openai" });
assert(out.includes("[RECOVERY] Found complete test-topic-a.tmp.html in .staging cache"), "Should detect staging cache");
assert(fs.existsSync(path.join(ROOT, "test-topic-a.html")), "Should move file to root");
assert(fs.existsSync(path.join(ROOT, ".pending_article.json")), "Should move pending state to root");
assert(out.includes("FINAL STATE: STAGED"), "Final state should be STAGED");
console.log("✅ Scenario G (Recovery: Staged but not committed) passed.");

// Scenario J (Quality Gate Rejection -> Saves Diagnostic Artifact)
resetEnv();
const mockRejectionHtml = "---TITLE---\nMock\n---BODY---\nMockBody" + " pad".repeat(200);
out = runScript({ 
    OPENAI_API_KEY: "dummy_key", 
    AI_TEXT_PROVIDER: "openai", 
    TEST_MOCK_ARTICLE_TEXT: mockRejectionHtml,
    TEST_MOCK_QUALITY_GATE_FAIL: "true"
});
assert(out.includes("QUALITY_GATE_FAILED"), "Should fail quality gate");
assert(out.includes("Mock failure for testing"), "Should use mock failure reason");
assert(!fs.existsSync(path.join(ROOT, ".pending_article.json")), "Should NOT advance to pending state");
let rejectedFiles = fs.readdirSync(STAGING_DIR).filter(f => f.startsWith("rejected_") && f.endsWith(".html"));
assert.strictEqual(rejectedFiles.length, 1, "Should save exactly one rejected artifact");
const savedText = fs.readFileSync(path.join(STAGING_DIR, rejectedFiles[0]), "utf-8");
assert.strictEqual(savedText, mockRejectionHtml, "Rejected artifact should match generated text");
console.log("✅ Scenario J (Diagnostic artifact saved on Quality Gate failure) passed.");

// Scenario K (Malformed Evaluator Output -> Fails Safely)
resetEnv();
out = runScript({ 
    OPENAI_API_KEY: "dummy_key", 
    AI_TEXT_PROVIDER: "openai", 
    TEST_MOCK_ARTICLE_TEXT: mockRejectionHtml,
    TEST_MOCK_QUALITY_GATE_MALFORMED: "true"
});
assert(out.includes("QUALITY_GATE_FAILED"), "Should fail quality gate safely");
assert(out.includes("Failed to parse JSON"), "Should detect JSON failure");
rejectedFiles = fs.readdirSync(STAGING_DIR).filter(f => f.startsWith("rejected_") && f.endsWith(".html"));
assert.strictEqual(rejectedFiles.length, 1, "Should still save rejected artifact for malformed output");
console.log("✅ Scenario K (Safe failure on malformed evaluator output) passed.");

console.log("\n🎉 All recovery state machine tests passed successfully!");
