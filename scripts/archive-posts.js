const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ARCHIVE_DIR = path.join(ROOT, 'archive', 'posts');

if (!fs.existsSync(ARCHIVE_DIR)) {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
}

// 1. Define the 5 active post files to keep
const ACTIVE_POSTS = [
  'what-is-a-sip-and-why-its-the-cheat-code-for-indian-millenni.html',
  'nifty-50-vs-smallcap-funds-where-should-you-invest-your-firs.html',
  'why-fds-are-keeping-you-poor-the-hidden-tax-of-inflation.html',
  'the-50-30-20-rule-of-money-how-to-build-wealth-on-a-30rs-000.html',
  'what-is-pe-ratio-and-why-does-it-matter.html'
];

// System files that must never be archived
const SYSTEM_FILES = new Set([
  'index.html',
  'insights.html',
  'privacy.html',
  'sample-insight.html',
  'carousel-temp.html'
]);

// 2. Identify all HTML files in ROOT
const allFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
const filesToArchive = allFiles.filter(f => !SYSTEM_FILES.has(f) && !ACTIVE_POSTS.includes(f));

console.log(`Total HTML files in root: ${allFiles.length}`);
console.log(`Active posts to keep in root: ${ACTIVE_POSTS.length}`);
console.log(`System HTML files preserved: ${SYSTEM_FILES.size}`);
console.log(`Article files to archive: ${filesToArchive.length}`);

// Verify all active posts actually exist
for (const p of ACTIVE_POSTS) {
  if (!fs.existsSync(path.join(ROOT, p))) {
    throw new Error(`CRITICAL: Active post ${p} not found in root!`);
  }
}

// 3. Move files to archive/posts/
const archiveCatalog = [];
for (const file of filesToArchive) {
  const src = path.join(ROOT, file);
  const dest = path.join(ARCHIVE_DIR, file);
  
  // Try extracting title from file
  try {
    const html = fs.readFileSync(src, 'utf8');
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);
    const dateMatch = html.match(/<meta\s+name="date"\s+content="([^"]+)"/i) || html.match(/(\d{1,2}\s+[A-Za-z]+\s+\d{4})/);
    archiveCatalog.push({
      file,
      title: titleMatch ? titleMatch[1].replace(/ \| TrustPointFin.*/, '').trim() : file,
      date: dateMatch ? dateMatch[1] : 'Archived'
    });
  } catch (e) {
    archiveCatalog.push({ file, title: file, date: 'Archived' });
  }

  fs.renameSync(src, dest);
}

console.log(`✅ Successfully moved ${filesToArchive.length} article files to ${ARCHIVE_DIR}`);

// 4. Create archive/README.md catalog
const archiveReadmePath = path.join(ROOT, 'archive', 'README.md');
let readmeContent = `# TrustPointFin Post Archive

*Archive snapshot created on: ${new Date().toISOString().split('T')[0]}*
*Total archived articles:* ${archiveCatalog.length}

All historical auto-generated articles have been safely archived to keep the active production site focused on the 5 core flagship posts.

## Archived Articles Index

| # | Article Title | Archived File |
|---|---------------|---------------|
`;

archiveCatalog.forEach((item, index) => {
  readmeContent += `| ${index + 1} | ${item.title.replace(/\|/g, '-')} | \`posts/${item.file}\` |\n`;
});

fs.writeFileSync(archiveReadmePath, readmeContent, 'utf8');
console.log(`✅ Created archive catalog at ${archiveReadmePath}`);

// 5. Update insights.html to only retain the 5 active post cards
const insightsPath = path.join(ROOT, 'insights.html');
const insightsHtml = fs.readFileSync(insightsPath, 'utf8');

const gridStartTag = '<div class="insights-grid">';
const gridStartIdx = insightsHtml.indexOf(gridStartTag);
const mainEndTag = '</main>';
const mainEndIdx = insightsHtml.indexOf(mainEndTag);

if (gridStartIdx === -1 || mainEndIdx === -1) {
  throw new Error('Could not find <div class="insights-grid"> or </main> in insights.html');
}

// Extract cards
const cardRegex = /<!-- Auto-generated article -->[\s\S]*?<\/a>/g;
const allCards = insightsHtml.match(cardRegex) || [];

// Filter to only cards matching ACTIVE_POSTS
const keptCards = allCards.filter(card => {
  return ACTIVE_POSTS.some(p => card.includes(`href="${p}"`));
});

console.log(`Cards found before: ${allCards.length}, cards to keep: ${keptCards.length}`);

if (keptCards.length !== 5) {
  console.warn(`WARNING: Expected 5 matching cards, but found ${keptCards.length}. Checking individual posts:`);
  ACTIVE_POSTS.forEach(p => {
    const found = allCards.some(c => c.includes(`href="${p}"`));
    console.log(`  - ${p}: ${found ? 'Found' : 'MISSING IN GRID'}`);
  });
}

const newGridContent = `\n\n${keptCards.join('\n\n')}\n\n        </div>\n    `;

const updatedInsights = insightsHtml.substring(0, gridStartIdx + gridStartTag.length) +
  newGridContent +
  insightsHtml.substring(mainEndIdx);

fs.writeFileSync(insightsPath, updatedInsights, 'utf8');
console.log(`✅ Updated insights.html: now contains exactly ${keptCards.length} active post cards.`);

// 6. Update sitemap.xml to only retain active URLs
const sitemapPath = path.join(ROOT, 'sitemap.xml');
let newSitemap = `<?xml version="1.0" encoding="UTF-8"?>
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

for (const post of ACTIVE_POSTS) {
  newSitemap += `
    <url>
        <loc>https://trustpointfin.org/${post}</loc>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
    </url>`;
}

newSitemap += `\n</urlset>\n`;
fs.writeFileSync(sitemapPath, newSitemap, 'utf8');
console.log(`✅ Updated sitemap.xml: now contains root, insights, and the 5 active post URLs.`);
