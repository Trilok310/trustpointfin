const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const mockJsonData = [
  {
    topic: "Rule of 72",
    teaching_objective: "Teach beginners how to quickly calculate when their money will double",
    format: "CALCULATION",
    visual_style: "STYLE 1",
    slides: [
      { slide_number: 1, purpose: "hook", headline: "क्या आप जानते हैं आपका पैसा कब Double होगा?", core_explanation: "Rule of 72 एक बहुत ही simple financial tool है।", visual_type: "none", visual_description: "", example_box: "", annotation: "Swipe to learn the magic math! 🪄", key_numbers: [], chart_data: [], highlight: "Double", cta: null },
      { slide_number: 2, purpose: "concept", headline: "The Rule of 72 Formula", core_explanation: "यह formula बताता है कि किसी fixed interest rate पर आपका पैसा double होने में कितने साल लगेंगे। आपको बस 72 को अपने expected return से divide करना है।", visual_type: "bignumber", visual_description: "Formula", example_box: "If you get 10% return: 72 ÷ 10 = 7.2 Years", annotation: "Sirf fixed returns ke liye exact kaam karta hai.", key_numbers: ["72 ÷ Rate"], chart_data: [], highlight: "72", cta: null },
      { slide_number: 3, purpose: "comparison", headline: "FD vs Mutual Funds", core_explanation: "अगर आप अपना पैसा Savings Account, FD या Mutual Funds में डालते हैं, तो time difference बहुत बड़ा होता है।", visual_type: "comparison", visual_description: "FD (6%) vs Equity (12%)", example_box: "₹1,00,000 will become ₹2,00,000 in 12 years in FD, but only 6 years in Mutual Funds.", annotation: "Inflation also eats your money. Don't forget that!", key_numbers: ["12 Years", "6 Years"], chart_data: [], highlight: "Mutual Funds", cta: null },
      { slide_number: 4, purpose: "cta", headline: "Ready to start compounding?", core_explanation: "Investing जल्दी शुरू करें, क्योंकि time सबसे बड़ा factor है।", visual_type: "none", visual_description: "", example_box: "", annotation: "", key_numbers: [], chart_data: [], highlight: "compounding", cta: "Save this calculation for later!" }
    ],
    caption: "आपका पैसा कब Double होगा? 💸 Rule of 72 एक बहुत ही simple और powerful calculation है..."
  },
  {
    topic: "Growth vs Value Investing",
    teaching_objective: "Explain the difference between growth and value stocks",
    format: "COMPARISON",
    visual_style: "STYLE 2",
    slides: [
      { slide_number: 1, purpose: "hook", headline: "Growth vs Value 📈", core_explanation: "Stock market में पैसे बनाने के दो सबसे मशहूर तरीके। आपको कौन सा चुनना चाहिए?", visual_type: "none", visual_description: "", example_box: "", annotation: "Warren Buffett is famous for Value Investing.", key_numbers: [], chart_data: [], highlight: "Growth vs Value", cta: null },
      { slide_number: 2, purpose: "comparison", headline: "The Core Difference", core_explanation: "Growth investors उन companies को ढूँढ़ते हैं जो बहुत तेज़ी से sales बढ़ा रही हैं। Value investors उन companies को ढूँढ़ते हैं जो अपने असली दाम से सस्ती मिल रही हैं।", visual_type: "comparison", visual_description: "Fast Expansion vs Discount Price", example_box: "Growth: Tech startups expanding globally.\nValue: Old banks trading below book value.", annotation: "Value means buying a ₹100 note for ₹80.", key_numbers: ["High Growth", "Undervalued"], chart_data: [], highlight: "Difference", cta: null },
      { slide_number: 3, purpose: "example", headline: "Risk & Reward Profile", core_explanation: "Growth stocks में growth रुकने पर भारी गिरावट आती है। Value stocks में 'Value Trap' का risk होता है (company सस्ती है क्योंकि वो सच में ख़राब है)।", visual_type: "chart", visual_description: "Risk levels", example_box: "If a Growth stock misses earnings by 1%, it can crash 20% in one day.", annotation: "Don't buy cheap just because it's cheap.", key_numbers: [], chart_data: [30, 50, 90], highlight: "Risk", cta: null },
      { slide_number: 4, purpose: "cta", headline: "Which one are you?", core_explanation: "Young investors usually prefer Growth. Retired investors prefer Value and Dividends.", visual_type: "none", visual_description: "", example_box: "", annotation: "", key_numbers: [], chart_data: [], highlight: "you", cta: "Comment your investing style below!" }
    ],
    caption: "क्या आप Growth Investor हैं या Value Investor? 🤔"
  },
  {
    topic: "Beginner investment mistake",
    teaching_objective: "Stop beginners from buying penny stocks just because they are 'cheap'",
    format: "MYTH VS REALITY",
    visual_style: "STYLE 3",
    slides: [
      { slide_number: 1, purpose: "hook", headline: "सबसे बड़ी Beginner Mistake 🛑", core_explanation: "Penny Stocks! नए investors सोचते हैं कि ₹5 का share ₹50 हो जाएगा, लेकिन ₹1000 का share ₹10,000 नहीं होगा।", visual_type: "none", visual_description: "", example_box: "", annotation: "Myth: Cheap Share Price = Cheap Valuation", key_numbers: [], chart_data: [], highlight: "Mistake", cta: null },
      { slide_number: 2, purpose: "explanation", headline: "Share Price ≠ Valuation", core_explanation: "किसी Company का share price यह नहीं बताता कि वह सस्ती है। आपको Market Cap और Earnings (PE Ratio) देखना चाहिए।", visual_type: "bignumber", visual_description: "A ₹10 stock can be extremely expensive if the company makes 0 profit.", example_box: "Company A: ₹10 share (Loss making) = EXPENSIVE\nCompany B: ₹5000 share (Huge profits) = CHEAP", annotation: "Always check the PE Ratio.", key_numbers: ["PE Ratio"], chart_data: [], highlight: "Valuation", cta: null },
      { slide_number: 3, purpose: "checklist", headline: "How to avoid Penny Stock traps?", core_explanation: "Penny stocks में 'Pump and Dump' schemes बहुत आम हैं। ऑपरेटर price बढ़ाते हैं, और retail investor फँस जाता है।", visual_type: "checklist", visual_description: "Check consistent profit | High liquidity | Institutional holding", example_box: "Only buy stocks where large mutual funds are also invested.", annotation: "Never buy stocks based on SMS or WhatsApp tips.", key_numbers: [], chart_data: [], highlight: "traps", cta: null },
      { slide_number: 4, purpose: "cta", headline: "Quality over Quantity", core_explanation: "10,000 बेकार shares से बेहतर है 10 अच्छे shares।", visual_type: "none", visual_description: "", example_box: "", annotation: "", key_numbers: [], chart_data: [], highlight: "Quality", cta: "Share this to save a beginner's money!" }
    ],
    caption: "Penny Stocks का जाल! 🕸️ क्यों सस्ते shares हमेशा अच्छे नहीं होते..."
  },
  {
    topic: "What is SIP and how does compounding work?",
    teaching_objective: "Demonstrate the power of SIP compounding over time",
    format: "TIMELINE",
    visual_style: "STYLE 4",
    slides: [
      { slide_number: 1, purpose: "hook", headline: "हर महीने ₹5000 बचाकर करोड़पति? 💰", core_explanation: "Systematic Investment Plan (SIP) आपके छोटे amounts को समय के साथ एक huge wealth में बदल देता है।", visual_type: "bignumber", visual_description: "Amount", example_box: "", annotation: "It requires extreme patience.", key_numbers: ["₹5,000 / month"], chart_data: [], highlight: "करोड़पति", cta: null },
      { slide_number: 2, purpose: "timeline", headline: "The SIP Journey", core_explanation: "Market गिरे या बढ़े, आपकी SIP चलती रहनी चाहिए। इसे 'Rupee Cost Averaging' कहते हैं।", visual_type: "timeline", visual_description: "Start early | Automate monthly | Don't stop in crashes | Let it compound", example_box: "If market falls 20%, your ₹5000 buys MORE units of the mutual fund. This is good!", annotation: "Never pause your SIP in a bear market.", key_numbers: [], chart_data: [], highlight: "Journey", cta: null },
      { slide_number: 3, purpose: "chart", headline: "Magic of Time ⏳", core_explanation: "शुरुआत के 5-7 साल growth बहुत slow लगती है। असली compounding 15+ years के बाद exponential हो जाती है।", visual_type: "chart", visual_description: "Wealth over time", example_box: "Investing ₹5K/month for 20 years at 12%: You invest 12L, but it becomes ~50L.", annotation: "The last 5 years make more money than the first 15 years.", key_numbers: [], chart_data: [10, 30, 100], highlight: "Magic", cta: null },
      { slide_number: 4, purpose: "cta", headline: "Start Your SIP Today", core_explanation: "The best time to plant a tree was 20 years ago. The second best time is today.", visual_type: "none", visual_description: "", example_box: "", annotation: "", key_numbers: [], chart_data: [], highlight: "Today", cta: "Save this timeline for motivation!" }
    ],
    caption: "SIP का असली जादू Time में छिपा है! ⏳"
  },
  {
    topic: "Market Order vs Limit Order",
    teaching_objective: "Explain order types clearly to beginners",
    format: "COMPARISON",
    visual_style: "STYLE 5",
    slides: [
      { slide_number: 1, purpose: "hook", headline: "Market Order vs Limit Order ⚖️", core_explanation: "Share खरीदते समय कौन सा order type चुनें? यह एक छोटी सी गलती आपको महँगी पड़ सकती है।", visual_type: "none", visual_description: "", example_box: "", annotation: "Order types dictate how much you actually pay.", key_numbers: [], chart_data: [], highlight: "Order", cta: null },
      { slide_number: 2, purpose: "comparison", headline: "The Core Difference", core_explanation: "Market Order तुरंत buy/sell करता है (चाहे जो भी price हो)। Limit Order आपके चुने हुए exact price पर ही execute होता है।", visual_type: "comparison", visual_description: "Instant Execution vs Price Control", example_box: "If a stock is at ₹100, a Market Order might buy it at ₹101 due to low liquidity. A Limit Order at ₹100 will wait.", annotation: "Market order prioritizes SPEED. Limit order prioritizes PRICE.", key_numbers: ["Speed", "Price"], chart_data: [], highlight: "Difference", cta: null },
      { slide_number: 3, purpose: "story", headline: "When to use what?", core_explanation: "अगर आप long term investor हैं (blue chip stocks), तो Market order ठीक है। लेकिन अगर आप Trader हैं, या illiquid stock ले रहे हैं, तो Limit order बेहतर है।", visual_type: "story", visual_description: "Trader setting a limit to prevent slippage.", example_box: "Penny stocks can jump 5% in seconds. A market order will buy at the absolute top.", annotation: "Beware of 'Slippage' in Market Orders.", key_numbers: [], chart_data: [], highlight: "use", cta: null },
      { slide_number: 4, purpose: "cta", headline: "Clear on the basics?", core_explanation: "अपना पहला trade सही order type के साथ करें और नुकसान से बचें।", visual_type: "none", visual_description: "", example_box: "", annotation: "", key_numbers: [], chart_data: [], highlight: "Clear", cta: "Which one do you use?" }
    ],
    caption: "Market Order या Limit Order? सही चुनाव कैसे करें..."
  }
];

const ROOT = __dirname;
const SLIDES_DIR = path.join(ROOT, '..', 'slides');
const ARTIFACT_DIR = 'C:\\Users\\HP\\.gemini\\antigravity\\brain\\b0a03e58-6b22-498e-b40e-745a1b5971d0\\test_outputs_v3';

if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

let summaryText = "# 5-Post Test Summary V3\\n\\n";

for (let i = 0; i < mockJsonData.length; i++) {
    const data = mockJsonData[i];
    console.log(`\n\n=== GENERATING VISUALS FOR V3 TEST ${i+1}: ${data.topic} ===`);
    
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
}

fs.writeFileSync(path.join(ARTIFACT_DIR, 'summary.md'), summaryText, 'utf8');
console.log('\n\nAll 5 V3 tests completed and saved to test_outputs_v3!');
