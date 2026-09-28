function validateSocialContent(json) {
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
                return { valid: false, reason: `Slide ${i+1} lacks a visual_spec with image_generation_prompt.` };
            }
        }
        if (s.core_explanation && s.core_explanation.length > 350) {
            return { valid: false, reason: `Slide ${i+1} has excessive text (too long for mobile).` };
        }
    }

    // 4. Financial accuracy (Strict Compliance)
    const allTextRaw = JSON.stringify(json);
    const allText = allTextRaw.toLowerCase();

    // Strict unconditional bans
    const strictBans = [
        "100% profit", "sure shot", "will definitely go up", "cannot lose", 
        "निश्चित लाभ", "पक्का profit", "सटीक जवाब", "exact answer"
    ];
    for (const phrase of strictBans) {
        if (allText.includes(phrase)) {
            return { valid: false, reason: `Compliance violation: mentions banned phrase '${phrase}'.`, rule: "Do not use absolute certainty or guaranteed claims." };
        }
    }

    // Contextual / Negatable terms: guarantee, guaranteed, गारंटी, risk-free, zero risk, eliminate risk
    const contextualTerms = ["guarantee", "guaranteed", "गारंटी", "risk-free", "risk free", "zero risk", "eliminate risk"];
    const sentences = allTextRaw.split(/[।.!?\n;]|<\/?(?:p|li|h[1-6]|div|tr|td|th)[^>]*>|["',]/i);
    const negationRegex = /(?:^|[^\w\u0900-\u097F])(no|not|never|without|doesn't|does not|cannot|can't|won't|is not|isn't|are not|aren't|don't|do not|neither|nor|vary|varies|subject to|नहीं|नही|ना|न|nahi|na|nhi|bina|बिना)(?:$|[^\w\u0900-\u097F])/i;

    for (const raw of sentences) {
        const s = raw.trim().toLowerCase();
        if (!s) continue;
        for (const term of contextualTerms) {
            if (s.includes(term)) {
                if (!negationRegex.test(s)) {
                    return { valid: false, reason: `Compliance violation: mentions banned phrase '${term}' without educational negation in: "${raw.trim().substring(0, 60)}..."`, rule: "Do not use absolute certainty or guaranteed claims without disclaimers." };
                }
            }
        }
    }

    if (allText.includes("rule of 72") || allText.includes("72 ÷") || allText.includes("72 /")) {
        const hasApprox = allText.includes("≈") || allText.includes("approx") || allText.includes("लगभग") || allText.includes("अनुमान");
        if (!hasApprox) return { valid: false, reason: "Rule of 72 missing approximation symbol.", rule: "Must use ≈ or लगभग for Rule of 72." };
    }

    return { valid: true };
}

module.exports = { validateSocialContent };
