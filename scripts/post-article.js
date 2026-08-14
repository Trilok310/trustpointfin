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

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("❌ GEMINI_API_KEY is not set!");
    process.exit(1);
  }

  const result = getNextTopic();
  if (!result) {
    console.log("✅ All topics in the content calendar are complete!");
    process.exit(0);
  }

  const { topic, lineIndex, lines } = result;
  console.log(`📝 Writing article about: "${topic}"`);

  const genAI = new GoogleGenerativeAI(apiKey);
  const primaryModel = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
  const fallbackModel = genAI.getGenerativeModel({ model: "gemini-3.5-flash" });

  // Robust retry wrapper for Gemini API calls to handle 503 and 429 errors
  async function generateContentWithRetry(prompt, retries = 4, delayMs = 10000) {
    let currentModel = primaryModel;
    for (let i = 0; i < retries; i++) {
      try {
        return await currentModel.generateContent(prompt);
      } catch (error) {
        const isTransientError = error.message.includes("503") || error.message.includes("429") || error.message.includes("500");
        
        if (isTransientError && i < retries - 1) {
          console.log(`⚠️ Gemini API error (${error.message.substring(0, 50)}...). Retrying in ${delayMs / 1000}s... (Attempt ${i + 1}/${retries})`);
          await new Promise(res => setTimeout(res, delayMs));
          
          // Fallback to 3.5-flash on the 3rd attempt if 3.6 is persistently busy
          if (i === 1) {
            console.log("🔄 Falling back to stable model: gemini-3.5-flash");
            currentModel = fallbackModel;
          }
          
          delayMs += 5000; // linear backoff to avoid waiting too long on actions
        } else {
          throw error;
        }
      }
    }
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // --- Prompt 1: Full Article ---
  const articlePrompt = `You are a senior financial analyst and content writer for TrustPointFin, an Indian financial advisory and Demat account referral platform. 

Write a detailed, GEO-optimized financial insights article about the following topic: "${topic}"

The article should:
- Be highly relevant to Indian retail investors in ${now.getFullYear()}
- Include real data, statistics, and actionable insights
- Have a strong SEO meta description (max 160 chars)
- Include a Key Takeaways section (3-5 bullet points)
- Have 3-4 main sections with H2 headings
- Include one impressive statistic in a callout box (format: STAT_NUMBER|STAT_LABEL)
- Naturally mention Angel One as a great platform to start investing
- End with a CTA encouraging readers to open a Demat account with Angel One

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
• Takeaway 3
---STAT---
150M+|Active Demat Accounts in India (example format)
---BODY---
<h2>Section 1 Title</h2>
<p>Paragraph content...</p>
<h2>Section 2 Title</h2>
<p>Paragraph content...</p>
---FAQ1Q---
First frequently asked question
---FAQ1A---
Detailed answer to first FAQ
---FAQ2Q---
Second frequently asked question  
---FAQ2A---
Detailed answer to second FAQ
---END---`;

  const articleResponse = await generateContentWithRetry(articlePrompt);
  const articleText = articleResponse.response.text();

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

  const [statNum, statLabel] = statRaw.includes("|")
    ? statRaw.split("|")
    : ["📊", statRaw];

  const takeawayItems = takeawaysRaw
    .split("\n")
    .filter((l) => l.trim().startsWith("•"))
    .map((l) => `<li>${l.replace("•", "").trim()}</li>`)
    .join("\n                    ");

  // --- Build full body HTML ---
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

  // --- Build FAQ schema JSON-LD ---
  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: faq1q,
        acceptedAnswer: { "@type": "Answer", text: faq1a },
      },
      {
        "@type": "Question",
        name: faq2q,
        acceptedAnswer: { "@type": "Answer", text: faq2a },
      },
    ],
  }, null, 2);

  const slug = slugify(title);
  
  // --- Image Generation (Unsplash API) ---
  let imageUrl = "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop"; // Premium fallback image
  
  if (process.env.UNSPLASH_API_KEY) {
    try {
      console.log("📸 Fetching premium image from Unsplash API...");
      // Ask Unsplash for a random landscape photo related to finance/markets
      const unsplashRes = await fetch(`https://api.unsplash.com/photos/random?query=finance,stock-market,business&orientation=landscape&client_id=${process.env.UNSPLASH_API_KEY}`);
      
      if (unsplashRes.ok) {
        const data = await unsplashRes.json();
        imageUrl = data.urls.regular; // The high-quality image URL
        console.log("✅ Unsplash image fetched successfully!");
      } else {
        console.log(`⚠️ Unsplash API Error: ${unsplashRes.status}. Using fallback image.`);
      }
    } catch (err) {
      console.log(`⚠️ Unsplash network error: ${err.message}. Using fallback image.`);
    }
  } else {
    console.log("⚠️ No UNSPLASH_API_KEY found. Using fallback image.");
  }

  const articleHTML = buildArticleHTML(title, meta, dateStr, fullBodyHTML, faqSchema, slug, imageUrl, topic);

  // --- Save article file ---
  const articlePath = path.join(ROOT, `${slug}.html`);
  fs.writeFileSync(articlePath, articleHTML, "utf-8");
  console.log(`✅ Article saved: ${slug}.html`);

  // --- Update insights.html grid ---
  addCardToInsights(title, slug, dateStr, summary, imageUrl, topic);
  console.log("✅ insights.html updated with new article card");

  // --- Generate Social Media Posts ---
  const socialPrompt = `You are a social media manager for TrustPointFin, an Indian financial advisory firm. 
Based on this article title: "${title}" and topic: "${topic}", write engaging social media posts.

Format EXACTLY as follows:
---INSTAGRAM---
Your Instagram caption here (use emojis, 150-200 words, include hashtags)
---FACEBOOK---
Your Facebook post here (conversational, 100-150 words, include a question to drive engagement)
---LINKEDIN---
Your LinkedIn post here (professional, data-driven, 150-200 words, include hashtags)
---END---`;

  const socialResponse = await generateContentWithRetry(socialPrompt);
  const socialText = socialResponse.response.text();

  const instagram = extract(socialText, "---INSTAGRAM---", "---FACEBOOK---");
  const facebook = extract(socialText, "---FACEBOOK---", "---LINKEDIN---");
  const linkedin = extract(socialText, "---LINKEDIN---", "---END---");

  const socialMarkdown = `# Social Media Posts
*Generated on ${dateStr} for article: "${title}"*

---

## 📸 Instagram Caption

${instagram}

---

## 👥 Facebook Post

${facebook}

---

## 💼 LinkedIn Post

${linkedin}

---
*Article URL: https://trilok310.github.io/trustpointfin/${slug}.html*
`;

  fs.writeFileSync(SOCIAL_PATH, socialMarkdown, "utf-8");
  console.log("✅ Social media captions saved to latest_social_media.md");

  // --- Mark topic complete in calendar ---
  markTopicComplete(lines, lineIndex);
  console.log(`✅ Topic "${topic}" marked as complete in content_calendar.md`);

  console.log("\n🎉 All done! Article posted successfully.");
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
