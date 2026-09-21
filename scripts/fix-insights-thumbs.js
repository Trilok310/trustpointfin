const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
const insightsPath = path.join(dir, 'insights.html');
let insightsHtml = fs.readFileSync(insightsPath, 'utf8');

const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && !['index.html', 'privacy.html', 'insights.html', 'sample-insight.html'].includes(f) && !f.startsWith('google'));

for (const file of files) {
    const filePath = path.join(dir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Extract the specific image URL from the article file
    const imgMatch = content.match(/<img src="(https:\/\/images\.unsplash\.com[^"]+)"/i);
    if (imgMatch) {
        const specificImgUrl = imgMatch[1];
        
        // Find the block in insights.html and replace its image URL
        // We know the block starts with <a href="file.html"...
        const regex = new RegExp(`(<a href="${file}"[^>]*>[\\s\\S]*?<img src=")(https:\/\/images\.unsplash\.com[^"]+)(")`, 'i');
        
        insightsHtml = insightsHtml.replace(regex, `$1${specificImgUrl}$3`);
        console.log(`Updated thumbnail for ${file}`);
    }
}

fs.writeFileSync(insightsPath, insightsHtml, 'utf8');
console.log("Fixed insights.html!");
