const fs = require('fs');
let code = fs.readFileSync('scripts/post-article.js', 'utf-8');

// Replace Recovery overwrite
code = code.replace(/const pendingState = \{\s*filename: expectedSlug \+ "\.html", title: existingTitle, topic: currentTopic,\s*lineIndex: lineIndex, publication_status: "PENDING", timestamp: new Date\(\)\.toISOString\(\)\s*\};\s*fs\.writeFileSync\(PENDING_PATH, JSON\.stringify\(pendingState, null, 2\), "utf-8"\);/, 
    "stateManager.updateState({ filename: expectedSlug + '.html', title: existingTitle });");

// Replace standard overwrite
code = code.replace(/const pendingState = \{\s*filename: expectedSlug \+ "\.html", title: title, topic: currentTopic,\s*lineIndex: lineIndex, publication_status: "PENDING", timestamp: new Date\(\)\.toISOString\(\)\s*\};\s*fs\.writeFileSync\(stagedPendingPath, JSON\.stringify\(pendingState, null, 2\), "utf-8"\);\s*\/\/ ATOMIC MOVE TO REPO ROOT\s*fs\.renameSync\(stagedHtmlPath, finalHtmlPath\);\s*fs\.renameSync\(tmpInsights, INSIGHTS_PATH\);\s*fs\.renameSync\(tmpSitemap, path\.join\(ROOT, "sitemap\.xml"\)\);\s*fs\.renameSync\(stagedPendingPath, PENDING_PATH\);/,
    "stateManager.updateState({ filename: expectedSlug + '.html', title: title });\n    // ATOMIC MOVE TO REPO ROOT\n    fs.renameSync(stagedHtmlPath, finalHtmlPath);\n    fs.renameSync(tmpInsights, INSIGHTS_PATH);\n    fs.renameSync(tmpSitemap, path.join(ROOT, 'sitemap.xml'));");

fs.writeFileSync('scripts/post-article.js', code, 'utf-8');
console.log("Fixed state overwrites.");
