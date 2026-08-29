const fs = require('fs');
const path = require('path');

const assets = [
  "Nifty 50", "BankNifty", "FinNifty", "Midcap Nifty", "Sensex", 
  "Reliance", "HDFC Bank", "TCS", "Infosys", "ICICI Bank", 
  "SBI", "Tata Motors", "L&T", "ITC", "Bharti Airtel", 
  "Multi-bagger Stocks", "Penny Stocks", "High Dividend Yield Stocks", 
  "Blue-chip Stocks", "Mid-cap Stocks", "Small-cap Stocks", 
  "Upcoming IPOs", "Mutual Funds", "Index ETFs", "Gold ETFs",
  "Indian IT Sector", "Indian Banking Sector", "Auto Sector", "FMCG Stocks"
];

const concepts = [
  "Price Action Trading", "Support and Resistance Levels", 
  "Moving Average Crossovers", "RSI Divergence", "MACD Strategies", 
  "Fibonacci Retracements", "Bollinger Bands Breakouts", "Volume Profile Analysis", 
  "Candlestick Patterns", "Breakout Trading", "Swing Trading Setups", 
  "Intraday Scalping", "Options Buying", "Options Selling", 
  "Iron Condor Strategies", "Straddles and Strangles", "Covered Call Strategies", 
  "Risk Management", "Position Sizing Rules", "Stop Loss Placement", 
  "Hedging Strategies", "Value Investing Principles", "Growth Investing", 
  "The CAN SLIM Method", "Algorithmic Trading", "Quantitative Analysis",
  "Trading Psychology", "Emotional Discipline", "Sector Rotation"
];

const contexts = [
  "in a Bull Market", "during a Bear Market", "in a Sideways Market", 
  "during High Volatility (India VIX)", "in Earnings Season", 
  "around Budget Day", "during Pre-Election Rallies", "amidst Global Market Sell-offs", 
  "following RBI Policy Changes", "based on FII/DII Data",
  "for the Upcoming Quarter", "for the Next Decade",
  "in Times of High Inflation", "during Market Corrections",
  "Before Expiry Day", "on Expiry Day"
];

const hooks = [
  "A Beginner's Guide", "Advanced Tactics", "For Working Professionals", 
  "For Retail Traders", "For Long-term Wealth Creation", 
  "To Generate Consistent Income", "To Avoid Massive Drawdowns",
  "What Every Investor Needs to Know", "The Ultimate Strategy",
  "Step-by-Step Blueprint", "Top Secrets", "Common Mistakes to Avoid"
];

const templates = [
  "[HOOK]: Mastering [CONCEPT] for [ASSET]",
  "How to use [CONCEPT] [CONTEXT] to Trade [ASSET]",
  "[ASSET] Analysis: [HOOK] to [CONCEPT]",
  "The Role of [CONCEPT] in [ASSET] [CONTEXT]",
  "[HOOK]: Profiting from [ASSET] [CONTEXT]",
  "Why [CONCEPT] is the Key to [ASSET] [CONTEXT]",
  "Combining [CONCEPT] with [ASSET] Analysis",
  "[HOOK]: The Best [CONCEPT] Setup for [ASSET]",
  "[ASSET] Trading: How to Apply [CONCEPT] [CONTEXT]",
  "[CONCEPT] Explained: [HOOK] for Trading [ASSET]"
];

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

const uniqueTopics = new Set();
let target = 2000;

while (uniqueTopics.size < target) {
  const template = getRandom(templates);
  const topic = template
    .replace("[ASSET]", getRandom(assets))
    .replace("[CONCEPT]", getRandom(concepts))
    .replace("[CONTEXT]", getRandom(contexts))
    .replace("[HOOK]", getRandom(hooks));
  
  uniqueTopics.add(topic);
}

const topicsArray = Array.from(uniqueTopics);
let markdown = "## Automated Topic Queue (2000 Topics)\n\n";
for (let i = 0; i < topicsArray.length; i++) {
  markdown += `- [ ] ${i + 31}. ${topicsArray[i]}\n`;
}

const outputPath = path.join(__dirname, "2000_topics.txt");
fs.writeFileSync(outputPath, markdown, 'utf8');
console.log(`Successfully generated ${uniqueTopics.size} topics to ${outputPath}`);
