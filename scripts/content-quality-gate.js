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

    if (process.env.TEST_MOCK_QUALITY_GATE_FAIL) {
        return { valid: false, reason: "Mock failure for testing" };
    }
    if (process.env.TEST_MOCK_QUALITY_GATE_MALFORMED) {
        return { valid: false, reason: "AI Gate Error: Failed to parse JSON." };
    }

    // 1. DETERMINISTIC COMPLIANCE CHECKS
    const contentLower = content.toLowerCase();

    // Strip legitimate educational negations before checking banned phrases
    const safeContent = contentLower
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
        if (safeContent.includes(phrase)) {
            return { 
                valid: false, 
                reason: `DETERMINISTIC COMPLIANCE FAILURE: Found banned absolute claim ("${phrase}").`,
                rule: "Do not use absolute certainty or guaranteed claims.",
                offending_text: phrase
            };
        }
    }

    // Rule of 72 Approximation Check
    if (contentLower.includes("rule of 72") || contentLower.includes("72 ÷") || contentLower.includes("72 /")) {
        const hasApprox = contentLower.includes("≈") || contentLower.includes("approx") || contentLower.includes("लगभग") || contentLower.includes("अनुमान");
        if (!hasApprox) {
             return { 
                 valid: false, 
                 reason: "COMPLIANCE FAILURE: Rule of 72 or formula is not described as approximate (missing ≈ or लगभग).",
                 rule: "Rule of 72 and formulas must always be described as approximate using '≈' or 'लगभग'.",
                 offending_text: "Rule of 72 calculation without approximation symbol"
             };
        }
    }

    // Hypothetical Return/Inflation Check
    if (contentLower.includes("inflation") || contentLower.includes("महंगाई")) {
        if (contentLower.includes("पैसे को आधा कर रही है") || contentLower.includes("half your money")) {
             return { 
                 valid: false, 
                 reason: "COMPLIANCE FAILURE: Inflation described with sensational/absolute language.",
                 rule: "Do not use absolute or sensational language like 'halving your money' for inflation.",
                 offending_text: "Inflation reducing money absolutely"
             };
        }
    }
    
    // Check for clearly labelled hypothetical returns
    if (contentLower.match(/\b(1[0-9]|2[0-9])\s*%\s*(return|cagr)/)) {
        const hasLabel = contentLower.includes("hypothetical") || contentLower.includes("illustrative") || contentLower.includes("मानें") || contentLower.includes("यदि") || contentLower.includes("example") || contentLower.includes("उदाहरण");
        if (!hasLabel) {
             return { 
                 valid: false, 
                 reason: "COMPLIANCE FAILURE: Numerical return assumption without 'hypothetical/illustrative' labeling.",
                 rule: "Any mention of specific high returns (e.g. 12% return) must be explicitly labelled as 'hypothetical', 'illustrative', or 'उदाहरण'.",
                 offending_text: "High percentage return without assumption label"
             };
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

OUTPUT STRICTLY AS VALID JSON MATCHING THIS EXACT SCHEMA (no markdown formatting, no backticks, just raw JSON):
{
  "content": number,
  "accuracy": number,
  "visuals": number,
  "readability": number,
  "content_reason": "string",
  "accuracy_reason": "string",
  "visuals_reason": "string",
  "readability_reason": "string"
}

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
            
            const responseText = result.response.text().trim().replace(/```json/g, '').replace(/```/g, '');
            let parsed;
            try {
                parsed = JSON.parse(responseText);
            } catch (err) {
                return { valid: false, reason: `AI Gate Error: Failed to parse JSON. Raw response: ${responseText.substring(0, 100)}...` };
            }

            const requiredKeys = ["content", "accuracy", "visuals", "readability", "content_reason", "accuracy_reason", "visuals_reason", "readability_reason"];
            for (const key of requiredKeys) {
                if (parsed[key] === undefined) {
                    return { valid: false, reason: `AI Gate Error: Missing key '${key}' in JSON response.` };
                }
            }

            console.log(`📊 AI Quality Scores - Content: ${parsed.content}, Accuracy: ${parsed.accuracy}, Visuals: ${parsed.visuals}, Readability: ${parsed.readability}`);
            console.log(`📝 Reasons:\nContent: ${parsed.content_reason}\nAccuracy: ${parsed.accuracy_reason}\nVisuals: ${parsed.visuals_reason}\nReadability: ${parsed.readability_reason}`);

            if (parsed.content < 8.5) return { valid: false, reason: `Score too low: Content (${parsed.content} < 8.5). Reason: ${parsed.content_reason}` };
            if (parsed.accuracy < 9.0) return { valid: false, reason: `Score too low: Accuracy (${parsed.accuracy} < 9.0). Reason: ${parsed.accuracy_reason}` };
            if (parsed.visuals < 8.0) return { valid: false, reason: `Score too low: Visuals (${parsed.visuals} < 8.0). Reason: ${parsed.visuals_reason}` };
            if (parsed.readability < 8.5) return { valid: false, reason: `Score too low: Readability (${parsed.readability} < 8.5). Reason: ${parsed.readability_reason}` };

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
