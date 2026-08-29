const fs = require('fs');

// 1. UPDATE POST-ARTICLE.JS PROMPTS (HINGLISH)
let postArticle = fs.readFileSync('scripts/post-article.js', 'utf8');

const oldArticlePromptRegex = /The article should:[\s\S]*?After the article content, you MUST generate a JSON array of 3 to 10 slides/;
const newArticlePrompt = `The article should:
  - Be highly relevant to Indian retail investors in \${now.getFullYear()}
  - Include real data, statistics, and actionable insights
  - Have a strong SEO meta description (max 160 chars)
  - Include a Key Takeaways section (3-5 bullet points)
  - Have 3-4 main sections with H2 headings
  - Include one impressive statistic in a callout box (format: STAT_NUMBER|STAT_LABEL)
  - Naturally mention Angel One as a great platform to start investing
  - End with a CTA encouraging readers to open a Demat account with Angel One
  
  After the article content, you MUST generate a JSON array of 3 to 10 slides that will be automatically turned into an Instagram/Facebook carousel post.
  CRITICAL: The slides content MUST be written in 'Hinglish' (Hindi language written in English script mixed with English). Use common English financial terms like "Invest", "Market", "Profit", "Loss" instead of pure Hindi words like "Nivesh" or "Poonji". Make it relatable to the young Indian audience.`;
postArticle = postArticle.replace(oldArticlePromptRegex, newArticlePrompt);

const oldSocialPromptRegex = /write engaging social media posts\.[\s\S]*?Format EXACTLY as follows:/;
const newSocialPrompt = `write engaging social media posts.
  CRITICAL: The social media posts MUST be written in 'Hinglish' (Hindi language written in English script mixed with English). Use common English financial terms like "Invest", "Market", "Profit", "Loss" instead of pure Hindi words like "Nivesh". Make it highly engaging and relatable to Indian youth.
  
  Format EXACTLY as follows:`;
postArticle = postArticle.replace(oldSocialPromptRegex, newSocialPrompt);

fs.writeFileSync('scripts/post-article.js', postArticle, 'utf8');
console.log('Updated post-article.js for Hinglish.');

