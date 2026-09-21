const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const mockJsonData = [
  {
    topic: "Rule of 72",
    teaching_objective: "Teach beginners how to quickly calculate when their money will double",
    format: "CALCULATION",
    visual_style: "STYLE 1",
    target_audience: "beginner",
    language: "hinglish",
    slides: [
      { slide_number: 1, purpose: "hook", headline: "क्या आप जानते हैं आपका पैसा कब Double होगा?", body: "जानें Rule of 72 का जादू 🪄", visual_type: "none", visual_description: "", key_numbers: [], chart_data: [], highlight: "Double", cta: null },
      { slide_number: 2, purpose: "concept", headline: "The Rule of 72", body: "यह एक simple formula है जो बताता है कि किसी interest rate पर आपका पैसा double होने में कितने साल लगेंगे।", visual_type: "bignumber", visual_description: "Formula", key_numbers: ["72 ÷ Rate"], chart_data: [], highlight: "72", cta: null },
      { slide_number: 3, purpose: "example", headline: "Let's Calculate! 🧮", body: "मान लीजिए आप Mutual Funds में 12% return की उम्मीद करते हैं...", visual_type: "calculation", visual_description: "Years to double", key_numbers: ["72 ÷ 12", "6 Years"], chart_data: [], highlight: "12%", cta: null },
      { slide_number: 4, purpose: "comparison", headline: "FD vs Mutual Funds", body: "देखें कहाँ आपका पैसा जल्दी double होता है:", visual_type: "comparison", visual_description: "FD (6%) vs Equity (12%)", key_numbers: ["12 Years", "6 Years"], chart_data: [], highlight: "Mutual Funds", cta: null },
      { slide_number: 5, purpose: "takeaway", headline: "Rule of 72 की Limitation", body: "यह सिर्फ एक estimate है। Market returns guaranteed नहीं होते, इसलिए inflation को भी ध्यान में रखें।", visual_type: "callout", visual_description: "Do not blindly trust fixed returns in equity.", key_numbers: [], chart_data: [], highlight: "estimate", cta: null },
      { slide_number: 6, purpose: "cta", headline: "Ready to start compounding?", body: "TrustPointFin के साथ अपनी investing journey शुरू करें।", visual_type: "none", visual_description: "", key_numbers: [], chart_data: [], highlight: "compounding", cta: "Save this for later." }
    ],
    caption: "आपका पैसा कब Double होगा? 💸 Rule of 72 एक बहुत ही simple और powerful calculation है..."
  },
  {
    topic: "Growth vs Value Investing",
    teaching_objective: "Explain the difference between growth and value stocks",
    format: "COMPARISON",
    visual_style: "STYLE 2",
    target_audience: "beginner",
    language: "hinglish",
    slides: [
      { slide_number: 1, purpose: "hook", headline: "Growth vs Value 📈", body: "आपको किसमें Invest करना चाहिए?", visual_type: "none", visual_description: "", key_numbers: [], chart_data: [], highlight: "Growth vs Value", cta: null },
      { slide_number: 2, purpose: "comparison", headline: "Basic Difference", body: "Growth companies तेजी से बड़ी होना चाहती हैं, जबकि Value companies अपने असली price से सस्ती मिल रही होती हैं।", visual_type: "comparison", visual_description: "High Growth vs Undervalued", key_numbers: ["Fast Expansion", "Discount Price"], chart_data: [], highlight: "Difference", cta: null },
      { slide_number: 3, purpose: "example", headline: "Risk & Reward", body: "Growth में risk ज़्यादा होता है, लेकिन returns भी। Value में patience की ज़रूरत होती है।", visual_type: "chart", visual_description: "Risk levels", key_numbers: [], chart_data: [30, 50, 90], highlight: "Risk", cta: null },
      { slide_number: 4, purpose: "cta", headline: "Which one are you?", body: "क्या आप Growth investor हैं या Value investor?", visual_type: "quiz", visual_description: "A vs B", key_numbers: ["Growth", "Value", "Both"], chart_data: [], highlight: "you", cta: "Comment your answer!" }
    ],
    caption: "क्या आप Growth Investor हैं या Value Investor? 🤔"
  },
  {
    topic: "Beginner investment mistake",
    teaching_objective: "Stop beginners from buying penny stocks just because they are 'cheap'",
    format: "MYTH VS REALITY",
    visual_style: "STYLE 3",
    target_audience: "beginner",
    language: "hinglish",
    slides: [
      { slide_number: 1, purpose: "hook", headline: "सबसे बड़ी Beginner Mistake 🛑", body: "₹10 का Stock ₹1000 के Stock से 'सस्ता' नहीं होता!", visual_type: "none", visual_description: "", key_numbers: [], chart_data: [], highlight: "Mistake", cta: null },
      { slide_number: 2, purpose: "explanation", headline: "Share Price ≠ Valuation", body: "किसी Company का share price यह नहीं बताता कि वह सस्ती है या महंगी। Market Cap और Earnings देखें।", visual_type: "callout", visual_description: "Check PE Ratio, not just Share Price", key_numbers: [], chart_data: [], highlight: "Valuation", cta: null },
      { slide_number: 3, purpose: "checklist", headline: "Penny Stocks से बचें", body: "इन 3 चीज़ों का ध्यान रखें:", visual_type: "checklist", visual_description: "No consistent profit | Low liquidity | High manipulation risk", key_numbers: [], chart_data: [], highlight: "Penny Stocks", cta: null },
      { slide_number: 4, purpose: "cta", headline: "Quality over Quantity", body: "100 बेकार shares से बेहतर है 1 अच्छा share।", visual_type: "none", visual_description: "", key_numbers: [], chart_data: [], highlight: "Quality", cta: "Share this with a beginner!" }
    ],
    caption: "Penny Stocks का जाल! 🕸️ क्यों सस्ते shares हमेशा अच्छे नहीं होते..."
  },
  {
    topic: "What is SIP and how does compounding work?",
    teaching_objective: "Demonstrate the power of SIP compounding over time",
    format: "TIMELINE",
    visual_style: "STYLE 4",
    target_audience: "beginner",
    language: "hinglish",
    slides: [
      { slide_number: 1, purpose: "hook", headline: "हर महीने ₹5000 बचाकर करोड़पति? 💰", body: "Power of SIP & Compounding", visual_type: "bignumber", visual_description: "Amount", key_numbers: ["₹5,000 / month"], chart_data: [], highlight: "करोड़पति", cta: null },
      { slide_number: 2, purpose: "timeline", headline: "SIP Journey", body: "Time in the market > Timing the market", visual_type: "timeline", visual_description: "Start early | Be consistent | Let it compound | Enjoy wealth", key_numbers: [], chart_data: [], highlight: "Journey", cta: null },
      { slide_number: 3, purpose: "chart", headline: "Magic of Time ⏳", body: "शुरुआत में growth slow लगती है, लेकिन 15-20 साल बाद असली compounding दिखती है।", visual_type: "chart", visual_description: "Exponential growth curve", key_numbers: [], chart_data: [10, 30, 100], highlight: "Magic", cta: null },
      { slide_number: 4, purpose: "cta", headline: "Start Your SIP Today", body: "TrustPointFin के साथ अपनी journey शुरू करें।", visual_type: "none", visual_description: "", key_numbers: [], chart_data: [], highlight: "Today", cta: "Save this for motivation!" }
    ],
    caption: "SIP का असली जादू Time में छिपा है! ⏳"
  },
  {
    topic: "Market Order vs Limit Order",
    teaching_objective: "Explain order types clearly to beginners",
    format: "COMPARISON",
    visual_style: "STYLE 5",
    target_audience: "beginner",
    language: "hinglish",
    slides: [
      { slide_number: 1, purpose: "hook", headline: "Market Order vs Limit Order ⚖️", body: "Share खरीदते समय कौन सा चुनें?", visual_type: "none", visual_description: "", key_numbers: [], chart_data: [], highlight: "Order", cta: null },
      { slide_number: 2, purpose: "comparison", headline: "Basic Difference", body: "Market Order तुरंत buy/sell करता है (current price पर)। Limit Order आपके चुने हुए price पर ही execute होता है।", visual_type: "comparison", visual_description: "Instant Execution vs Price Control", key_numbers: ["Speed", "Price"], chart_data: [], highlight: "Difference", cta: null },
      { slide_number: 3, purpose: "story", headline: "When to use what?", body: "अगर आप long term investor हैं (SIP), तो Market order ठीक है। लेकिन अगर आप Trader हैं, तो Limit order बेहतर है।", visual_type: "story", visual_description: "Trader setting a limit", key_numbers: [], chart_data: [], highlight: "use", cta: null },
      { slide_number: 4, purpose: "cta", headline: "Clear?", body: "अपना पहला trade सही order type के साथ करें।", visual_type: "none", visual_description: "", key_numbers: [], chart_data: [], highlight: "Clear", cta: "Which one do you use?" }
    ],
    caption: "Market Order या Limit Order? सही चुनाव कैसे करें..."
  }
];

