const stateManager = require('./state-manager.js');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { validateSocialContent } = require("./content-quality-gate.js");

// --- CONFIG ---
const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, "..");
const CALENDAR_PATH = path.join(ROOT, "content_calendar.md");
const INSIGHTS_PATH = path.join(ROOT, "insights.html");
const TEMPLATE_PATH = path.join(ROOT, "sample-insight.html");
const STAGING_DIR = path.join(ROOT, ".staging");
const PENDING_PATH = path.join(ROOT, ".pending_article.json");

if (!fs.existsSync(STAGING_DIR)) fs.mkdirSync(STAGING_DIR);

// --- GLOBAL STATE TRACKING ---
const runId = crypto.randomUUID();
let currentTopic = "UNKNOWN";
let expectedSlug = "UNKNOWN";
let currentState = "INITIALIZING";
let attempts = 0;
let lastErrorClass = "NONE";

// --- AI PROVIDER ABSTRACTION ---
class TextGenerationProvider {
    async generateContent(prompt) { throw new Error("Not implemented"); }
    get providerName() { return "UNKNOWN"; }
    get modelName() { return "UNKNOWN"; }
}

class GeminiTextProvider extends TextGenerationProvider {
    constructor(apiKey, modelName) {
        super();
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: modelName });
        this._modelName = modelName;
    }
    async generateContent(prompt) {
        const result = await this.model.generateContent(prompt);
        return result.response.text();
    }
    get providerName() { return "gemini_paid"; }
    get modelName() { return this._modelName; }
}

class OpenAITextProvider extends TextGenerationProvider {
    constructor(apiKey, modelName) {
        super();
        this.apiKey = apiKey;
        this._modelName = modelName;
    }
    async generateContent(prompt) {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this._modelName,
                messages: [{ role: "user", content: prompt }]
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`OpenAI API Error (HTTP ${response.status}): ${data.error?.message || JSON.stringify(data)}`);
        }
        if (!data.choices || data.choices.length === 0) {
            throw new Error("OpenAI returned no text choices.");
        }
        return data.choices[0].message.content;
    }
    get providerName() { return "openai"; }
    get modelName() { return this._modelName; }
}

let aiProvider = null; // Global for ledger access

function printLedger(finalResult) {
    console.log("\n======================================");
    console.log("[PIPELINE FINAL RESULT]");
    if (currentState === "DEFERRED") {
        console.log(`Status: DEFERRED`);
        console.log(`Reason: AI provider temporarily unavailable`);
        console.log(`Publication: NOT PUBLISHED`);
        console.log(`Topic state: NOT ADVANCED`);
        console.log(`Model: ${aiProvider ? aiProvider.modelName : "UNKNOWN"}`);
    } else {
        console.log(`RUN ID: ${runId}`);
        console.log(`TOPIC: ${currentTopic}`);
        console.log(`EXPECTED SLUG: ${expectedSlug}`);
        console.log(`FINAL STATE: ${currentState}`);
        console.log(`AI PROVIDER: ${aiProvider ? aiProvider.providerName : "UNKNOWN"}`);
        console.log(`AI MODEL: ${aiProvider ? aiProvider.modelName : "UNKNOWN"}`);
        console.log(`ATTEMPTS: ${attempts}`);
        console.log(`LAST ERROR: ${lastErrorClass}`);
        console.log(`RESULT: ${finalResult}`);
    }
    console.log("======================================\n");
}

function exitSafely(code, resultMessage) {
    if (code !== 0) console.error(`\n❌ ${resultMessage}`);
    else console.log(`\n✅ ${resultMessage}`);
    
    printLedger(resultMessage);
    process.exit(code);
}

const EMOJI_MAP = {
  "Indian Market": "📈", "US Market": "🇺🇸", "IPO": "🚀", "Behavioral Finance": "🧠",
  "Book": "📚", "Princes of Yen": "💴", "CAN SLIM": "📊", "Trading": "💹",
  "Historical": "🏛️", "SIP": "💰", "Psychology": "🧘", "Zone": "🎯",
  "Best Loser": "🏆", "Options": "⚙️", "SEBI": "⚖️", "Company": "🏢",
  "Bubble": "⚠️", "Crypto": "₿", "China": "🇨🇳", "World Economy": "🌍", "10-20 years": "🔭",
};

