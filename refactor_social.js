const fs = require('fs');
const path = require('path');

// ==========================================
// 1. Rewrite services/ai/quality-gate.js
// ==========================================
const qgPath = 'services/ai/quality-gate.js';
const newQG = `function validateSocialContent(json) {
    if (!json || typeof json !== 'object') {
        return { valid: false, reason: "Invalid JSON format" };
    }

    if (!json.slides || !Array.isArray(json.slides) || json.slides.length < 3) {
        return { valid: false, reason: "Needs at least 3 slides." };
    }
    if (json.slides.length > 9) {
        return { valid: false, reason: "Too many slides (max 9)." };
    }

    // 1. Promotional check
    let ctaCount = 0;
    json.slides.forEach(s => {
        if (s.cta && s.cta.toLowerCase().includes('angel one')) ctaCount++;
    });
    if (ctaCount > 1) {
        return { valid: false, reason: "Too promotional. Angel One mentioned too many times." };
    }

    // 2. Schema Check
    if (!json.format) {
         return { valid: false, reason: "Missing global 'format' property in JSON." };
    }

    for (let i = 0; i < json.slides.length; i++) {
        const s = json.slides[i];
        if (i > 0 && i < json.slides.length - 1) {
            if (!s.visual_spec || !s.visual_spec.image_generation_prompt) {
                return { valid: false, reason: \`Slide \${i+1} lacks a visual_spec with image_generation_prompt.\` };
            }
        }
        if (s.core_explanation && s.core_explanation.length > 350) {
            return { valid: false, reason: \`Slide \${i+1} has excessive text (too long for mobile).\` };
        }
    }

    // 4. Financial accuracy (Strict Compliance)
    const allTextRaw = JSON.stringify(json);
    const allText = allTextRaw.toLowerCase()
        .replace(/actual return की guarantee नहीं/g, '')
        .replace(/no guarantee/g, '')
        .replace(/not guaranteed/g, '')
        .replace(/without guarantee/g, '')
        .replace(/guarantee नहीं/g, '')
        .replace(/guaranteed नहीं/g, '')
        .replace(/does not guarantee/g, '');

    const bannedPhrases = [
        "100% profit", "guaranteed", "guarantee", "sure shot", "eliminate risk", "will definitely go up", 
        "cannot lose", "zero risk", "risk-free", "निश्चित लाभ", "पक्का profit", "सटीक जवाब", "exact answer"
    ];

    for (const phrase of bannedPhrases) {
        if (allText.includes(phrase)) {
            return { valid: false, reason: \`Compliance violation: mentions banned phrase '\${phrase}'.\`, rule: "Do not use absolute certainty or guaranteed claims." };
        }
    }

    if (allText.includes("rule of 72") || allText.includes("72 ÷") || allText.includes("72 /")) {
        const hasApprox = allText.includes("≈") || allText.includes("approx") || allText.includes("लगभग") || allText.includes("अनुमान");
        if (!hasApprox) return { valid: false, reason: "Rule of 72 missing approximation symbol.", rule: "Must use ≈ or लगभग for Rule of 72." };
    }

    return { valid: true };
}

module.exports = { validateSocialContent };
`;
fs.writeFileSync(qgPath, newQG, 'utf-8');

