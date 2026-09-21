const fs = require('fs');

const path = 'content_calendar.md';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Find the last checked item
let lastCheckedIndex = -1;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('- [x]')) {
        lastCheckedIndex = i;
    }
}

// Keep everything up to the last checked index + 1 (inclusive)
let newLines = lines.slice(0, lastCheckedIndex + 1);

const newTopics = [
    "The 50-30-20 Rule of Money: How to Build Wealth on a ₹30,000 Salary",
    "Why FDs Are Keeping You Poor: The Hidden Tax of Inflation",
    "Nifty 50 vs. Smallcap Funds: Where Should You Invest Your First ₹5,000?",
    "What is a SIP and Why It's the Cheat Code for Indian Millennials",
    "The Compounding Magic: How ₹2,000 a Month Can Make You a Crorepati",
    "Renting vs. Buying a Home in India: The Financial Truth",
    "The Power of Index Funds: Why Warren Buffett Recommends Them",
    "How to Read a Stock Market Chart: 3 Basics Every Beginner Should Know",
    "Avoid These 5 Costly Mistakes When Buying Your First Stock",
    "Options Trading 101: Is It Gambling or a Real Strategy?",
    "How FIIs and DIIs Move the Indian Stock Market",
    "Why You Need Health Insurance Before You Start Investing",
    "Tax Saving 101: How ELSS Mutual Funds Can Save You ₹46,800",
    "Debt vs. Equity: Finding the Right Balance for Your Age",
    "What is the Nifty Bank Index and How Does It Affect the Economy?",
    "Gold vs. Digital Gold vs. SGBs: Which is the Best Investment?",
    "The Psychology of FOMO: Why Chasing Multibaggers Destroys Wealth",
    "How to Build an Emergency Fund in Just 6 Months",
    "Demystifying IPOs: Should You Invest in Every New Listing?",
    "Why Angel One is the Perfect Platform for Your First Trade",
    "What Happens When the RBI Changes the Repo Rate?",
    "Growth vs. Dividend Stocks: Which Strategy is Best for You?",
    "The Secret to Beating Inflation in India",
    "How to Spot a Fundamentally Strong Company in 5 Minutes",
    "3 Books Every Indian Investor Must Read",
    "Mutual Funds vs. Direct Stocks: The Ultimate Comparison",
    "Why 'Time in the Market' Always Beats 'Timing the Market'",
    "The Impact of Union Budgets on Retail Investors",
    "How to Create a Passive Income Stream with Dividend Yields",
    "Financial Freedom at 40: A Realistic Roadmap for Indians"
];

// Extract the last number used to continue the sequence
let lastNumMatch = newLines[newLines.length - 1].match(/- \[x\] (\d+)\./);
let nextNum = lastNumMatch ? parseInt(lastNumMatch[1]) + 1 : 1;

for (const topic of newTopics) {
    newLines.push(`- [ ] ${nextNum}. ${topic}`);
    nextNum++;
}

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log(`Updated content_calendar.md. Kept ${lastCheckedIndex + 1} existing lines, added 30 new premium topics.`);
