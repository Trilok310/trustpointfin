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

    // 2. V11 Schema Compatibility Check
    if (!json.format) {
         // The new V11 prompt requires a format field (STORY, COMPARISON, etc.)
         return { valid: false, reason: "Missing global 'format' property in JSON." };
    }

    // 3. Visual density & Readability check (V11 Schema)
    for (let i = 0; i < json.slides.length; i++) {
        const s = json.slides[i];
        
        // Ensure interior slides have illustrations
        if (i > 0 && i < json.slides.length - 1) {
            if (!s.visual_spec || !s.visual_spec.image_generation_prompt) {
                return { valid: false, reason: `Slide ${i+1} lacks a visual_spec with image_generation_prompt.` };
            }
        }
        
        // Excessive text check using the new core_explanation field
        if (s.core_explanation && s.core_explanation.length > 350) {
            return { valid: false, reason: `Slide ${i+1} has excessive text (too long for mobile).` };
        }
    }

    // 4. Financial accuracy (Heuristic)
    const allText = JSON.stringify(json).toLowerCase();
    if (allText.includes('guaranteed') || allText.includes('100% profit') || allText.includes('sure shot')) {
        return { valid: false, reason: "Compliance violation: mentions guaranteed returns." };
    }

    return { valid: true };
}

module.exports = { validateSocialContent };
