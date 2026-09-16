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

function printLedger(finalResult) {
    console.log("\n======================================");
    console.log("[PIPELINE FINAL RESULT]");
    console.log(`RUN ID: ${runId}`);
    console.log(`TOPIC: ${currentTopic}`);
    console.log(`EXPECTED SLUG: ${expectedSlug}`);
    console.log(`FINAL STATE: ${currentState}`);
    console.log(`AI PROVIDER: gemini_paid`);
    console.log(`AI MODEL: ${process.env.GEMINI_PAID_MODEL || "gemini-3.8-flash"}`);
    console.log(`ATTEMPTS: ${attempts}`);
    console.log(`LAST ERROR: ${lastErrorClass}`);
    console.log(`RESULT: ${finalResult}`);
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
    const match = lines[i].match(/^- \[ \] (.+)$/);
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
    if (msg.includes("429")) return "TRANSIENT_429";
    if (msg.includes("503") || msg.includes("500") || msg.includes("overloaded") || msg.includes("high demand")) return "TRANSIENT_503";
    if (msg.includes("fetch failed") || msg.includes("network") || msg.includes("timeout") || msg.includes("econnreset")) return "TRANSIENT_NETWORK";
    
    if (msg.includes("400")) return "PERMANENT_BAD_REQUEST";
    if (msg.includes("401") || msg.includes("403")) return "PERMANENT_AUTH";
    if (msg.includes("404")) return "PERMANENT_NOT_FOUND";
    
    return "UNKNOWN";
}

