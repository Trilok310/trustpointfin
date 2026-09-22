const { GoogleGenerativeAI } = require("@google/generative-ai");
const { validateSocialContent } = require("./quality-gate.js");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
const modelName = process.env.GEMINI_PAID_MODEL || "gemini-3.8-flash";
const model = genAI.getGenerativeModel({ model: modelName });

async function generateSocialContent(topic, approvedArticleText = "") {
    const basePrompt = `You are the Chief Financial Educator and Art Director for TrustPointFin.
OBJECTIVE: Create an illustrated financial mini-lesson using a rich, NotebookLM-style educational visual system based ON THE PROVIDED APPROVED ARTICLE.

APPROVED ARTICLE CONTEXT:
${approvedArticleText.substring(0, 3000)}

TARGET QUALITY:
- Rich illustrated storytelling with actual characters, scenes, objects, and visual metaphors.
- Format must adapt to the topic. Select from: STORY|COMPARISON|CALCULATION|PROCESS|RISK|MARKET_CONCEPT
- CRITICAL: NO TEXT, NO LABELS in image prompts.

TOPIC: ${topic}

OUTPUT RAW JSON:
{
  "topic": "${topic}",
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
}`;

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
                currentPrompt += `\n\nCRITICAL COMPLIANCE FEEDBACK FROM PREVIOUS ATTEMPT:\n${correctionContext}\nFix the JSON to resolve these errors.`;
            }

            const result = await model.generateContent(currentPrompt);
            let rawText = result.response.text();
            rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            
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
            correctionContext = `Rule violated: ${qg.rule || qg.reason}`;
            
            if (attempts >= 3) {
                throw new Error(`Social Quality Gate permanently failed: ${qg.reason}`);
            }
        } catch (e) {
            console.log(`Generation error on attempt ${attempts}:`, e.message);
            if (e.message.includes("permanently failed")) throw e;
            
            if (e.message.includes("429") || e.message.includes("503") || e.message.includes("overloaded")) {
                if (attempts >= 5) throw new Error(`API limits exhausted: ${e.message}`);
                await new Promise(resolve => setTimeout(resolve, 5000));
            } else {
                if (attempts >= 5) throw e;
            }
        }
    }
    throw new Error("Failed to generate valid content after max attempts.");
}

module.exports = { generateSocialContent };
