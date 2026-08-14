const fs = require('fs');
const path = require('path');

const unsplashImages = [
  "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1518186285570-20fc40d3c12f?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1579532537598-4dfe970e676c?q=80&w=1200&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1612001815159-00f74542dfbc?q=80&w=1200&auto=format&fit=crop"
];

function getRandomImage() {
  return unsplashImages[Math.floor(Math.random() * unsplashImages.length)];
}

// Map to keep track of which article gets which image so hero and thumbnail match
const articleImageMap = {};

const dir = 'C:\\Users\\HP\\.gemini\\antigravity\\scratch\\trustpointfin';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.html'));

let replacedCount = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('image.pollinations.ai')) {
    // Generate an image specifically for this file
    const img = getRandomImage();
    
    // Replace all pollinations urls in this file
    const updatedContent = content.replace(/https:\/\/image\.pollinations\.ai\/prompt\/[^"']+/g, img);
    fs.writeFileSync(filePath, updatedContent, 'utf8');
    console.log(`Updated images in ${file}`);
    replacedCount++;
  }
}

console.log(`Done! Updated images in ${replacedCount} files.`);
