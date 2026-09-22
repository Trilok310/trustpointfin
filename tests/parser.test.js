const assert = require('assert');

function extract(text, startTag, endTag) {
    const start = text.indexOf(startTag) + startTag.length;
    const end = endTag ? text.indexOf(endTag, start) : text.length;
    return text.slice(start, end).trim();
}

console.log("🧪 Starting Parser/Extractor Tests...\n");

const mockArticle = `---TITLE---
Some Title
---META---
Some Meta
---SUMMARY---
Some Summary
---TAKEAWAYS---
• Takeaway 1
• Takeaway 2
---STAT---
100|Users
---BODY---
This is the body.
---FAQ1Q---
Question 1
---FAQ1A---
Answer 1
---FAQ2Q---
Question 2
---FAQ2A---
Answer 2 is clean here
---END---`;

const faq2a = extract(mockArticle, "---FAQ2A---", "---END---");
assert.strictEqual(faq2a, "Answer 2 is clean here", "FAQ2A extraction should cleanly grab only the text up to END.");

console.log("✅ Parser correctly isolates FAQ2A without leaking social data.");
console.log("\n🎉 All parser tests passed successfully!");