function getEmoji(topic) {
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (topic.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return "💡";
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().substring(0, 60);
}

function getNextTopic() {
  const calendar = fs.readFileSync(CALENDAR_PATH, "utf-8");
  const lines = calendar.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].trim().match(/^- \[ \] (.+)$/);
    if (match) return { topic: match[1].replace(/^\d+\.\s*/, "").trim(), lineIndex: i, lines };
  }
  return null;
}

function isHtmlComplete(htmlString) {
  return htmlString.includes("</html>") || htmlString.includes("</body>");
}

function buildArticleHTML(title, metaDescription, date, bodyHTML, faqSchema, slug, imageUrl, topic) {
  const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
  return template
    .replace(/(<title>).*?(<\/title>)/, `$1${title} | TrustPointFin Insights$2`)
    .replace(/(<meta name="description" content=").*?(")/, `$1${metaDescription}$2`)
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, `<script type="application/ld+json">\n    ${faqSchema}\n    </script>`)
    .replace(/<header class="article-header">[\s\S]*?<\/header>/, `<header class="article-header">\n            <h1>${title}</h1>\n            <div class="article-meta">Published on ${date} • By TrustPoint Finance Research</div>\n            <img src="${imageUrl}" alt="${topic}" style="width:100%; height:auto; max-height:400px; object-fit:cover; border-radius:12px; margin-top:2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">\n        </header>`)
    .replace(/<article class="article-content">[\s\S]*?<\/article>/, `<article class="article-content">\n${bodyHTML}\n        </article>`);
}

function updateInsightsAtomic(title, slug, date, summary, imageUrl, topic) {
  const insightsHTML = fs.readFileSync(INSIGHTS_PATH, "utf-8");
  const newCard = `
            <!-- Auto-generated article -->
            <a href="${slug}.html" class="insight-card">
                <div class="insight-thumb" style="background:none;">
                    <img src="${imageUrl}" alt="${topic}" style="width:100%; height:100%; object-fit:cover; position:absolute; top:0; left:0; z-index:0;">
                </div>
                <div class="insight-content">
                    <div class="insight-meta">${date} • 6 min read</div>
                    <h3>${title}</h3>
                    <p>${summary}</p>
                    <span class="read-more">Read Insight &rarr;</span>
                </div>
            </a>
`;
  const updated = insightsHTML.replace(/(<div class="insights-grid">)/, `$1\n${newCard}`);
  const tmpPath = path.join(STAGING_DIR, "insights.tmp.html");
  fs.writeFileSync(tmpPath, updated, "utf-8");
  return tmpPath;
}

function updateSitemapAtomic(slug) {
  const sitemapPath = path.join(ROOT, "sitemap.xml");
  let sitemapXML = fs.readFileSync(sitemapPath, "utf-8");
  const newUrlBlock = `
    <url>
        <loc>https://trustpointfin.org/${slug}.html</loc>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
</urlset>`;
  sitemapXML = sitemapXML.replace(/<\/urlset>/i, newUrlBlock);
  const tmpPath = path.join(STAGING_DIR, "sitemap.tmp.xml");
  fs.writeFileSync(tmpPath, sitemapXML, "utf-8");
  return tmpPath;
}

function classifyError(safeMessage) {
    const msg = safeMessage.toLowerCase();
    if (msg.includes(" 429") || msg.includes("too many requests")) return "TRANSIENT_429";
    if (msg.includes("503") || msg.includes("500") || msg.includes("502") || msg.includes("504") || msg.includes("overloaded") || msg.includes("high demand") || msg.includes("server error")) return "TRANSIENT_SERVER";
    if (msg.includes("fetch failed") || msg.includes("network") || msg.includes("timeout") || msg.includes("econnreset")) return "TRANSIENT_NETWORK";
    
    if (msg.includes("400")) return "PERMANENT_BAD_REQUEST";
    if (msg.includes("401") || msg.includes("403") || msg.includes("invalid_api_key")) return "PERMANENT_AUTH";
    if (msg.includes("404")) return "PERMANENT_NOT_FOUND";
    
    return "UNKNOWN";
}

