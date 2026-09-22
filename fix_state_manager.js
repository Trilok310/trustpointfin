const fs = require('fs');
let content = fs.readFileSync('scripts/post-article.js', 'utf-8');
content = content.replace(/const stateManager = require\('\.\/state-manager\.js'\);/g, '');
content = "const stateManager = require('./state-manager.js');\n" + content;
fs.writeFileSync('scripts/post-article.js', content, 'utf-8');
console.log("Fixed redeclaration.");
