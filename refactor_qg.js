const fs = require('fs');
let code = fs.readFileSync('scripts/content-quality-gate.js', 'utf-8');

const regex = /const result = await model\.generateContent\(prompt\);\s*console\.log\("\\n\[AI RESPONSE\] \(Quality Gate\)"\);\s*console\.log\("HTTP status: 200 \(Success\)"\);\s*console\.log\("Response received: true"\);\s*const responseText = result\.response\.text\(\)\.trim\(\)\.replace\(\/```json\/g, ''\)\.replace\(\/```\/g, ''\);/;

const replacement = `let responseText = "";
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
                        messages: [{ role: "user", content: prompt }]
                    })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(\`OpenAI API Error (HTTP \${response.status}): \${data.error?.message || JSON.stringify(data)}\`);
                if (!data.choices || data.choices.length === 0) throw new Error("OpenAI returned no choices.");
                responseText = data.choices[0].message.content.trim().replace(/\\\`\\\`\\\`json/g, '').replace(/\\\`\\\`\\\`/g, '');
            } else {
                const result = await model.generateContent(prompt);
                responseText = result.response.text().trim().replace(/\\\`\\\`\\\`json/g, '').replace(/\\\`\\\`\\\`/g, '');
            }
            
            console.log("\\n[AI RESPONSE] (Quality Gate)");
            console.log("HTTP status: 200 (Success)");
            console.log("Response received: true");`;

code = code.replace(regex, replacement);

// Fix the early exit check for API keys to support openai
code = code.replace(/if \(!apiKey\) \{[\s\S]*?return \{ valid: true, reason: "Passed deterministic checks \(AI skipped due to missing key\)" \};\s*\}/, 
`const activeProvider = process.env.AI_TEXT_PROVIDER || "openai";
    if (!apiKey && activeProvider !== "openai") {
        console.log("⚠️ No GEMINI_API_KEY available for quality gate. Skipping rigorous AI check.");
        return { valid: true, reason: "Passed deterministic checks (AI skipped due to missing key)" };
    }
    if (activeProvider === "openai" && !process.env.OPENAI_API_KEY) {
        console.log("⚠️ No OPENAI_API_KEY available for quality gate. Skipping rigorous AI check.");
        return { valid: true, reason: "Passed deterministic checks (AI skipped due to missing key)" };
    }`);

fs.writeFileSync('scripts/content-quality-gate.js', code, 'utf-8');
console.log("Refactored content-quality-gate.js to support OpenAI.");
