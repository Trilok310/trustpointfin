const fs = require('fs');

function addHindiFont(file) {
    if (!fs.existsSync(file)) return;
    let css = fs.readFileSync(file, 'utf8');
    
    // Add Noto Sans Devanagari to the Google Fonts link
    css = css.replace(/family=Outfit:wght@700&display=swap/g, "family=Outfit:wght@700&family=Noto+Sans+Devanagari:wght@400;700;900&display=swap");
    
    // Append Noto Sans Devanagari to the font stacks
    css = css.replace(/font-family: 'Inter', sans-serif;/g, "font-family: 'Inter', 'Noto Sans Devanagari', sans-serif;");
    css = css.replace(/font-family: 'Playfair Display', serif;/g, "font-family: 'Playfair Display', 'Noto Sans Devanagari', serif;");
    
    fs.writeFileSync(file, css, 'utf8');
    console.log(`Added Hindi fonts to ${file}`);
}

addHindiFont('scripts/generate-carousel.js');
addHindiFont('scripts/generate-reel.js');
addHindiFont('scripts/generate-story.js');
