const fs = require('fs');

let content = fs.readFileSync('scripts/post-article.js', 'utf8');

// Bypass API Key check
content = content.replace(
    /if \(\!apiKey\) \{[\s\S]*?process\.exit\(1\);[\s\S]*?\}/,
    'if (!apiKey) { console.log("Using Mock API mode because GEMINI_API_KEY is missing"); }'
);

// Replace generateContentWithRetry with mock
const mockFunction = `
  async function generateContentWithRetry(prompt, retries = 4, delayMs = 10000) {
    console.log("Mocking Gemini API generation for regression test...");
    
    if (prompt.includes("social media manager")) {
        return {
            response: {
                text: () => \`---INSTAGRAM---\\nTest Instagram Caption\\n---FACEBOOK---\\nTest Facebook Post\\n---LINKEDIN---\\nTest LinkedIn Post\\n---END---\`
            }
        };
    }
    
    return {
      response: {
        text: () => \`---TITLE---\\nRegression Test: Will The Indian Market Crash in 2026?\\n---META---\\nA comprehensive analysis of the Indian market conditions in 2026.\\n---SUMMARY---\\nAnalyzing key indicators to determine if a market correction is imminent.\\n---TAKEAWAYS---\\n• Market valuations remain stretched.\\n• FII inflows are stabilizing.\\n• Focus on quality midcaps.\\n---STAT---\\n15%|Expected Earnings Growth\\n---BODY---\\n<h2>Market Context</h2>\\n<p>This is a simulated article body generated during the regression test to prove that the CSS and DOM structure are preserved perfectly. The Indian market remains a focal point for global investors.</p>\\n<h2>Key Risks</h2>\\n<p>Understanding valuation premiums is crucial.</p>\\n---FAQ1Q---\\nWill the market crash?\\n---FAQ1A---\\nCorrections are normal, but a full crash is unlikely given domestic liquidity.\\n---FAQ2Q---\\nWhere should I invest?\\n---FAQ2A---\\nDiversified mutual funds remain the safest bet.\\n---SLIDES---\\n[]\\n---END---\`
      }
    };
  }
`;

content = content.replace(
    /async function generateContentWithRetry\([\s\S]*?\}[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}[\s\S]*?\}/,
    mockFunction
);

fs.writeFileSync('scripts/post-article-test.js', content, 'utf8');
