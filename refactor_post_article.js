const fs = require('fs');

const FILE_PATH = 'scripts/post-article.js';
let content = fs.readFileSync(FILE_PATH, 'utf-8');

// 1. Remove SLIDES prompt instructions
content = content.replace(/CAROUSEL SLIDES:[\s\S]*?---END---`/, `---END---\`;`);

// 2. Wrap generation and validation in an auto-correction loop
const generationRegex = /let articleText = "";[\s\S]*?console\.log\("✅ Quality gate passed successfully\."\);/g;

const autoCorrectionLoop = `
  let articleText = "";
  const maxRetries = 3;
  let success = false;
  let correctionContext = "";

  const stateManager = require('./state-manager.js');
  stateManager.updateState({ article_generation_status: 'GENERATING' });

  for (let i = 0; i < maxRetries; i++) {
      try {
          console.log(\`\\n[AI REQUEST] Generation Attempt \${i + 1}/\${maxRetries}\`);
          
          let currentPrompt = articlePrompt;
          if (correctionContext) {
              stateManager.updateState({ article_correction_attempts: i });
              console.log("[AUTO-CORRECTION] Sending compliance feedback to AI...");
              currentPrompt += \`\\n\\nCRITICAL COMPLIANCE FEEDBACK FROM PREVIOUS ATTEMPT:\\n\${correctionContext}\\nRewrite the violating section while preserving the factual meaning. Return the complete article.\\n---END---\`;
          }

          let resultText;
          if (process.env.TEST_MOCK_ARTICLE_TEXT) {
              resultText = process.env.TEST_MOCK_ARTICLE_TEXT;
          } else {
              const result = await primaryModel.generateContent(currentPrompt);
              resultText = result.response.text();
          }
          
          articleText = resultText;
          if (!articleText || articleText.trim().length < 500 || !articleText.includes("---TITLE---") || !articleText.includes("---BODY---")) {
              throw new Error("Model returned empty, invalid, or malformed schema output.");
          }

          stateManager.updateState({ article_compliance_status: 'AUDITING' });
          console.log("\\n🔍 Running content quality gate checks...");
          const validationResult = await validateSocialContent(articleText);
          
          if (!validationResult.valid) {
              console.log(\`[WARNING] Compliance Gate Failed: \${validationResult.reason}\`);
              if (i < maxRetries - 1) {
                  correctionContext = \`Rule violated: \${validationResult.rule || validationResult.reason}\\nProblematic text: \${validationResult.offending_text || 'Unknown'}\`;
                  continue;
              } else {
                  stateManager.updateState({ article_compliance_status: 'FAILED', failure_reason: \`Quality Gate failed after 3 attempts: \${validationResult.reason}\` });
                  console.error(\`❌ Content Quality Gate Rejected the Article permanently: \${validationResult.reason}\`);
                  process.exit(1);
              }
          }
          
          stateManager.updateState({ article_compliance_status: 'SUCCESS', article_generation_status: 'SUCCESS' });
          console.log("✅ Quality gate passed successfully.");
          success = true;
          break;
      } catch (error) {
          console.log(\`[ERROR] \${error.message}\`);
          if (i === maxRetries - 1) {
              stateManager.updateState({ article_generation_status: 'FAILED', failure_reason: error.message });
              process.exit(1);
          }
          await new Promise(resolve => setTimeout(resolve, 5000)); // basic backoff
      }
  }

  if (!success) {
      process.exit(1);
  }
`;

content = content.replace(generationRegex, autoCorrectionLoop.trim());

// 3. Prevent duplicate runs at the very beginning
const mainFunctionRegex = /async function main\(\) \{/;
const duplicateProtection = `async function main() {
  const stateManager = require('./state-manager.js');
  stateManager.handleStalePending();
`;
content = content.replace(mainFunctionRegex, duplicateProtection);

// 4. Register the new job ID after getting next topic
const topicRegex = /const { expectedSlug, currentTopic, lineIndex } = getNextTopic\(\);/;
const initJob = `const { expectedSlug, currentTopic, lineIndex } = getNextTopic();
  const { isDuplicate } = stateManager.initNewJob(currentTopic, lineIndex);
  if (isDuplicate) {
      console.log("⏭️ Job already successfully published. Skipping.");
      process.exit(0);
  }`;
content = content.replace(topicRegex, initJob);

// 5. Update final states
content = content.replace(/currentState = "STAGING";/g, "stateManager.updateState({ website_status: 'PUBLISHING' });");
content = content.replace(/currentState = "STAGED";/g, "stateManager.updateState({ website_status: 'SUCCESS' });");

fs.writeFileSync(FILE_PATH, content, 'utf-8');
console.log("Refactoring complete.");
