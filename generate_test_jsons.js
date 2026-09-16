const { generateSocialContent } = require("./services/ai/content-generator.js");
const fs = require("fs");

async function run() {
    const tests = [
        "What is the Stock Market? (शेयर बाजार क्या है?)",
        "FD vs Mutual Funds: Which is better?",
        "Mastering Risk Management and Position Sizing"
    ];

    for (let i = 0; i < 3; i++) {
        console.log(`\n\n--- Generating Test ${i+1} ---`);
        try {
            const data = await generateSocialContent(tests[i]);
            fs.writeFileSync(`test_${i+1}_data.json`, JSON.stringify(data, null, 2));
            console.log(`Saved test_${i+1}_data.json`);
            data.slides.forEach(s => {
                console.log(`Slide ${s.slide_number} Prompt:`, s.visual_spec.image_generation_prompt);
            });
        } catch (e) {
            console.error(e);
        }
    }
}
run();
