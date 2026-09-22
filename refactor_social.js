const fs = require('fs');
let code = fs.readFileSync('services/ai/content-generator.js', 'utf-8');

// 1. Remove the GEMINI_API_KEY strict check
code = code.replace(/if \(!process\.env\.GEMINI_API_KEY\) \{[\s\S]*?throw new Error\("Missing GEMINI_API_KEY for content generation\."\);\s*\}/, 
    `if (!process.env.GEMINI_API_KEY && process.env.AI_TEXT_PROVIDER !== "openai") {\n        throw new Error("Missing GEMINI_API_KEY for content generation.");\n    }`);

// 2. Replace the generation logic
code = code.replace(/const result = await model\.generateContent\(currentPrompt\);\s*let rawText = result\.response\.text\(\);/,
    `let rawText = "";
            if (process.env.AI_TEXT_PROVIDER === "openai") {
                if (!process.env.OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");
                const response = await fetch("https://api.openai.com/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": \`Bearer \${process.env.OPENAI_API_KEY}\`
                    },
                    body: JSON.stringify({
                        model: process.env.OPENAI_TEXT_MODEL || "gpt-5.6-luna",
                        messages: [{ role: "user", content: currentPrompt }]
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(\`OpenAI API Error (HTTP \${response.status}): \${data.error?.message || JSON.stringify(data)}\`);
                if (!data.choices || data.choices.length === 0) throw new Error("OpenAI returned no choices.");
                rawText = data.choices[0].message.content;
            } else {
                const result = await model.generateContent(currentPrompt);
                rawText = result.response.text();
            }`);

fs.writeFileSync('services/ai/content-generator.js', code, 'utf-8');
console.log("Refactored content-generator.js to support OpenAI.");
