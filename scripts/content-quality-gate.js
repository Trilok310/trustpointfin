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

    // 1. DETERMINISTIC COMPLIANCE CHECKS
    const contentLower = content.toLowerCase();
    const bannedPhrases = [
        "100% profit", "guaranteed", "sure shot", "eliminate risk", "will definitely go up", 
        "cannot lose", "zero risk", "risk-free"
    ];
    
    for (const phrase of bannedPhrases) {
        if (contentLower.includes(phrase)) {
            return { valid: false, reason: `DETERMINISTIC COMPLIANCE FAILURE: Found banned absolute claim ("${phrase}").` };
        }
    }
    
    // Check for excessive text density (heuristic: paragraphs shouldn't be extremely long)
    const paragraphs = content.split('\n').filter(p => p.trim().length > 0);
    for (const p of paragraphs) {
        if (p.length > 800) {
            return { valid: false, reason: "TEXT DENSITY FAILURE: Found excessively long, dense paragraph block." };
        }
    }

    // 2. AI MODEL SCORING
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn("⚠️ No GEMINI_API_KEY available for quality gate. Skipping rigorous AI check.");
        return { valid: true, reason: "Passed deterministic checks (AI skipped due to missing key)" };
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_FREE_MODEL || "gemini-3.6-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `You are the Chief Compliance Officer and Managing Editor at TrustPointFin.
Evaluate the following generated financial article based on 4 criteria. You must be extremely strict.

1. Content (0-10): Does it provide educational value using short, concise points?
2. Accuracy (0-10): Is it financially sound, compliant, and free of overly broad/unsupported claims?
3. Visuals (0-10): Is the structure engaging, visual, and highly readable (no dense blocks)?
4. Readability (0-10): Is the Hindi/Hinglish natural and easy for beginners to understand?

OUTPUT STRICTLY IN THIS EXACT FORMAT (nothing else):
Content: [SCORE]
Accuracy: [SCORE]
Visuals: [SCORE]
Readability: [SCORE]

--- CONTENT TO EVALUATE ---
` + content + `
---------------------------`;

    let attempts = 0;
    while (attempts < 3) {
        try {
            console.log("\n[AI REQUEST] (Quality Gate)");
            console.log("Request started");
            
            const result = await model.generateContent(prompt);
            
            console.log("\n[AI RESPONSE] (Quality Gate)");
            console.log("HTTP status: 200 (Success)");
            console.log("Response received: true");
            
            const responseText = result.response.text().trim();
            
            let scores = {};
            const lines = responseText.split('\n');
            for (const line of lines) {
                const match = line.match(/(Content|Accuracy|Visuals|Readability):\s*([\d\.]+)/i);
                if (match) {
                    scores[match[1].toLowerCase()] = parseFloat(match[2]);
                }
            }

            if (scores.content === undefined || scores.accuracy === undefined || scores.visuals === undefined || scores.readability === undefined) {
                return { valid: false, reason: `AI Gate Error: Failed to parse scores. Raw response was: ${responseText.substring(0, 100)}...` };
            }

            console.log(`📊 AI Quality Scores - Content: ${scores.content}, Accuracy: ${scores.accuracy}, Visuals: ${scores.visuals}, Readability: ${scores.readability}`);

            if (scores.content < 8.5) return { valid: false, reason: `Score too low: Content (${scores.content} < 8.5)` };
            if (scores.accuracy < 9.0) return { valid: false, reason: `Score too low: Accuracy (${scores.accuracy} < 9.0)` };
            if (scores.visuals < 8.0) return { valid: false, reason: `Score too low: Visuals (${scores.visuals} < 8.0)` };
            if (scores.readability < 8.5) return { valid: false, reason: `Score too low: Readability (${scores.readability} < 8.5)` };

            return { valid: true, reason: "Passed all quality checks and minimum score thresholds." };
            
        } catch (e) {
            console.log("\n[AI ERROR] (Quality Gate)");
            console.log(`Type: ${e.name || "Error"}`);
            console.log(`Status: ${e.status || e.statusText || e.code || "Unknown (Check message)"}`);
            
            let safeMessage = e.stack || e.message || String(e);
            if (apiKey) safeMessage = safeMessage.split(apiKey).join("[REDACTED_API_KEY]");
            console.log(`Message: ${safeMessage}`);
            
            attempts++;
            const isTransientError = safeMessage.includes("503") || safeMessage.includes("429") || safeMessage.includes("500") || safeMessage.includes("fetch");
            
            if (isTransientError && attempts < 3) {
                console.log("\n[RETRY] (Quality Gate)");
                console.log(`Attempt ${attempts}/3`);
                console.log("Waiting 35s before next attempt...");
                await new Promise(resolve => setTimeout(resolve, 35000));
            } else if (attempts === 3) {
                console.log("\n[FATAL] (Quality Gate)");
                console.log("Free tier Gemini generation failed after 3 attempts.");
                console.log("Pipeline halted safely.");
                return { valid: false, reason: "Quality Gate API Error (Persistent Failure)" };
            } else {
                console.log("\n[FATAL] (Quality Gate)");
                console.log("Non-transient error encountered.");
                return { valid: false, reason: `Quality Gate API Error: ${e.message}` };
            }
        }
    }
}

module.exports = { validateSocialContent };
