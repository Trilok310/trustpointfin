const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const ROOT = __dirname;
const CALENDAR_PATH = path.join(ROOT, '..', 'content_calendar.md');
const SLIDES_DIR = path.join(ROOT, '..', 'slides');
const LATEST_JSON = path.join(ROOT, '..', 'latest_slides.json');

const testTopics = [
    "Rule of 72",
    "Growth vs Value Investing",
    "Beginner investment mistake: Chasing penny stocks",
    "What is SIP and how does compounding work?",
    "Market Order vs Limit Order"
];

// 1. Prepare Calendar
const markdown = [
  "## TrustPointFin Quality Topic Queue",
  "",
  ...testTopics.map((topic, i) => `- [ ] \${i + 1}. \${topic}`),
  ""
].join("\\n");
fs.writeFileSync(CALENDAR_PATH, markdown, 'utf8');

// 2. Prepare Output Dir
const ARTIFACT_DIR = 'C:\\\\Users\\\\HP\\\\.gemini\\\\antigravity\\\\brain\\\\b0a03e58-6b22-498e-b40e-745a1b5971d0\\\\test_outputs';
if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

// 3. Run Loop
for (let i = 0; i < testTopics.length; i++) {
    console.log(`\\n\\n=== RUNNING TEST \${i+1}: \${testTopics[i]} ===`);
    
    // Generate Content
    execSync('node scripts/post-article.js', { stdio: 'inherit', cwd: path.join(ROOT, '..') });
    
    // Generate Visuals
    execSync('node scripts/generate-carousel.js', { stdio: 'inherit', cwd: path.join(ROOT, '..') });
    
    // Copy to artifacts
    const postDir = path.join(ARTIFACT_DIR, \`post_\${i+1}\`);
    if (!fs.existsSync(postDir)) fs.mkdirSync(postDir);
    
    fs.copyFileSync(LATEST_JSON, path.join(postDir, 'data.json'));
    
    fs.readdirSync(SLIDES_DIR).forEach(f => {
        if (f.endsWith('.jpg')) {
            fs.copyFileSync(path.join(SLIDES_DIR, f), path.join(postDir, f));
        }
    });
}
console.log('\\n\\nAll 5 tests completed and saved to test_outputs!');
