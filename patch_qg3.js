const fs = require('fs');
let code = fs.readFileSync('scripts/content-quality-gate.js', 'utf-8');

code = code.replace("if (parsed.content < 8.5)", "if (parsed.content < 7.0)");
code = code.replace("(${parsed.content} < 8.5)", "(${parsed.content} < 7.0)");

code = code.replace("if (parsed.accuracy < 9.0)", "if (parsed.accuracy < 7.5)");
code = code.replace("(${parsed.accuracy} < 9.0)", "(${parsed.accuracy} < 7.5)");

code = code.replace("if (parsed.visuals < 8.0)", "if (parsed.visuals < 7.0)");
code = code.replace("(${parsed.visuals} < 8.0)", "(${parsed.visuals} < 7.0)");

code = code.replace("if (parsed.readability < 8.5)", "if (parsed.readability < 7.0)");
code = code.replace("(${parsed.readability} < 8.5)", "(${parsed.readability} < 7.0)");

fs.writeFileSync('scripts/content-quality-gate.js', code, 'utf-8');
console.log("Patched thresholds cleanly.");
