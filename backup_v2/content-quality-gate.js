const { GoogleGenerativeAI } = require("@google/generative-ai");

/**
 * TrustPointFin Social Quality Gate
 *
 * Returns { pass, score, reasons }.
 * The caller should regenerate instead of publishing when pass=false.
 */

async function qualityCheck(genAI, modelName, content) {
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `You are the final editorial quality controller for TrustPointFin,
an Indian stock-market education brand.

Review the proposed social post below.

PASS ONLY if ALL of these are true:
1. The first line creates genuine curiosity without clickbait.
2. It teaches ONE clear, useful idea.
3. It sounds like an intelligent Indian finance creator, not generic AI.
4. Hindi is natural Devanagari mixed with familiar English financial terms.
5. It does not make guaranteed-return, get-rich, or exaggerated claims.
6. It does not give personalised investment advice or a specific buy/sell recommendation.
7. It is not stuffed with emojis.
8. It does not repeatedly promote Angel One.
9. It has a useful reason to save, share or comment.
10. The wording is concise enough for a mobile feed.
11. Any numerical calculation is internally consistent.
12. It does not use empty phrases such as "game changer", "secret", "ultimate strategy",
"financial freedom", "start your journey today" unless genuinely necessary.
13. It does not manufacture statistics, company facts, prices or current-market claims.

SCORING:
- Hook: /10
- Usefulness: /10
- Natural language: /10
- Originality: /10
- Save/share potential: /10
- Non-salesy quality: /10
- Accuracy/compliance: /10

PASS requires:
- overall average >= 8
- no score below 7
- accuracy/compliance >= 9

Return ONLY valid JSON:
{
  "pass": true,
  "average": 8.7,
  "scores": {
    "hook": 9,
    "usefulness": 9,
    "language": 8,
    "originality": 8,
    "save_share": 9,
    "non_salesy": 9,
    "accuracy_compliance": 10
  },
  "reasons": ["short reason 1", "short reason 2"],
  "fixes": ["specific fix if failed"]
}

CONTENT:
${content}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();

  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(cleaned);
}

module.exports = { qualityCheck };