// 2. UPDATE GENERATE-CAROUSEL.JS CSS (LIGHT BACKGROUND)
function makeLight(file) {
    if (!fs.existsSync(file)) return;
    let css = fs.readFileSync(file, 'utf8');
    
    css = css.replace(/body \{.*?background-color: #0f172a;/g, "body { background-color: #f8fafc;");
    css = css.replace(/body \{ margin: 0; padding: 0; background: #0f172a;/g, "body { margin: 0; padding: 0; background: #f8fafc;");
    css = css.replace(/body \{ background-color: #0f172a; color: white;/g, "body { background-color: #f8fafc; color: #0f172a;");
    
    css = css.replace(/\.slide\.bg-analytical \{ background-color: #0f172a; background-image: linear-gradient\(rgba\(255, 255, 255, 0\.03\) 2px, transparent 2px\), linear-gradient\(90deg, rgba\(255, 255, 255, 0\.03\) 2px, transparent 2px\);/g, ".slide.bg-analytical { background-color: #f8fafc; background-image: linear-gradient(rgba(0, 0, 0, 0.05) 2px, transparent 2px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 2px, transparent 2px);");
    css = css.replace(/rgba\(15, 23, 42, 0\.6\), rgba\(15, 23, 42, 0\.95\)/g, "rgba(255, 255, 255, 0.85), rgba(255, 255, 255, 0.98)");
    css = css.replace(/rgba\(15, 23, 42, 0\.4\), rgba\(15, 23, 42, 0\.95\)/g, "rgba(255, 255, 255, 0.7), rgba(255, 255, 255, 0.95)");
    
    css = css.replace(/\.brand-text \{.*?color: #ffb703;/g, ".brand-text { font-family: 'Outfit', sans-serif; font-weight: 700; font-size: 32px; color: #2563eb;");
    css = css.replace(/\.slide-number \{ color: rgba\(255,255,255,0\.4\); \}/g, ".slide-number { color: rgba(0,0,0,0.4); }");
    css = css.replace(/\.swipe \{ color: #ffb703; \}/g, ".swipe { color: #2563eb; }");
    css = css.replace(/\.slide-disclaimer \{.*?color: rgba\(255,255,255,0\.4\);/g, ".slide-disclaimer { position: absolute; bottom: 15px; left: 50px; right: 50px; text-align: center; font-size: 14px; font-weight: 400; color: rgba(0,0,0,0.4);");
    
    css = css.replace(/h1 \{.*?color: #ffffff;/g, "h1 { font-family: 'Playfair Display', serif; font-size: 76px; font-weight: 700; line-height: 1.15; margin-top: 120px; margin-bottom: 24px; color: #0f172a;");
    css = css.replace(/\.highlight \{ color: #ffb703;/g, ".highlight { color: #2563eb;");
    css = css.replace(/p \{.*?color: #cbd5e1;/g, "p { font-family: 'Inter', sans-serif; font-size: 32px; line-height: 1.5; color: #334155;");
    css = css.replace(/\.data-table \{.*?background: rgba\(255, 255, 255, 0\.03\);/g, ".data-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 28px; background: rgba(0, 0, 0, 0.03);");
    css = css.replace(/border-bottom: 2px solid rgba\(255,255,255,0\.08\);/g, "border-bottom: 2px solid rgba(0,0,0,0.08);");
    css = css.replace(/\.data-table th \{.*?color: #ffb703;.*?background: rgba\(0,0,0,0\.2\);/g, ".data-table th { color: #2563eb; font-weight: 600; text-transform: uppercase; font-size: 24px; letter-spacing: 2px; background: rgba(0,0,0,0.05);");
    css = css.replace(/\.cta-btn \{ background: #ffb703; color: #0f172a;/g, ".cta-btn { background: #2563eb; color: #ffffff;");

    // Reels/Stories specific
    css = css.replace(/\.step-badge \{.*?color: #0f172a; background: #ffb703;/g, ".step-badge { font-family: 'Inter', sans-serif; font-weight: 900; font-size: 36px; color: #ffffff; background: #2563eb;");
    css = css.replace(/\.title \{.*?color: #ffffff;.*?text-shadow: 0 4px 20px rgba\(0,0,0,0\.5\);/g, ".title { font-family: 'Playfair Display', serif; font-size: 90px; font-weight: 700; line-height: 1.2; color: #0f172a; margin-bottom: 30px; text-shadow: 0 4px 20px rgba(255,255,255,0.8);");
    css = css.replace(/\.text \{.*?color: #cbd5e1;/g, ".text { font-family: 'Inter', sans-serif; font-size: 40px; font-weight: 400; color: #334155;");
    css = css.replace(/\.footer \{.*?color: rgba\(255,255,255,0\.6\);/g, ".footer { position: absolute; bottom: 60px; left: 0; right: 0; text-align: center; font-family: 'Outfit', sans-serif; font-size: 32px; font-weight: 700; letter-spacing: 2px; color: rgba(0,0,0,0.6);");

    // Charts
    css = css.replace(/labels: \{ color: '#cbd5e1'/g, "labels: { color: '#334155'");
    css = css.replace(/grid: \{ color: 'rgba\(255, 255, 255, 0\.05\)' \}/g, "grid: { color: 'rgba(0, 0, 0, 0.05)' }");
    css = css.replace(/ticks: \{ color: '#cbd5e1' \}/g, "ticks: { color: '#334155' }");
    css = css.replace(/Chart\.defaults\.color = '#94a3b8';/g, "Chart.defaults.color = '#64748b';");

    fs.writeFileSync(file, css, 'utf8');
    console.log(`Updated ${file} for light theme.`);
}

makeLight('scripts/generate-carousel.js');
makeLight('scripts/generate-reel.js');
makeLight('scripts/generate-story.js');
