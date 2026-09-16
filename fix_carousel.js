const fs = require('fs');
let code = fs.readFileSync('scripts/generate-carousel.js', 'utf8');
code = code.replace(/\\\$\\{/g, '${');
code = code.replace(/\\\\`/g, '`');
fs.writeFileSync('scripts/generate-carousel.js', code);
