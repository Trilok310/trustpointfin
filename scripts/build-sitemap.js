const fs = require('fs');
const html = fs.readFileSync('insights.html', 'utf8');
const regex = /href="([^"/]+\.html)"/g;
let match;
const urls = [];
while ((match = regex.exec(html)) !== null) {
  const file = match[1];
  if (file !== 'insights.html' && file !== 'index.html' && !urls.includes(file)) {
    urls.push(file);
  }
}
console.log('Total active articles in insights.html:', urls.length);

let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://trustpointfin.org/</loc>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://trustpointfin.org/insights.html</loc>
        <changefreq>daily</changefreq>
        <priority>0.9</priority>
    </url>
`;

for (const u of urls) {
  xml += `    <url>
        <loc>https://trustpointfin.org/${u}</loc>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>
`;
}
xml += `</urlset>\n`;

fs.writeFileSync('sitemap.xml', xml, 'utf8');
console.log('sitemap.xml generated successfully!');
