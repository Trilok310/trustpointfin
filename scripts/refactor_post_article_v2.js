const fs = require('fs');
const path = require('path');

let postArticle = fs.readFileSync('scripts/post-article.js', 'utf8');

const oldSocialBlock = /\/\/ --- Generate Social Media Posts \([\s\S]*?console\.log\("Social media data saved successfully\."\);\n  }/;

const newSocialBlock = `// --- Generate Social Media Posts (V2 NotebookLM-Style) ---
  const socialPrompt = \`You are the Chief Financial Educator for TrustPointFin.

OBJECTIVE:
Create a highly dense, educational "Financial Mini-Lesson" for Instagram.
Do NOT create generic, empty, template-like motivational posts.
The post must be information-rich, visually structured, and answer: What, Why, How, Example, and Takeaway.

TEACHING FORMAT:
Choose the BEST dynamic format based on the topic:
- STORY (fictional characters + situation)
- MYTH VS REALITY (common belief vs truth)
- CALCULATION (numbers/formulas)
- COMPARISON (side-by-side)
- STEP-BY-STEP (process)
- CHECKLIST
- TIMELINE
- CONCEPT EXPLAINER

SLIDE STRUCTURE (6-9 slides):
Slide 1: Curiosity hook.
Slide 2: Context/Situation.
Slide 3: Core Explanation.
Slide 4: Numbers/Example/Chart.
Slide 5: Common mistake.
Slide 6: Takeaway/Checklist.

VISUAL STYLES AVAILABLE (Pick ONE for the whole post):
- STYLE 1 (Editorial)
- STYLE 2 (Illustrated Storytelling)
- STYLE 3 (Dashboard)
- STYLE 4 (Hand-drawn)
- STYLE 5 (Clean)

LANGUAGE:
Use natural Hinglish (Devanagari script + English financial terms). E.g. "Company अच्छी है — लेकिन क्या Stock सही Price पर है?"

OUTPUT FORMAT (RAW JSON ONLY):
{
  "topic": "\${topic}",
  "teaching_objective": "...",
  "format": "STORY|COMPARISON|CALCULATION|TIMELINE|CHECKLIST|QUIZ|EXPLAINER",
  "visual_style": "STYLE 1|STYLE 2|STYLE 3|STYLE 4|STYLE 5",
  "target_audience": "beginner",
  "language": "hinglish",
  "slides": [
    {
      "slide_number": 1,
      "purpose": "hook",
      "headline": "Main slide text",
      "body": "Subtext or explanation (keep concise)",
      "visual_type": "comparison|checklist|bignumber|calculation|story|chart|timeline|callout|quiz|none",
      "visual_description": "Instructions for visual. E.g. for checklist: Item 1 | Item 2 | Item 3. For comparison: Left | Right",
      "key_numbers": ["10%", "20%"],
      "chart_data": ["20", "50", "100"],
      "highlight": "word to highlight in accent color",
      "cta": null
    }
  ],
  "caption": "Instagram caption...",
  "hashtags": [],
  "compliance_notes": []
}

IMPORTANT RULES:
- Never promise guaranteed returns.
- Only promote Angel One on max 1 out of 20 posts. Most CTAs should be "Save this" or "Comment below".
- Ensure slides are dense with info but hierarchical (not just huge paragraphs). Use checklists, comparisons, and charts.

Generate the lesson for this topic: "\${topic}"\`;

  let socialJson = null;
  let attempts = 0;
  const MAX_ATTEMPTS = 3;

  while (attempts < MAX_ATTEMPTS && !socialJson) {
      attempts++;
      console.log(\`Generating V2 social content (Attempt \${attempts}/\${MAX_ATTEMPTS})...\`);
      try {
          const socialResponse = await generateContentWithRetry(socialPrompt);
          let rawText = socialResponse.response.text();
          rawText = rawText.replace(/\\\`\\\`\\\`json/g, '').replace(/\\\`\\\`\\\`/g, '').trim();
          
          const parsed = JSON.parse(rawText);
          
          // Quality Gate
          const { validateSocialContent } = require("./content-quality-gate.js");
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
      
      const socialMarkdown = \`# Social Media Posts (V2)
*Generated on \${dateStr} for topic: "\${topic}"*

---
## 📱 Caption
\${socialJson.caption}

---
*Format: \${socialJson.format} | Style: \${socialJson.visual_style}*
\`;
      fs.writeFileSync(SOCIAL_PATH, socialMarkdown, "utf-8");
      console.log("Social media data saved successfully.");
  }`;

postArticle = postArticle.replace(oldSocialBlock, newSocialBlock);

fs.writeFileSync('scripts/post-article.js', postArticle, 'utf8');
console.log('Successfully upgraded post-article.js to V2 prompt.');
