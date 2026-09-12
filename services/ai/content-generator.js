const { GoogleGenerativeAI } = require("@google/generative-ai");
const { validateSocialContent } = require("./quality-gate.js");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
const modelName = process.env.CONTENT_GENERATOR_MODEL || "gemini-3.6-flash";
const model = genAI.getGenerativeModel({ model: modelName });

async function generateSocialContent(topic) {
    const prompt = `You are the Chief Financial Educator and Art Director for TrustPointFin.
OBJECTIVE: Create an illustrated financial mini-lesson using a rich, NotebookLM-style educational visual system.

TARGET QUALITY:
- Rich illustrated storytelling with actual characters, scenes, objects, and visual metaphors.
- Educational diagrams, relationships, and charts/graphs when the topic benefits from them.
- Format must adapt to the topic. Select from:
  * STORY (characters + scene + speech bubbles logic)
  * COMPARISON (two visual worlds + comparison structure)
  * CALCULATION (illustrated objects + formula + worked example)
  * PROCESS (step-by-step visual journey)
  * RISK (scenario/decision illustration)
  * MARKET_CONCEPT (chart + illustrated explanation)
  * MYTH_VS_REALITY (contrasting scenes)
  * PSYCHOLOGY (character conversation/internal conflict)
  * TIMELINE (visual progression)
  * BEGINNER_CONCEPT (everyday-life analogy)
- DO NOT use the same generic format for every slide.

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
      "headline": "Main text (Hindi/Hinglish)",
      "core_explanation": "Supporting text (Mobile-readable, Hindi/Hinglish)",
      "visual_spec": {
          "visual_concept": "Describe the core visual idea (e.g. 'Two contrasting worlds: a calm investor in a storm vs a panicked trader')",
          "image_generation_prompt": "Prompt for DALL-E 3. MUST INCLUDE: 'NotebookLM-style educational aesthetic. Rich illustrated storytelling with characters, scenes, and visual metaphors. Full-width composition with substantial vertical depth (4:3 ratio). Fill the entire canvas space. Light, soft, airy pastel colors. CRITICAL: NO TEXT, NO LABELS, NO NUMBERS, NO CHARACTERS OF ANY ALPHABET inside the image itself. The image must be completely text-free.'"
      },
      "annotation": "A small tip or arrow annotation",
      "cta": null
    }
  ],
  "caption": "Instagram caption..."
}`;

    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Missing GEMINI_API_KEY for content generation.");
    }

    let attempts = 0;
    while (attempts < 3) {
        attempts++;
        try {
            const result = await model.generateContent(prompt);
            let rawText = result.response.text();
            rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(rawText);
            
            const qg = validateSocialContent(parsed);
            if (qg.valid) return parsed;
            console.log("Quality Gate Failed:", qg.reason);
        } catch (e) {
            console.log("Generation error:", e.message);
            if (e.message.includes("limit: 20") || e.message.includes("quota")) {
                console.error("❌ CRITICAL ERROR: Daily free-tier API quota exhausted. Halting pipeline permanently.");
                throw e; // Do NOT retry, fail immediately
            }
            if (e.message.includes("429") || e.message.includes("503")) {
                console.log(`⚠️ Rate limit hit (transient). Waiting 50 seconds before retry ${attempts}/3...`);
                await new Promise(resolve => setTimeout(resolve, 50000));
            } else {
                throw e; // Throw any other unexpected errors immediately
            }
        }
    }
    throw new Error("Failed to generate valid content after 3 attempts.");
}

module.exports = { generateSocialContent };
