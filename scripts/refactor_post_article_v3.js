const fs = require('fs');
const path = require('path');

let postArticle = fs.readFileSync('scripts/post-article.js', 'utf8');

const oldPromptRegex = /\/\/ --- Generate Social Media Posts \(V2 NotebookLM-Style\) ---[\s\S]*?console\.log\("Social media data saved successfully\."\);\n  \}/;

const newPrompt = `// --- Generate Social Media Posts (V3 Ultra-Dense NotebookLM-Style) ---
  const socialPrompt = \`You are the Chief Financial Educator for TrustPointFin.

OBJECTIVE:
Create an ultra-dense, highly explanatory "Financial Mini-Lesson" for Instagram, inspired by NotebookLM infographics.
DO NOT create minimalist, sparse cards with just a title and empty space. 
Every slide must be a complete mini-article containing: Title, Core Explanation, Visual/Diagram, Example, and Annotation/Takeaway.

TEACHING FORMAT (Pick ONE):
- STORY (fictional characters + situation)
- MYTH VS REALITY
- CALCULATION (numbers/formulas)
- COMPARISON
- STEP-BY-STEP
- CONCEPT EXPLAINER

SLIDE STRUCTURE (6-9 slides):
A viewer must be able to swipe through and learn the concept COMPLETELY without visiting the website. Include deep dive details, calculations, metaphors, and checklists.

LANGUAGE:
Use natural Hinglish (Devanagari script + English financial terms).

OUTPUT FORMAT (RAW JSON ONLY):
{
  "topic": "\${topic}",
  "teaching_objective": "...",
  "format": "STORY|COMPARISON|CALCULATION|TIMELINE|CHECKLIST|QUIZ|EXPLAINER",
  "visual_style": "STYLE 1|STYLE 2|STYLE 3|STYLE 4|STYLE 5",
  "slides": [
    {
      "slide_number": 1,
      "purpose": "context",
      "headline": "Main slide text",
      "core_explanation": "A deep, educational explanation of the concept (2-3 sentences max).",
      "visual_type": "comparison|checklist|calculation|story|chart|timeline|diagram|none",
      "visual_description": "Data for the visual (e.g. Left | Right)",
      "example_box": "A concrete numerical or real-world example.",
      "annotation": "A small tip, warning, or key takeaway.",
      "key_numbers": ["10%", "20%"],
      "chart_data": ["20", "50", "100"],
      "highlight": "word to highlight",
      "cta": null
    }
  ],
  "caption": "Instagram caption..."
}

IMPORTANT: Ensure the 'core_explanation', 'example_box', and 'annotation' fields are all filled where appropriate to create information-rich slides.\`;

  let socialJson = null;
  let attempts = 0;
  const MAX_ATTEMPTS = 3;

  while (attempts < MAX_ATTEMPTS && !socialJson) {
      attempts++;
      console.log(\`Generating V3 ultra-dense social content (Attempt \${attempts}/\${MAX_ATTEMPTS})...\`);
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
      const socialMarkdown = \`# Social Media Posts (V3)\\n*Generated on \${dateStr} for topic: "\${topic}"*\\n\\n---\\n## 📱 Caption\\n\${socialJson.caption}\\n\`;
      fs.writeFileSync(SOCIAL_PATH, socialMarkdown, "utf-8");
      console.log("Social media data saved successfully.");
  }`;

postArticle = postArticle.replace(oldPromptRegex, newPrompt);
fs.writeFileSync('scripts/post-article.js', postArticle, 'utf8');
console.log('Successfully upgraded post-article.js to V3 Ultra-Dense prompt.');
