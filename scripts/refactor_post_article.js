const fs = require('fs');

let postArticle = fs.readFileSync('scripts/post-article.js', 'utf8');

// 1. Add quality gate require
postArticle = postArticle.replace('const path = require("path");', 'const path = require("path");\nconst { validateSocialContent } = require("./content-quality-gate.js");');

// 2. Modify articlePrompt (remove SLIDES generation)
const oldArticlePrompt = /After the article content, you MUST generate a JSON array of 3 to 10 slides(.|\n)*?---END---.*?$/m;
const newArticlePrompt = `
  After the article content, you MUST end with:
  ---END---`;
postArticle = postArticle.replace(oldArticlePrompt, newArticlePrompt);

// Also add constraints to articlePrompt
const articleConstraints = /The article should:([\s\S]*?)(After the article content|---END---)/;
const newConstraints = `The article should:
  - Be highly relevant to Indian retail investors in \${now.getFullYear()}
  - Include real data, statistics, and actionable insights
  - Have a strong SEO meta description (max 160 chars)
  - Include a Key Takeaways section (3-5 bullet points)
  - Have 3-4 main sections with H2 headings
  - Include one impressive statistic in a callout box (format: STAT_NUMBER|STAT_LABEL)
  - Mention Angel One only when contextually relevant (do not force it).
  - Do not promise returns or manufacture statistics.
  
  After the article content, you MUST end with:
  ---END---`;
postArticle = postArticle.replace(articleConstraints, newConstraints);

// 3. Remove old extraction of SLIDES
postArticle = postArticle.replace(/const slidesRaw = extract\(articleText, "---SLIDES---", "---END---"\);([\s\S]*?)catch \(e\) {[\s\S]*?}/, '');
postArticle = postArticle.replace(/const faq2a = extract\(articleText, "---FAQ2A---", "---SLIDES---"\);/, 'const faq2a = extract(articleText, "---FAQ2A---", "---END---");');

// 4. Update the Social Generation block
const oldSocialBlock = /\/\/ --- Generate Social Media Posts ---([\s\S]*?)console\.log\("o\. Social media captions saved to latest_social_media\.md"\);/;

const newSocialBlock = `// --- Generate Social Media Posts (Standalone & Quality Gated) ---
  const socialPrompt = \`You are the senior social-media editor for TrustPointFin, an Indian stock-market education brand.

Your job is NOT to advertise the article.
Your job is to create one genuinely useful piece of content that can stand alone on Instagram and Facebook.

AUDIENCE: Indian beginners and retail investors.

LANGUAGE:
Use natural Hindi in Devanagari mixed with common English finance words.
Examples: Stock, Market, Profit, Loss, Risk, Return, SIP, Equity, Portfolio, Valuation, Compounding, Chart.
Do not force translations such as Nivesh, Poonji, Laabhanash.
Do not write artificial Hinglish.

CONTENT PRINCIPLES:
- Teach ONE specific thing.
- Start with a strong curiosity-based hook.
- Prefer a surprising observation, mistake, comparison, calculation, myth, quiz or practical example.
- Make the first 1-2 lines strong enough to stop scrolling.
- Use concrete examples.
- Use numbers only when they are correct.
- Explain the "why", not just the definition.
- Make the reader feel smarter after reading.
- Give a natural reason to save/share/comment.
- Do not sound like a textbook, motivational speaker, or an AI chatbot.

NEVER:
- Use "game changer", "ultimate strategy", "secret", "massive wealth", "financial freedom" as generic filler.
- Use "क्या आप भी..." repeatedly.
- Start every post with a question.
- Stuff the post with emojis.
- End every post with a Demat-account CTA.
- Force Angel One into unrelated educational content.
- Give personalised buy/sell advice.
- Promise or imply guaranteed returns.
- Use fake statistics.
- Use a specific stock as a recommendation.

FORMAT SELECTION:
Choose the best format automatically:
- CAROUSEL for lists, comparisons, calculations and step-by-step explanations
- REEL for one powerful idea that can be explained in 20-45 seconds
- SINGLE_IMAGE for one strong fact, myth or calculation
- QUIZ for opinion/comparison questions
- STORY for polls/questions

Return JSON only (no markdown code blocks, just raw JSON):

{
  "format": "CAROUSEL",
  "content_pillar": "mistakes",
  "hook": "...",
  "caption": "...",
  "cta_type": "learn_more",
  "slides": [
    {
      "title": "...",
      "text": "...",
      "visual": "chart"
    }
  ],
  "reel_script": "...",
  "source_article_url": "..."
}

For a CAROUSEL:
- 5-7 slides.
- Slide 1 = hook only.
- Middle slides = explanation.
- Final slide = useful takeaway or question.
- Keep each slide readable on a phone. Avoid paragraphs.

CTA RULE:
Most posts should NOT promote Angel One. Only ~1 in 20 posts should be a direct conversion post.
Educational CTA examples: "Save this for later.", "Comment A/B/C.", "Which one surprised you?"

Topic: "\${topic}"
Article Title: "\${title}"
\`;

  let socialJson = null;
  let attempts = 0;
  const MAX_ATTEMPTS = 3;

  while (attempts < MAX_ATTEMPTS && !socialJson) {
      attempts++;
      console.log(\`Generating social content (Attempt \${attempts}/\${MAX_ATTEMPTS})...\`);
      try {
          const socialResponse = await generateContentWithRetry(socialPrompt);
          let rawText = socialResponse.response.text();
          rawText = rawText.replace(/\\\`\\\`\\\`json/g, '').replace(/\\\`\\\`\\\`/g, '').trim();
          
          const parsed = JSON.parse(rawText);
          
          // Run Quality Gate
          const qgResult = validateSocialContent(parsed);
          if (qgResult.valid) {
              socialJson = parsed;
              console.log("Quality Gate PASSED!");
          } else {
              console.log("Quality Gate FAILED:", qgResult.reason);
          }
      } catch (e) {
          console.log("JSON parsing or generation error:", e.message);
      }
  }

  if (!socialJson) {
      console.error("Failed to generate valid social content after 3 attempts. Skipping social publishing.");
  } else {
      fs.writeFileSync(path.join(ROOT, "latest_slides.json"), JSON.stringify(socialJson, null, 2), "utf-8");
      
      const socialMarkdown = \`# Social Media Posts
*Generated on \${dateStr} for article: "\${title}"*

---

## 📱 Caption

\${socialJson.caption}

---
*Format: \${socialJson.format}*
*Article URL: https://trilok310.github.io/trustpointfin/\${slug}.html*
\`;

      fs.writeFileSync(SOCIAL_PATH, socialMarkdown, "utf-8");
      console.log("Social media data saved successfully.");
  }
`;

postArticle = postArticle.replace(oldSocialBlock, newSocialBlock);

fs.writeFileSync('scripts/post-article.js', postArticle, 'utf8');
console.log('Successfully rewrote scripts/post-article.js');