const ROOT = __dirname;
const SLIDES_DIR = path.join(ROOT, '..', 'slides');
const ARTIFACT_DIR = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\b0a03e58-6b22-498e-b40e-745a1b5971d0\\test_outputs';

if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

let summaryText = "# 5-Post Test Summary\n\n";

for (let i = 0; i < mockJsonData.length; i++) {
    const data = mockJsonData[i];
    console.log(`\n\n=== GENERATING VISUALS FOR TEST ${i+1}: ${data.topic} ===`);
    
    // Save JSON
    fs.writeFileSync(path.join(ROOT, '..', 'latest_slides.json'), JSON.stringify(data, null, 2), 'utf8');
    
    // Generate Visuals
    execSync('node scripts/generate-carousel.js', { stdio: 'inherit', cwd: path.join(ROOT, '..') });
    
    // Copy to artifacts
    const postDir = path.join(ARTIFACT_DIR, `post_${i+1}`);
    if (!fs.existsSync(postDir)) fs.mkdirSync(postDir);
    
    fs.copyFileSync(path.join(ROOT, '..', 'latest_slides.json'), path.join(postDir, 'data.json'));
    
    fs.readdirSync(SLIDES_DIR).forEach(f => {
        if (f.endsWith('.jpg')) {
            fs.copyFileSync(path.join(SLIDES_DIR, f), path.join(postDir, f));
        }
    });

    summaryText += `### Post ${i+1}: ${data.topic}\n`;
    summaryText += `- Format: ${data.format}\n`;
    summaryText += `- Visual Style: ${data.visual_style}\n`;
    summaryText += `- Quality Score (Mocked): 9.2/10\n\n`;
}

fs.writeFileSync(path.join(ARTIFACT_DIR, 'summary.md'), summaryText, 'utf8');
console.log('\n\nAll 5 tests completed and saved to test_outputs!');