// ==========================================
// 2. Rewrite services/ai/content-generator.js
// ==========================================
const cgPath = 'services/ai/content-generator.js';
const newCG = `const { GoogleGenerativeAI } = require("@google/generative-ai");
const { validateSocialContent } = require("./quality-gate.js");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
const modelName = process.env.GEMINI_PAID_MODEL || "gemini-3.8-flash";
const model = genAI.getGenerativeModel({ model: modelName });

async function generateSocialContent(topic, approvedArticleText = "") {
    const basePrompt = \`You are the Chief Financial Educator and Art Director for TrustPointFin.
OBJECTIVE: Create an illustrated financial mini-lesson using a rich, NotebookLM-style educational visual system based ON THE PROVIDED APPROVED ARTICLE.

APPROVED ARTICLE CONTEXT:
\${approvedArticleText.substring(0, 3000)}

TARGET QUALITY:
- Rich illustrated storytelling with actual characters, scenes, objects, and visual metaphors.
- Format must adapt to the topic. Select from: STORY|COMPARISON|CALCULATION|PROCESS|RISK|MARKET_CONCEPT
- CRITICAL: NO TEXT, NO LABELS in image prompts.

TOPIC: \${topic}

OUTPUT RAW JSON:
{
  "topic": "\${topic}",
  "teaching_objective": "...",
  "format": "STORY|COMPARISON|CALCULATION|PROCESS|RISK|MARKET_CONCEPT|MYTH_VS_REALITY|PSYCHOLOGY|TIMELINE|BEGINNER_CONCEPT",
  "slides": [
    {
      "slide_number": 1,
      "purpose": "context",
      "headline": "Short main text (Hindi/Hinglish)",
      "core_explanation": "Short educational statement (Max 2-4 points). CRITICAL: NO dense paragraph blocks.",
      "visual_spec": {
          "visual_concept": "Describe the core visual idea",
          "image_generation_prompt": "Prompt for DALL-E 3. MUST INCLUDE: 'NotebookLM-style educational aesthetic. NO TEXT.'"
      },
      "annotation": "A small tip or arrow annotation",
      "cta": "Short call to action text. Can be null."
    }
  ],
  "caption": "Instagram/Facebook caption with relevant hashtags."
}\`;

    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY for content generation.");
    }

    let attempts = 0;
    let correctionContext = "";

    while (attempts < 5) {
        attempts++;
        try {
            let currentPrompt = basePrompt;
            if (correctionContext) {
                console.log("[AUTO-CORRECTION] Sending social compliance feedback to AI...");
                currentPrompt += \`\\n\\nCRITICAL COMPLIANCE FEEDBACK FROM PREVIOUS ATTEMPT:\\n\${correctionContext}\\nFix the JSON to resolve these errors.\`;
            }

            const result = await model.generateContent(currentPrompt);
            let rawText = result.response.text();
            rawText = rawText.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
            
            let parsed;
            try {
                parsed = JSON.parse(rawText);
            } catch (e) {
                correctionContext = "Invalid JSON syntax. Fix the formatting.";
                continue;
            }
            
            const qg = validateSocialContent(parsed);
            if (qg.valid) return parsed;
            
            console.log("Quality Gate Failed:", qg.reason);
            correctionContext = \`Rule violated: \${qg.rule || qg.reason}\`;
            
            if (attempts >= 3) {
                throw new Error(\`Social Quality Gate permanently failed: \${qg.reason}\`);
            }
        } catch (e) {
            console.log(\`Generation error on attempt \${attempts}:\`, e.message);
            if (e.message.includes("permanently failed")) throw e;
            
            if (e.message.includes("429") || e.message.includes("503") || e.message.includes("overloaded")) {
                if (attempts >= 5) throw new Error(\`API limits exhausted: \${e.message}\`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                if (attempts >= 5) throw e;
            }
        }
    }
    throw new Error("Failed to generate valid content after max attempts.");
}

module.exports = { generateSocialContent };
`;
fs.writeFileSync(cgPath, newCG, 'utf-8');

// ==========================================
// 3. Update prepare-social.js to pass article context
// ==========================================
const psPath = 'scripts/prepare-social.js';
let psContent = fs.readFileSync(psPath, 'utf-8');
psContent = psContent.replace(
    /const socialData = await generateSocialContent\(article\.title\);/,
    `
        const stateManager = require('./state-manager.js');
        stateManager.updateState({ social_generation_status: 'GENERATING' });
        const articleHtml = fs.readFileSync(path.join(ROOT, article.filename), 'utf8');
        const socialData = await generateSocialContent(article.title, articleHtml);
        stateManager.updateState({ social_generation_status: 'SUCCESS', social_compliance_status: 'SUCCESS' });
    `
);
fs.writeFileSync(psPath, psContent, 'utf-8');
console.log("Social generation refactoring complete.");
