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

    // 2. Repetitive layout check
    const visualTypes = json.slides.map(s => s.visual_type).filter(v => v !== 'none');
    if (visualTypes.length > 0) {
        const uniqueVisuals = new Set(visualTypes);
        if (uniqueVisuals.size === 1 && json.slides.length > 4) {
             return { valid: false, reason: "Repetitive layout. Use varied visual structures." };
        }
    }

    // 3. Visual density & Readability check
    for (let i = 0; i < json.slides.length; i++) {
        const s = json.slides[i];
        
        // Excessive empty space (no visual and very short text on middle slides)
        if (i > 0 && i < json.slides.length - 1) {
            if ((!s.visual_type || s.visual_type === 'none') && (!s.body || s.body.length < 20)) {
                return { valid: false, reason: `Slide \${i+1} has excessive empty space (no visual + short text).` };
            }
        }
        
        // Excessive text check
        if (s.body && s.body.length > 250) {
            return { valid: false, reason: `Slide \${i+1} has excessive text (too long for mobile).` };
        }
    }

    // 4. Financial accuracy (Heuristic)
    const allText = JSON.stringify(json).toLowerCase();
    if (allText.includes('guaranteed') || allText.includes('100% profit') || allText.includes('sure shot')) {
        return { valid: false, reason: "Compliance violation: mentions guaranteed returns." };
    }

    // 5. True Illustration Check (V4/V5)
    for (let i = 0; i < json.slides.length; i++) {
        const s = json.slides[i];
        if (i > 0 && i < json.slides.length - 1) { // interior slides
            if (!s.visual_spec || !s.visual_spec.visual_concept || s.visual_spec.visual_concept.length < 10) {
                return { valid: false, reason: `Slide ${i+1} lacks a meaningful visual_spec. Visuals must drive the explanation.` };
            }
            if (s.visual_spec.visual_type === 'none') {
                 return { valid: false, reason: `Slide ${i+1} has no visual. Every interior slide must have an illustration.` };
            }
            const prompt = s.visual_spec.image_generation_prompt || "";
            if (!prompt.toLowerCase().includes("wide") && !prompt.toLowerCase().includes("left")) {
                return { valid: false, reason: `Slide ${i+1} image generation prompt does not explicitly request a wide edge-to-edge composition.` };
            }
        }
    }

    return { valid: true };
}

module.exports = { validateSocialContent };
