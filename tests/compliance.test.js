const assert = require('assert');
const path = require('path');
const { validateSocialContent } = require('../scripts/content-quality-gate.js');

(async () => {
    console.log("🧪 Starting Compliance & Financial Wording Guardrail Tests...\n");

    // A. Rule of 72 is described as approximate.
    const rule72Exact = "The Rule of 72 formula is 72 / 12 = 6 years.";
    const resA1 = await validateSocialContent(rule72Exact);
    assert.strictEqual(resA1.valid, false, "Should reject exact Rule of 72 phrasing");
    assert(resA1.reason.includes("approximate"), "Reason should mention approximation");

    const rule72Approx = "The Rule of 72 is एक आसान अनुमान. 72 / 12 ≈ 6 years.";
    // Mock the AI part so it passes if deterministic checks pass
    process.env.GEMINI_API_KEY = "";
    const resA2 = await validateSocialContent(rule72Approx);
    assert.strictEqual(resA2.valid, true, "Should accept approximate Rule of 72 phrasing");

    console.log("✅ A. Rule of 72 approximation tests passed.");

    // B. Hypothetical return assumptions are clearly labelled.
    const hypReturnExact = "We will get 12% return from this fund.";
    const resB1 = await validateSocialContent(hypReturnExact);
    assert.strictEqual(resB1.valid, false, "Should reject unlabelled return assumptions");

    const hypReturnLabelled = "यदि annual return 12% मानें, we get good results.";
    const resB2 = await validateSocialContent(hypReturnLabelled);
    assert.strictEqual(resB2.valid, true, "Should accept labelled hypothetical return");

    console.log("✅ B. Hypothetical return labelling tests passed.");

    // C. Inflation examples use approximate language.
    const inflationExact = "महंगाई आपके पैसे को आधा कर रही है in 10 years.";
    const resC1 = await validateSocialContent(inflationExact);
    assert.strictEqual(resC1.valid, false, "Should reject sensational inflation language");

    const inflationApprox = "महंगाई आपकी Purchasing Power घटाती है.";
    const resC2 = await validateSocialContent(inflationApprox);
    assert.strictEqual(resC2.valid, true, "Should accept educational inflation language");

    console.log("✅ C. Inflation approximate language tests passed.");

    // D. Guaranteed-return claims are rejected.
    const guaranteeClaim = "Invest here for a 100% profit and guaranteed returns.";
    const resD1 = await validateSocialContent(guaranteeClaim);
    assert.strictEqual(resD1.valid, false, "Should reject absolute guarantee claims");

    console.log("✅ D. Guaranteed-return rejection tests passed.");

    // E. Legitimate educational negation containing "guarantee" is accepted.
    const guaranteeNegation = "Remember, यह actual return की guarantee नहीं देता।";
    const resE1 = await validateSocialContent(guaranteeNegation);
    assert.strictEqual(resE1.valid, true, "Should accept legitimate educational negation of guarantee");

    console.log("✅ E. Legitimate educational negation tests passed.");

    console.log("\n🎉 All compliance guardrail tests passed successfully!");
})();
