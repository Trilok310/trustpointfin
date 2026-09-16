const fs = require("fs");
const path = require("path");

/*
 * TrustPointFin — Quality Topic Engine
 * ------------------------------------
 * Replaces the old random [ASSET] + [CONCEPT] + [HOOK] generator.
 *
 * Goal: 1 strong social-first idea per day.
 * Do NOT generate thousands of mechanically combined topics.
 */

const topics = [
  // BEGINNER / EDUCATION
  "Why a good company can still be a bad investment at the wrong price",
  "3 numbers a beginner should check before buying a stock",
  "What market cap actually tells you about a company",
  "P/E ratio explained with a simple ₹100 example",
  "Revenue vs Profit: why both matter",
  "Why a falling stock is not automatically cheap",
  "What does EPS actually mean?",
  "Dividend vs capital appreciation: two ways stocks can reward investors",
  "What is an index and why does Nifty 50 matter?",
  "Nifty 50 vs Sensex: what is actually different?",
  "Demat account vs Trading account: simple explanation",
  "Delivery vs Intraday: what changes for a beginner?",
  "Market Order vs Limit Order: when does each make sense?",
  "What is Compounding and why does time matter more than a big starting amount?",
  "Why starting small can be better than waiting for the perfect amount",
  "SIP vs lump-sum: understand the basic difference",
  "ETF vs Mutual Fund: the beginner version",
  "Direct stocks vs mutual funds: what are you actually choosing?",
  "What is diversification—and what is NOT diversification?",
  "Why holding 30 stocks does not automatically make a portfolio safer",

  // MISTAKES / MYTHS
  "5 mistakes beginners make after buying their first stock",
  "The most dangerous sentence in investing: 'It has already fallen a lot'",
  "Why buying because a stock is trending can be expensive",
  "Myth: a ₹50 stock is cheaper than a ₹5,000 stock",
  "Myth: a low P/E automatically means a stock is cheap",
  "Myth: more stocks always means less risk",
  "Why averaging down needs a reason—not just a lower price",
  "Why checking your portfolio every 10 minutes can hurt decision-making",
  "Why FOMO makes investors buy late",
  "Why panic selling can turn a temporary fall into a permanent loss",
  "The difference between investing and hoping",
  "Why a stock tip is not an investment thesis",
  "Why past returns should not be treated as a promise of future returns",
  "Why 'multibagger' headlines can distort risk perception",
  "Why copying someone else's portfolio can be dangerous",

  // CALCULATIONS / CURIOSITY
  "₹5,000 a month: why 10 years and 20 years can look dramatically different",
  "What happens when you increase a SIP by ₹500 every year?",
  "₹1 lakh in one stock vs spreading it across investments: what changes?",
  "How much does a 1% annual return difference matter over a long period?",
  "Why fees and costs matter more as your portfolio gets larger",
  "A ₹10 stock falls 50%—how much must it rise to recover?",
  "A stock rises 50% and then falls 50%—are you back where you started?",
  "Why losing 20% requires more than a 20% gain to recover",
  "What does inflation do to ₹10 lakh over 20 years?",
  "Why your savings rate matters before your investment return",

  // PSYCHOLOGY
  "Why investors sell winners too early and hold losers too long",
  "The psychology behind 'I will sell when it comes back to my price'",
  "FOMO vs discipline: what changes when a stock is already running?",
  "Why a red portfolio feels worse than a green portfolio feels good",
  "Loss aversion explained with a simple everyday example",
  "Why confirmation bias can make your favourite stock look perfect",
  "How social media changes the way beginners perceive market risk",
  "Why having a written investment thesis can improve discipline",
  "What to do mentally when the market falls 5%",

  // FUNDAMENTAL ANALYSIS
  "Revenue, EBITDA, Profit: what should a beginner actually look at?",
  "ROE explained without complicated finance language",
  "Debt-to-equity explained with a simple example",
  "Cash flow vs profit: why the difference matters",
  "How to read a basic company annual result",
  "Why promoter holding can be worth understanding",
  "What is free cash flow?",
  "Growth vs valuation: why fast-growing companies can still disappoint",
  "How to compare two companies in the same sector",

  // TECHNICAL ANALYSIS — EDUCATIONAL, NOT TIPS
  "What does a candlestick actually show?",
  "Support and resistance explained with a simple chart",
  "Volume: what it can tell you and what it cannot",
  "Trend vs noise: why every price move is not a signal",
  "Moving averages explained for beginners",
  "RSI explained without calling it a buy/sell machine",
  "Why technical indicators should not be used in isolation",
  "What a breakout means—and why not every breakout works",
  "Stop-loss: the purpose is risk control, not prediction",

  // IPO / FUNDS / MARKET
  "Should you apply for every IPO? 5 questions to ask first",
  "IPO price vs listing price: what beginners often misunderstand",
  "What does IPO oversubscription actually mean?",
  "Why a strong listing does not guarantee a strong long-term investment",
  "How FIIs and DIIs can influence market sentiment",
  "What happens to markets when interest rates change?",
  "Why the market can fall even when a company reports good results",
  "Sector rotation explained with a simple example",
  "Gold ETF vs physical gold: what is different?",
  "Index funds: why simple can sometimes be useful",

  // ENGAGEMENT / QUIZ
  "You have ₹1 lakh: one stock or a diversified portfolio? What would you choose?",
  "You bought at ₹500 and it falls to ₹400: what is your first reaction?",
  "Which matters more before buying: Price, Company, Chart or News?",
  "Would you buy a stock after it falls 30%? What would you check first?",
  "Which is worse: missing a rally or taking a large loss?",
  "You receive a 'sure-shot' stock tip in WhatsApp. What do you do?",
  "What is the first financial metric you learned?",
  "Which topic confuses beginners most: P/E, EPS, ROE or debt?",

  // TRUST / BRAND / TUTORIAL
  "How to open and understand a Demat account step by step",
  "How to place your first delivery order: what each field means",
  "How to add funds safely to a trading account",
  "Where to find your holdings, orders and transaction history",
  "What beginners should understand before placing their first trade",
  "What support a beginner should expect from a broker",

  // PERSONAL FINANCE
  "Emergency fund first or investing first? Understand the order of priorities",
  "Why high-interest debt can change your investing plan",
  "How to set an investing amount you can actually maintain",
  "Needs vs Wants vs Investments: a practical monthly framework",
  "Why increasing income can matter as much as chasing returns",
  "How to build an investing habit without starting with a large amount"
];

const outputPath = path.join(__dirname, "2000_topics.txt");

// Keep the file name for compatibility with the existing workflow.
// Numbering starts at 1. The post-article script will consume one unchecked item per day.
const markdown = [
  "## TrustPointFin Quality Topic Queue",
  "",
  ...topics.map((topic, i) => `- [ ] ${i + 1}. ${topic}`),
  ""
].join("\n");

fs.writeFileSync(outputPath, markdown, "utf8");
console.log(`Generated ${topics.length} quality-first topics at ${outputPath}`);
