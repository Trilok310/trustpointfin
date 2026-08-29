const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

// --- CONFIG ---
// GITHUB_WORKSPACE is always set by GitHub Actions to the repo root.
// Falls back to parent directory for local testing.
const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, "..");
const CALENDAR_PATH = path.join(ROOT, "content_calendar.md");
const INSIGHTS_PATH = path.join(ROOT, "insights.html");
const SOCIAL_PATH = path.join(ROOT, "latest_social_media.md");
const TEMPLATE_PATH = path.join(ROOT, "sample-insight.html");

// Debug: print all paths so we can diagnose issues
console.log("🔍 DEBUG PATHS:");
console.log("  ROOT:", ROOT);
console.log("  CALENDAR:", CALENDAR_PATH, "| exists:", fs.existsSync(CALENDAR_PATH));
console.log("  INSIGHTS:", INSIGHTS_PATH, "| exists:", fs.existsSync(INSIGHTS_PATH));
console.log("  TEMPLATE:", TEMPLATE_PATH, "| exists:", fs.existsSync(TEMPLATE_PATH));
console.log("  Files in ROOT:", fs.readdirSync(ROOT).join(", "));

const EMOJI_MAP = {
  "Indian Market": "📈",
  "US Market": "🇺🇸",
  "IPO": "🚀",
  "Behavioral Finance": "🧠",
  "Book": "📚",
  "Princes of Yen": "💴",
  "CAN SLIM": "📊",
  "Trading": "💹",
  "Historical": "🏛️",
  "SIP": "💰",
  "Psychology": "🧘",
  "Zone": "🎯",
  "Best Loser": "🏆",
  "Options": "⚙️",
  "SEBI": "⚖️",
  "Company": "🏢",
  "Bubble": "⚠️",
  "Crypto": "₿",
  "China": "🇨🇳",
  "World Economy": "🌍",
  "10-20 years": "🔭",
};

function getEmoji(topic) {
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (topic.toLowerCase().includes(key.toLowerCase())) return emoji;
  }
  return "💡";
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 60);
}

function getNextTopic() {
  const calendar = fs.readFileSync(CALENDAR_PATH, "utf-8");
  const lines = calendar.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^- \[ \] (.+)$/);
    if (match) {
      return { topic: match[1].replace(/^\d+\.\s*/, "").trim(), lineIndex: i, lines };
    }
  }
  return null;
}

function markTopicComplete(lines, lineIndex) {
  lines[lineIndex] = lines[lineIndex].replace("- [ ]", "- [x]");
  fs.writeFileSync(CALENDAR_PATH, lines.join("\n"), "utf-8");
}

function buildArticleHTML(title, metaDescription, date, bodyHTML, faqSchema, slug, imageUrl, topic) {
  const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");

  return template
    .replace(
      /(<title>).*?(<\/title>)/,
      `$1${title} | TrustPointFin Insights$2`
    )
    .replace(
      /(<meta name="description" content=").*?(")/,
      `$1${metaDescription}$2`
    )
    .replace(
      /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
      `<script type="application/ld+json">\n    ${faqSchema}\n    </script>`
    )
    .replace(
      /<header class="article-header">[\s\S]*?<\/header>/,
      `<header class="article-header">
            <h1>${title}</h1>
            <div class="article-meta">Published on ${date} • By TrustPoint Finance Research</div>
            <img src="${imageUrl}" alt="${topic}" style="width:100%; height:auto; max-height:400px; object-fit:cover; border-radius:12px; margin-top:2rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
        </header>`
    )
    .replace(
      /<article class="article-content">[\s\S]*?<\/article>/,
      `<article class="article-content">\n${bodyHTML}\n        </article>`
    );
}

function addCardToInsights(title, slug, date, summary, imageUrl, topic) {
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

  const updated = insightsHTML.replace(
    /(<div class="insights-grid">)/,
    `$1\n${newCard}`
  );

  fs.writeFileSync(INSIGHTS_PATH, updated, "utf-8");
}

function updateSitemap(slug) {
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
  fs.writeFileSync(sitemapPath, sitemapXML, "utf-8");
}

async function main() {
    console.log("Mocking API for regression test...");
    
    const title = "Test Article for Regression";
    const meta = "This is a test meta description for regression testing.";
    const summary = "A short summary of the test article.";
    const statNum = "100%";
    const statLabel = "Regression Tested";
    
    const body = "<h2>Section 1</h2><p>This is test content.</p>";
    const faq1q = "Test FAQ Q1?";
    const faq1a = "Test FAQ A1.";
    const faq2q = "Test FAQ Q2?";
    const faq2a = "Test FAQ A2.";
    
    const dateStr = "August 2026";
    const slug = "test-regression-article";
    const imageUrl = "test.jpg";
    const topic = "Regression Test Topic";
    
    const takeawayItems = "<li>Test Takeaway 1</li><li>Test Takeaway 2</li>";
    
    const fullBodyHTML = 
            <!-- GEO Element: Key Takeaways -->
            <div class="geo-takeaways">
                <h3>Key Takeaways</h3>
                <ul>
                     + takeawayItems + 
                </ul>
            </div>

             + body + 

            <!-- GEO Element: Stat Box -->
            <div class="geo-stat">
                <span class="stat-number"> + statNum + </span>
                <span class="stat-text"> + statLabel + </span>
            </div>

            <!-- Sticky CTA -->
            <div style="text-align: center; margin: 4rem 0;">
                <a href="https://a.aonelink.in/ANGOne/8Xovqg1" target="_blank" class="btn btn-primary" style="font-size: 1.2rem; padding: 1rem 3rem;">Start Investing with Angel One Today</a>
            </div>

            <!-- GEO Element: FAQ Schema Visual Representation -->
            <section class="geo-faq">
                <h2>Frequently Asked Questions</h2>
                <div class="faq-item">
                    <h3> + faq1q + </h3>
                    <p> + faq1a + </p>
                </div>
                <div class="faq-item">
                    <h3> + faq2q + </h3>
                    <p> + faq2a + </p>
                </div>
            </section>;

    const faqSchema = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
            {"@type": "Question", name: faq1q, acceptedAnswer: {"@type": "Answer", text: faq1a}},
            {"@type": "Question", name: faq2q, acceptedAnswer: {"@type": "Answer", text: faq2a}}
        ]
    });

    const articleHTML = buildArticleHTML(title, meta, dateStr, fullBodyHTML, faqSchema, slug, imageUrl, topic);
    const articlePath = path.join(ROOT, slug + ".html");
    fs.writeFileSync(articlePath, articleHTML, "utf-8");
    console.log("? Article saved: " + slug + ".html");

    addCardToInsights(title, slug, dateStr, summary, imageUrl, topic);
    console.log("? insights.html updated with new article card");

    updateSitemap(slug);
    console.log("? sitemap.xml updated for Google Indexing");
}
main(););

