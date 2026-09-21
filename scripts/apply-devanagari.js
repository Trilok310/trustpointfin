const fs = require('fs');

let postArticle = fs.readFileSync('scripts/post-article.js', 'utf8');

const oldArticlePromptRegex = /CRITICAL: The slides content MUST be written in 'Hinglish'[\s\S]*?Make it relatable to the young Indian audience\./;
const newArticlePrompt = `CRITICAL: The slides content MUST be written in actual Hindi (Devanagari script) mixed with English words. Use the Hindi script for grammar and connecting words, but KEEP all common financial terms in pure English (Latin script) like "Invest", "Market", "Profit", "Loss", "Compounding", "Equity". DO NOT translate financial terms into Hindi (do not use "Nivesh", "Poonji", etc.). Make it highly engaging for the Indian youth audience.`;

postArticle = postArticle.replace(oldArticlePromptRegex, newArticlePrompt);

const oldSocialPromptRegex = /CRITICAL: The social media posts MUST be written in 'Hinglish'[\s\S]*?Make it highly engaging and relatable to Indian youth\./;
const newSocialPrompt = `CRITICAL: The social media posts MUST be written in actual Hindi (Devanagari script) mixed with English words. Use the Hindi script for grammar and connecting words, but KEEP all common financial terms in pure English (Latin script) like "Invest", "Market", "Profit", "Loss", "Compounding", "Equity". DO NOT translate financial terms into Hindi (do not use "Nivesh"). Make it highly engaging and relatable to Indian youth.`;

postArticle = postArticle.replace(oldSocialPromptRegex, newSocialPrompt);

fs.writeFileSync('scripts/post-article.js', postArticle, 'utf8');
console.log('Updated post-article.js for Devanagari Hindi + English terms.');
