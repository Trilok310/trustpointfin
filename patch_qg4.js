const fs = require('fs');
let code = fs.readFileSync('scripts/content-quality-gate.js', 'utf-8');

const regex = /const safeContent = contentLower[\s\S]*?const bannedPhrases =/g;
const newBlock = `const safeContent = contentLower
        .replace(/(no|not|never|without|doesn't|does not) guarantee[d]?/g, '')
        .replace(/guarantee[d]? (nahi|na|nhi)/g, '')
        .replace(/kisi (bhi )?guarantee/g, '')
        .replace(/guarantee (nahi|na|nhi) hai/g, '')
        .replace(/koi guarantee (nahi|na|nhi) hai/g, '')
        .replace(/actual return ki guarantee (nahi|na|nhi)/g, '')
        .replace(/actual returns vary/g, '');
        
    const bannedPhrases =`;
    
code = code.replace(regex, newBlock);
fs.writeFileSync('scripts/content-quality-gate.js', code, 'utf-8');
console.log("Patched negations cleanly.");
