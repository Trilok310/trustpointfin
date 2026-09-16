const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const mockJsonData = [
  {
    topic: "Rule of 72 & Compounding",
    teaching_objective: "Teach the concept of compounding through visual metaphors.",
    format: "METAPHOR",
    visual_style: "Hand-drawn educational",
    slides: [
      { 
        headline: "दोगुना पैसा कब होगा?", 
        core_explanation: "क्या आप जानते हैं कि आपका पैसा कब double होगा? 'Rule of 72' नाम का एक जादुई formula है जो आपको तुरंत बता सकता है।", 
        visual_spec: { visual_concept: "A glowing 72 with gold coins" },
        annotation: "Swipe to see the math!", 
        cta: null 
      },
      { 
        headline: "Patience is Key", 
        core_explanation: "Compounding एक पेड़ की तरह है। जब आप बीज बोते हैं, तो कुछ नहीं दिखता। लेकिन सालों बाद, यह एक विशाल पेड़ बन जाता है।", 
        visual_spec: { visual_concept: "Young man confused by a seedling, giant tree in background" },
        annotation: "Don't dig up the seed to see if it's growing.", 
        cta: null 
      },
      { 
        headline: "FD vs Mutual Funds", 
        core_explanation: "FD आपको safe but slow returns (Snail) देती है। Mutual Funds risk के साथ fast returns (Rocket) देते हैं।", 
        visual_spec: { visual_concept: "Snail with bank vault shell vs Rocket with stock graph" },
        annotation: "Inflation eats slow money.", 
        cta: null 
      },
      { 
        headline: "The Final Harvest", 
        core_explanation: "जो लोग 15-20 साल तक SIP चलाते हैं, वो अंत में compounding का असली मज़ा लेते हैं। Time makes money.", 
        visual_spec: { visual_concept: "Older wealthy man watering a money tree" },
        annotation: "", 
        cta: "Save this post to stay motivated!" 
      }
    ],
    caption: "The secret to wealth is patience and time! 🌱🌳"
  }
];

const ROOT = __dirname;
const SLIDES_DIR = path.join(ROOT, '..', 'slides');
const ARTIFACT_DIR = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\b0a03e58-6b22-498e-b40e-745a1b5971d0\\test_outputs_v4';

if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

// Copy the AI generated images to the slides folder
const SRC_DIR = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\b0a03e58-6b22-498e-b40e-745a1b5971d0';
fs.copyFileSync(path.join(SRC_DIR, 'slide_1_illustration_1789208797515.jpg'), path.join(SLIDES_DIR, 'slide_1_illustration.jpg'));
fs.copyFileSync(path.join(SRC_DIR, 'slide_2_illustration_1789208832553.jpg'), path.join(SLIDES_DIR, 'slide_2_illustration.jpg'));
fs.copyFileSync(path.join(SRC_DIR, 'slide_3_illustration_1789208888850.jpg'), path.join(SLIDES_DIR, 'slide_3_illustration.jpg'));
fs.copyFileSync(path.join(SRC_DIR, 'slide_4_illustration_1789208913953.jpg'), path.join(SLIDES_DIR, 'slide_4_illustration.jpg'));

console.log(`\n\n=== GENERATING VISUALS FOR V4 TEST ===`);

// Save JSON
fs.writeFileSync(path.join(ROOT, '..', 'latest_slides.json'), JSON.stringify(mockJsonData[0], null, 2), 'utf8');

// Generate Visuals
execSync('node scripts/generate-carousel.js', { stdio: 'inherit', cwd: path.join(ROOT, '..') });

// Copy to artifacts
const postDir = path.join(ARTIFACT_DIR, `post_1`);
if (!fs.existsSync(postDir)) fs.mkdirSync(postDir);

fs.copyFileSync(path.join(ROOT, '..', 'latest_slides.json'), path.join(postDir, 'data.json'));

fs.readdirSync(SLIDES_DIR).forEach(f => {
    if (f.startsWith('final_slide_') && f.endsWith('.jpg')) {
        fs.copyFileSync(path.join(SLIDES_DIR, f), path.join(postDir, f));
    }
});

console.log('\n\nV4 Illustration test completed!');
