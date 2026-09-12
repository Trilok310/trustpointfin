const { GoogleGenerativeAI } = require("@google/generative-ai");
const { validateSocialContent } = require("./quality-gate.js");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy_key");
const modelName = process.env.CONTENT_GENERATOR_MODEL || "gemini-3.6-pro";
const model = genAI.getGenerativeModel({ model: modelName });

async function generateSocialContent(topic) {
    const prompt = `You are the Chief Financial Educator and Art Director for TrustPointFin.
OBJECTIVE: Create an illustrated financial mini-lesson. The visual must occupy 65% of the space.
TOPIC: ${topic}

Use visual metaphors (e.g. tree for compounding, snail/rocket for FD/Stocks, multiple baskets for diversification).

OUTPUT RAW JSON:
{
  "topic": "${topic}",
  "teaching_objective": "...",
  "format": "STORY|METAPHOR|COMPARISON|DIAGRAM",
  "visual_style": "Hand-drawn educational|Modern editorial",
  "slides": [
    {
      "slide_number": 1,
      "purpose": "context",
      "headline": "Main text",
      "core_explanation": "Supporting text",
      "visual_spec": {
          "visual_concept": "Describe the core visual idea, distributed from left to right",
          "image_generation_prompt": "Prompt for AI image generator. MUST INCLUDE: Use a full-width illustrated composition with substantial vertical depth (3:2 or 4:3 landscape ratio). Do NOT generate a thin horizontal banner. The illustration must occupy 90-95% of the width and ~60% of the height, containing rich vertical storytelling (foreground, characters, background). Distribute elements across LEFT, CENTER, and RIGHT. Maintain NotebookLM-style richness. Use light, soft, airy pastel colors. CRITICAL: Do NOT generate ANY text, labels, financial numbers, percentages, or guaranteed returns inside the image. The image must be completely text-free. "
      },
      "annotation": "A small tip",
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
        }
    }
    throw new Error("Failed to generate valid content after 3 attempts.");
}

module.exports = { generateSocialContent };
