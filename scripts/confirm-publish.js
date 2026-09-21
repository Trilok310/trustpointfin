const fs = require('fs');
const path = require('path');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const PENDING_PATH = path.join(ROOT, '.pending_article.json');
const STATE_PATH = path.join(ROOT, '.current_topic_state.json');
const CALENDAR_PATH = path.join(ROOT, 'content_calendar.md');

function main() {
    if (!fs.existsSync(PENDING_PATH)) {
        console.error("❌ No .pending_article.json found! Cannot confirm publication.");
        process.exit(1);
    }

    const state = JSON.parse(fs.readFileSync(PENDING_PATH, 'utf-8'));
    
    // Upgrade status to SUCCESS
    state.publication_status = "SUCCESS";
    state.published_at = new Date().toISOString();

    // Mark complete in calendar
    const { topic, lineIndex } = state;
    const lines = fs.readFileSync(CALENDAR_PATH, 'utf-8').split('\n');
    
    if (lines[lineIndex] && lines[lineIndex].includes(topic)) {
        lines[lineIndex] = lines[lineIndex].replace("- [ ]", "- [x]");
        fs.writeFileSync(CALENDAR_PATH, lines.join("\n"), "utf-8");
        console.log(`✅ SUCCESS: Website article committed and pushed. Topic "${topic}" officially marked as complete.`);
    } else {
        console.error(`⚠️ Topic mismatch at line ${lineIndex}. Cannot mark complete.`);
        process.exit(1);
    }

    // Write final state for social pipeline
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
    console.log(`✅ SUCCESS: .current_topic_state.json written. Article is now available for social media generation.`);

    // Clean up pending
    fs.unlinkSync(PENDING_PATH);
}

main();