async function main() {
  // 1. STATE: SELECTED
  currentState = "SELECTED";
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
      lastErrorClass = "PERMANENT_AUTH";
      exitSafely(1, "GEMINI_API_KEY is not set!");
  }

  const result = getNextTopic();
  if (!result) exitSafely(0, "All topics in the content calendar are complete!");

  currentTopic = result.topic;
  expectedSlug = slugify(currentTopic);
  const { lineIndex } = result;
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
          currentState = "STAGED";
          
          const titleMatch = existingHtml.match(/<title>(.*?) \| TrustPointFin Insights<\/title>/);
          const existingTitle = titleMatch ? titleMatch[1] : currentTopic;
          
          const pendingState = {
              filename: expectedSlug + ".html", title: existingTitle, topic: currentTopic,
              lineIndex: lineIndex, publication_status: "PENDING", timestamp: new Date().toISOString()
          };
          fs.writeFileSync(PENDING_PATH, JSON.stringify(pendingState, null, 2), "utf-8");
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
          currentState = "STAGED";
          
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
  const paidModelName = process.env.GEMINI_PAID_MODEL || "gemini-3.8-flash";
  const genAI = new GoogleGenerativeAI(apiKey);
  const primaryModel = genAI.getGenerativeModel({ model: paidModelName });

  console.log("\n[AI CONFIG]");
  console.log("Provider: gemini_paid");
  console.log(`Model: ${paidModelName}`);

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const articlePrompt = `You are a senior financial analyst and content writer for TrustPointFin, an Indian financial advisory and Demat account referral platform. 

Write a detailed, GEO-optimized financial insights article about the following topic: "${currentTopic}"

The article should:
  - Be highly relevant to Indian retail investors in ${now.getFullYear()}
  - Include real data, statistics, and actionable insights
  - Have a strong SEO meta description (max 160 chars)
  - Include a Key Takeaways section (3-5 bullet points)
  - Have 3-4 main sections with H2 headings. Under each heading, use short educational statements.
  - Include one impressive statistic in a callout box (format: STAT_NUMBER|STAT_LABEL)
  - Mention Angel One only when contextually relevant.
  - Do not promise returns, manufacture statistics, or make absolute claims.
  - CRITICAL: Do not use LaTeX (e.g., \\frac), MathJax, or complex markdown math formatting. Write formulas simply as plain text.
  
  After the article content, you MUST end with:
  ---END---, you MUST generate a JSON array of 3 to 10 slides that will be automatically turned into an Instagram/Facebook carousel post.
  CRITICAL: The slides content MUST be written in actual Hindi (Devanagari script) mixed with English words. KEEP all common financial terms in pure English (Latin script) like "Invest", "Market", "Profit", "Loss", "Compounding", "Equity". DO NOT translate financial terms into Hindi.
Follow this exact JSON structure for the slides:
[
  {
    "type": "bg-image",
    "title": "Main heading. Use &lt;span class='highlight'&gt;keyword&lt;/span&gt; for emphasis.",
    "text": "The sub-text below the title",
    "image_query": "trading psychology"
  },
  {
    "type": "bg-analytical",
    "title": "Data heading",
    "text": "Context for the data",
    "chart": {
      "type": "bar",
      "labels": ["Yr 1", "Yr 2"],
      "datasets": [{"label": "Retail", "data": [5, 2]}]
    }
  },
  {
    "type": "bg-image",
    "title": "Ready to trade?",
    "text": "Execute strategies flawlessly.",
    "image_query": "success business",
    "is_cta": true
  }
]

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
<p>Paragraph content...</p>
---FAQ1Q---
First frequently asked question
---FAQ1A---
Detailed answer to first FAQ
---FAQ2Q---
Second frequently asked question  
---FAQ2A---
Detailed answer to second FAQ
---SLIDES---
[
  // Your JSON array of slides here
]
---END---`;

  let articleText = "";
  const maxRetries = 4;
  const baseDelayMs = 60000;
  let success = false;

  for (let i = 0; i < maxRetries; i++) {
    attempts++;
    try {
      console.log(`\n[AI REQUEST] Attempt ${attempts}/${maxRetries}`);
      const result = await primaryModel.generateContent(articlePrompt);
      console.log("[AI RESPONSE] HTTP status: 200 (Success)");
      articleText = result.response.text();
      success = true;
      break; // break retry loop
    } catch (error) {
      let safeMessage = error.stack || error.message || String(error);
      if (apiKey) safeMessage = safeMessage.split(apiKey).join("[REDACTED_API_KEY]");
      
      lastErrorClass = classifyError(safeMessage);

      console.log("\n[AI ERROR]");
      console.log(`Type: ${lastErrorClass}`);
      console.log(`Message: ${safeMessage}`);

      const isTransient = lastErrorClass.startsWith("TRANSIENT");
      
      if (isTransient && i < maxRetries - 1) {
        const jitter = Math.floor(Math.random() * 5000);
        const delayMs = baseDelayMs * Math.pow(2, i) + jitter;
        console.log(`[RETRY] Waiting ${Math.round(delayMs / 1000)}s before next attempt...`);
        await new Promise(res => setTimeout(res, delayMs));
      } else if (isTransient && i === maxRetries - 1) {
        exitSafely(1, "Gemini provider temporarily unavailable; pipeline halted safely without publication.");
      } else {
        exitSafely(1, `Permanent error encountered: ${lastErrorClass}. Pipeline halted.`);
      }
    }
  }

  if (!success) exitSafely(1, "Unreachable: Loop completed without success or exit.");

  // 4. STATE: GENERATED
  currentState = "GENERATED";
  if (!articleText || articleText.trim().length < 500 || !articleText.includes("---TITLE---") || !articleText.includes("---BODY---")) {
      lastErrorClass = "GENERATION_MALFORMED";
      exitSafely(1, "Model returned empty, invalid, or malformed schema output.");
  }

  // 5. STATE: QUALITY_CHECKED
  console.log("\n🔍 Running content quality gate checks...");
  const validationResult = await validateSocialContent(articleText);
  if (!validationResult.valid) {
      lastErrorClass = "QUALITY_GATE_FAILED";
      exitSafely(1, `Content Quality Gate Rejected the Article: ${validationResult.reason}`);
  }
  currentState = "QUALITY_CHECKED";
  console.log("✅ Quality gate passed successfully.");

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
  currentState = "STAGING";
  console.log("\n📦 Performing Atomic Writes to staging...");
  
  fs.writeFileSync(stagedHtmlPath, articleHTML, "utf-8");
  const tmpInsights = updateInsightsAtomic(title, expectedSlug, dateStr, summary, imageUrl, currentTopic);
  const tmpSitemap = updateSitemapAtomic(expectedSlug);
  
  const pendingState = {
      filename: expectedSlug + ".html", title: title, topic: currentTopic,
      lineIndex: lineIndex, publication_status: "PENDING", timestamp: new Date().toISOString()
  };
  fs.writeFileSync(stagedPendingPath, JSON.stringify(pendingState, null, 2), "utf-8");
  
  // ATOMIC MOVE TO REPO ROOT
  fs.renameSync(stagedHtmlPath, finalHtmlPath);
  fs.renameSync(tmpInsights, INSIGHTS_PATH);
  fs.renameSync(tmpSitemap, path.join(ROOT, "sitemap.xml"));
  fs.renameSync(stagedPendingPath, PENDING_PATH);
  
  currentState = "STAGED";
  exitSafely(0, `Article "${title}" staged atomically. Ready for Git Commit.`);
}

main().catch((err) => {
  lastErrorClass = "UNHANDLED_EXCEPTION";
  exitSafely(1, err.message || String(err));
});