async function main() {
  
  stateManager.handleStalePending();

  // 1. STATE: SELECTED
  currentState = "SELECTED";


  const result = getNextTopic();
  if (!result) exitSafely(0, "All topics in the content calendar are complete!");

  currentTopic = result.topic;
  expectedSlug = slugify(currentTopic);
  const { lineIndex } = result;
  
  const { isDuplicate } = stateManager.initNewJob(currentTopic, lineIndex);
  if (isDuplicate) {
      console.log("⏭️ Job already successfully published. Skipping.");
      process.exit(0);
  }
  console.log(`📝 STATE: [SELECTED] - Topic: "${currentTopic}"`);

  // --- 2. DURABLE RECOVERY & IDEMPOTENCY ---
  const finalHtmlPath = path.join(ROOT, `${expectedSlug}.html`);
  const stagedHtmlPath = path.join(STAGING_DIR, `${expectedSlug}.tmp.html`);
  const stagedPendingPath = path.join(STAGING_DIR, `.pending_article.json`);

  // Recovery Scenario: COMMITTED BUT INCOMPLETE (Calendar is [ ], but HTML exists in repo root)
  if (fs.existsSync(finalHtmlPath)) {
      const existingHtml = fs.readFileSync(finalHtmlPath, "utf-8");
      if (isHtmlComplete(existingHtml)) {
          console.log(`\n[RECOVERY] Found complete ${expectedSlug}.html in repository root.`);
          console.log("This indicates Git Push succeeded previously but confirm-publish failed.");
          stateManager.updateState({ website_status: 'SUCCESS' });
          
          const titleMatch = existingHtml.match(/<title>(.*?) \| TrustPointFin Insights<\/title>/);
          const existingTitle = titleMatch ? titleMatch[1] : currentTopic;
          
          stateManager.updateState({ filename: expectedSlug + '.html', title: existingTitle, website_status: 'SUCCESS' });
          exitSafely(0, "Restaged PENDING state from existing repository HTML.");
      } else {
          console.log(`\n[WARNING] Found INCOMPLETE ${expectedSlug}.html in repository. Purging it.`);
          fs.unlinkSync(finalHtmlPath);
      }
  }

  // Recovery Scenario: STAGED NOT COMMITTED (Restored from GH Actions Cache)
  if (fs.existsSync(stagedHtmlPath) && fs.existsSync(stagedPendingPath)) {
      const stagedHtml = fs.readFileSync(stagedHtmlPath, "utf-8");
      const stagedPending = JSON.parse(fs.readFileSync(stagedPendingPath, "utf-8"));

      if (stagedPending.topic !== currentTopic || stagedPending.filename !== (expectedSlug + ".html")) {
          console.log(`\n[WARNING] Found STALE staging cache for unrelated topic "${stagedPending.topic}". Purging.`);
          fs.rmSync(STAGING_DIR, { recursive: true, force: true });
          fs.mkdirSync(STAGING_DIR);
      } else if (isHtmlComplete(stagedHtml)) {
          console.log(`\n[RECOVERY] Found complete ${expectedSlug}.tmp.html in .staging cache.`);
          console.log("This indicates Gemini succeeded previously but runner died before Git Push.");
          stateManager.updateState({ website_status: 'SUCCESS' });
          
          fs.renameSync(stagedHtmlPath, finalHtmlPath);
          fs.renameSync(stagedPendingPath, PENDING_PATH);
          
          if (fs.existsSync(path.join(STAGING_DIR, "insights.tmp.html"))) fs.renameSync(path.join(STAGING_DIR, "insights.tmp.html"), INSIGHTS_PATH);
          if (fs.existsSync(path.join(STAGING_DIR, "sitemap.tmp.xml"))) fs.renameSync(path.join(STAGING_DIR, "sitemap.tmp.xml"), path.join(ROOT, "sitemap.xml"));
          
          exitSafely(0, "Restored STAGED files to repository. Ready for Git Push.");
      } else {
          console.log(`\n[WARNING] Found INCOMPLETE ${expectedSlug}.tmp.html in .staging. Purging.`);
          fs.unlinkSync(stagedHtmlPath);
      }
  }

  // 3. STATE: GENERATING
  currentState = "GENERATING";
  
  const providerType = (process.env.AI_TEXT_PROVIDER || "openai").toLowerCase();

  let paidModelName;
  if (providerType === "openai") {
      const apiKeyToUse = process.env.OPENAI_API_KEY;
      if (!apiKeyToUse) {
          lastErrorClass = "PERMANENT_AUTH";
          exitSafely(1, "OPENAI_API_KEY is not set!");
      }
      const model = process.env.OPENAI_TEXT_MODEL || "gpt-5.6-luna";
      aiProvider = new OpenAITextProvider(apiKeyToUse, model);
      paidModelName = model;
  } else {
      const apiKeyToUse = process.env.GEMINI_API_KEY;
      if (!apiKeyToUse) {
          lastErrorClass = "PERMANENT_AUTH";
          exitSafely(1, "GEMINI_API_KEY is not set!");
      }
      const model = process.env.GEMINI_PAID_MODEL || "gemini-3.8-flash";
      aiProvider = new GeminiTextProvider(apiKeyToUse, model);
      paidModelName = model;
  }
  const primaryModel = aiProvider;

  console.log("\n[AI CONFIG]");
  console.log(`Provider: ${aiProvider.providerName}`);
  console.log(`Model: ${aiProvider.modelName}`);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const articlePrompt = `You are a senior financial analyst and content writer for TrustPointFin, an Indian financial advisory and Demat account referral platform. 

Write a detailed, high-quality financial insights article about: "${currentTopic}"

TARGET AUDIENCE & LANGUAGE (CRITICAL):
- Audience: Hindi-speaking Indian beginners.
- Language: Natural conversational Hindi/Hinglish throughout the ENTIRE MAIN BODY (not just slides).
- Use Devanagari Hindi naturally for explanations (e.g. "Stock market में निवेश करने से पहले...").
- Keep standard financial terms in English (e.g., Stock, Market, Return, Interest, Inflation, Investment, Debt, Equity, CAGR, Rule of 72). Do NOT translate these awkwardly.
- The tone should feel like a knowledgeable Indian educator speaking naturally. Avoid pure English walls of text.

STRUCTURE & FORMATTING (CRITICAL):
- Write for HIGH INFORMATION VALUE + HIGH SCANNABILITY. 
- AVOID "walls of text". Prefer 1-3 sentences per paragraph maximum.
- Break explanations down using bullet points (<ul>), numbered steps (<ol>), and comparison tables (<table>) where useful.
- Use simple examples. For numerical concepts, show the calculation clearly.
- Preferred flow per concept: Concept -> Simple Example -> Calculation -> Interpretation -> Takeaway.

BEGINNER EDUCATION:
- Explain what it means, show practical interpretation, and mention limitations/caveats.
- SEPARATE ASSUMPTIONS: For every numerical example, make it clear if it is a formula, an assumption, an illustration, or an actual outcome.
- RULE OF 72: NEVER present it as exact. Avoid "सटीक जवाब" or "exact answer". You MUST use "≈" and words like "एक आसान अनुमान" or "लगभग कितने साल". Format it like: "72 ÷ annual return (%) ≈ approximate doubling time".
- HYPOTHETICAL RETURNS: Never present them as expected or guaranteed. DO NOT write "Equity Fund (12%): 72 ÷ 12 = 6 साल". Instead, explicitly label it: "यदि annual return 12% मानें: 72 ÷ 12 ≈ 6 साल" or "Illustrative 12% annual return". Add "Actual returns vary." Do not imply equity predictably delivers 12%.
- INFLATION: Avoid absolute/sensational wording like "महंगाई आपके पैसे को आधा कर रही है". Prefer "महंगाई आपकी Purchasing Power घटाती है" and "6% inflation पर purchasing power लगभग 12 साल में आधी हो सकती है".

FINANCIAL SAFETY & COMPLIANCE:
- NEVER generate guaranteed-return claims, "sure-shot", "risk-free return", "निश्चित लाभ", "पक्का profit", or exact future-return claims.
- However, legitimate educational negations like "यह actual return की guarantee नहीं देता" MUST be used to teach beginners about market risks.

SEO & MISC:
- Include a strong SEO meta description (max 160 chars).
- Include one impressive statistic in a callout box (format: STAT_NUMBER|STAT_LABEL).
- Mention Angel One only when contextually relevant.
- CRITICAL: Do not use LaTeX or MathJax. Write formulas simply as plain text.

  QUALITY TARGETS:
  - Your response MUST target Content: 9+/10, Accuracy: 9+/10, Visual suitability: 9+/10, Readability: 9+/10.

  Return your response in EXACTLY this format (use the delimiters exactly):
  ---TITLE---
  Your article title here
  ---META---
  Your 160-char meta description here
  ---SUMMARY---
  One sentence summary for the article card (max 120 chars)
  ---TAKEAWAYS---
  • Takeaway 1
  • Takeaway 2
  ---STAT---
  150M+|Active Demat Accounts in India
  ---BODY---
  <h2>Section 1 Title</h2>
  <p>Short conversational Hinglish paragraph here...</p>
  <ul>
    <li><strong>Bullet Point:</strong> Explanation...</li>
  </ul>
  <table>...</table>
  ---FAQ1Q---
  First frequently asked question
  ---FAQ1A---
  Detailed answer to first FAQ
  ---FAQ2Q---
  Second frequently asked question  
  ---FAQ2A---
  Detailed answer to second FAQ
  ---END---`;

  let articleText = "";
  const maxRetries = 3;
  let success = false;
  let correctionContext = "";

  
  stateManager.updateState({ article_generation_status: 'GENERATING' });

  for (let i = 0; i < maxRetries; i++) {
      try {
          console.log(`\n[AI REQUEST] Generation Attempt ${i + 1}/${maxRetries}`);
          
          let currentPrompt = articlePrompt;
          if (correctionContext) {
              stateManager.updateState({ article_correction_attempts: i });
              console.log("[AUTO-CORRECTION] Sending compliance feedback to AI...");
              currentPrompt += `\n\nCRITICAL COMPLIANCE FEEDBACK FROM PREVIOUS ATTEMPT:\n${correctionContext}\nRewrite the violating section while preserving the factual meaning. Return the complete article.\n---END---`;
          }

          let resultText;
          if (process.env.TEST_MOCK_ARTICLE_TEXT) {
              resultText = process.env.TEST_MOCK_ARTICLE_TEXT;
          } else {
              resultText = await aiProvider.generateContent(currentPrompt);
          }
          
          articleText = resultText;
          if (!articleText || articleText.trim().length < 500 || !articleText.includes("---TITLE---") || !articleText.includes("---BODY---")) {
              throw new Error("Model returned empty, invalid, or malformed schema output.");
          }

          stateManager.updateState({ article_compliance_status: 'AUDITING' });
          console.log("\n🔍 Running content quality gate checks...");
          const validationResult = await validateSocialContent(articleText);
          
          if (!validationResult.valid) {
              console.log(`[WARNING] Compliance Gate Failed: ${validationResult.reason}`);
              if (i < maxRetries - 1) {
                  correctionContext = `Rule violated: ${validationResult.rule || validationResult.reason}\nProblematic text: ${validationResult.offending_text || 'Unknown'}`;
                  continue;
              } else {
                  stateManager.updateState({ article_compliance_status: 'FAILED', failure_reason: `Quality Gate failed after 3 attempts: ${validationResult.reason}` });
                  console.error(`❌ Content Quality Gate Rejected the Article permanently: ${validationResult.reason}`);
                  process.exit(1);
              }
          }
          
          stateManager.updateState({ article_compliance_status: 'SUCCESS', article_generation_status: 'SUCCESS' });
          console.log("✅ Quality gate passed successfully.");
          success = true;
          break;
      } catch (error) {
          console.log(`[ERROR] ${error.message}`);
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

  // --- Parse the response ---
  function extract(text, startTag, endTag) {
    const start = text.indexOf(startTag) + startTag.length;
    const end = endTag ? text.indexOf(endTag, start) : text.length;
    return text.slice(start, end).trim();
  }

  const title = extract(articleText, "---TITLE---", "---META---");
  const meta = extract(articleText, "---META---", "---SUMMARY---");
  const summary = extract(articleText, "---SUMMARY---", "---TAKEAWAYS---");
  const takeawaysRaw = extract(articleText, "---TAKEAWAYS---", "---STAT---");
  const statRaw = extract(articleText, "---STAT---", "---BODY---");
  const body = extract(articleText, "---BODY---", "---FAQ1Q---");
  const faq1q = extract(articleText, "---FAQ1Q---", "---FAQ1A---");
  const faq1a = extract(articleText, "---FAQ1A---", "---FAQ2Q---");
  const faq2q = extract(articleText, "---FAQ2Q---", "---FAQ2A---");
  const faq2a = extract(articleText, "---FAQ2A---", "---END---");
  
  const [statNum, statLabel] = statRaw.includes("|") ? statRaw.split("|") : ["📊", statRaw];

  const takeawayItems = takeawaysRaw
    .split("\n")
    .filter((l) => l.trim().startsWith("•"))
    .map((l) => `<li>${l.replace("•", "").trim()}</li>`)
    .join("\n                    ");

  const fullBodyHTML = `
            <!-- GEO Element: Key Takeaways -->
            <div class="geo-takeaways">
                <h3>Key Takeaways</h3>
                <ul>
                    ${takeawayItems}
                </ul>
            </div>

            ${body}

            <!-- GEO Element: Stat Box -->
            <div class="geo-stat">
                <span class="stat-number">${statNum.trim()}</span>
                <span class="stat-text">${statLabel.trim()}</span>
            </div>

            <!-- Sticky CTA -->
            <div style="text-align: center; margin: 4rem 0;">
                <a href="https://a.aonelink.in/ANGOne/8Xovqg1" target="_blank" class="btn btn-primary" style="font-size: 1.2rem; padding: 1rem 3rem;">Start Investing with Angel One Today</a>
            </div>

            <!-- GEO Element: FAQ Schema Visual Representation -->
            <section class="geo-faq">
                <h2>Frequently Asked Questions</h2>
                <div class="faq-item">
                    <h3>${faq1q}</h3>
                    <p>${faq1a}</p>
                </div>
                <div class="faq-item">
                    <h3>${faq2q}</h3>
                    <p>${faq2a}</p>
                </div>
            </section>`;

  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: faq1q, acceptedAnswer: { "@type": "Answer", text: faq1a } },
      { "@type": "Question", name: faq2q, acceptedAnswer: { "@type": "Answer", text: faq2a } },
    ],
  }, null, 2);

  // --- Image Generation (Unsplash API) ---
  let imageUrl = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop"; 
  if (process.env.UNSPLASH_API_KEY) {
    try {
      console.log(`📸 Fetching premium image from Unsplash API for topic: ${currentTopic}...`);
      let unsplashRes = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(currentTopic + " finance business")}&orientation=landscape&client_id=${process.env.UNSPLASH_API_KEY}`);
      if (unsplashRes.status === 404) unsplashRes = await fetch(`https://api.unsplash.com/photos/random?query=finance,stock-market&orientation=landscape&client_id=${process.env.UNSPLASH_API_KEY}`);
      
      if (unsplashRes.ok) {
        const data = await unsplashRes.json();
        imageUrl = data.urls.regular; 
      } else {
        console.log(`⚠️ Unsplash API Error: ${unsplashRes.status}. Using fallback image.`);
      }
    } catch (err) {
      console.log(`⚠️ Unsplash network error: ${err.message}. Using fallback image.`);
    }
  }

  const articleHTML = buildArticleHTML(title, meta, dateStr, fullBodyHTML, faqSchema, expectedSlug, imageUrl, currentTopic);

  // 6. STATE: STAGED (Atomic Writes)
  stateManager.updateState({ website_status: 'PUBLISHING' });
  console.log("\n📦 Performing Atomic Writes to staging...");
  
  fs.writeFileSync(stagedHtmlPath, articleHTML, "utf-8");
  const tmpInsights = updateInsightsAtomic(title, expectedSlug, dateStr, summary, imageUrl, currentTopic);
  const tmpSitemap = updateSitemapAtomic(expectedSlug);
  
  stateManager.updateState({ filename: expectedSlug + '.html', title: title });
    // ATOMIC MOVE TO REPO ROOT
    fs.renameSync(stagedHtmlPath, finalHtmlPath);
    fs.renameSync(tmpInsights, INSIGHTS_PATH);
    fs.renameSync(tmpSitemap, path.join(ROOT, 'sitemap.xml'));
  
  stateManager.updateState({ website_status: 'SUCCESS' });
  exitSafely(0, `Article "${title}" staged atomically. Ready for Git Commit.`);
}

main().catch((err) => {
  lastErrorClass = "UNHANDLED_EXCEPTION";
  exitSafely(1, err.message || String(err));
});
