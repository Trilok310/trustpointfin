const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * Validates the generated financial content against strict quality standards.
 * 
 * @param {string} content - The generated text (article + social media captions)
 * @returns {Promise<{valid: boolean, reason: string}>}
 */
async function validateSocialContent(content) {
    if (!content || content.trim().length === 0) {
        return { valid: false, reason: "Content is completely empty." };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("?? No GEMINI_API_KEY available for quality gate. Skipping rigorous AI check.");
        return { valid: true, reason: "Skipped due to missing key" };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.QUALITY_GATE_MODEL || "gemini-3.6-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `You are the Chief Compliance Officer and Managing Editor at TrustPointFin.
Evaluate the following generated financial article and social media content based on these criteria:
1. educational value: Does it teach the reader something useful?
2. visual quality / storytelling: Is the structure engaging and easy to read?
3. originality: Does it avoid generic fluff?
4. financial accuracy: Are the concepts mathematically and financially sound?
5. compliance: Does it avoid promising guaranteed returns or 100% profits?
6. Hindi/Hinglish quality: Is the Hindi natural and engaging for Indian youth?
7. beginner usefulness: Can a beginner understand this?
8. overall content quality: Is this ready for production?

If the content passes ALL criteria, respond with exactly: "PASS".
If it fails any criteria, respond with "FAIL:" followed by a short explanation of what is wrong.

--- CONTENT TO EVALUATE ---
` + content + `
---------------------------`;

    let attempts = 0;
    while (attempts < 3) {
        try {
            const result = await model.generateContent(prompt);
            const responseText = result.response.text().trim();

            if (responseText.startsWith("PASS")) {
                return { valid: true, reason: "Passed all quality checks." };
            } else {
                return { valid: false, reason: responseText };
            }
        } catch (e) {
            attempts++;
            if (e.message.includes("429") || e.message.includes("503")) {
                console.warn(`⚠️ Rate limit hit in Quality Gate. Waiting 10 seconds (Attempt ${attempts}/3)...`);
                await new Promise(resolve => setTimeout(resolve, 10000));
                if (attempts === 3) {
                    return { valid: false, reason: "Quality Gate API Error (Rate Limit Exhausted)" };
                }
            } else {
                console.error("⚠️ Quality Gate AI check failed, assuming invalid to be safe:", e.message);
                return { valid: false, reason: "Quality Gate API Error" };
            }
        }
    }
}

module.exports = { validateSocialContent };
