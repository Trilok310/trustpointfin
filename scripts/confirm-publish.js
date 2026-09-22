const fs = require('fs');
const path = require('path');
const stateManager = require('./state-manager.js');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const CALENDAR_PATH = path.join(ROOT, 'content_calendar.md');

function main() {
    console.log("✅ Confirming successful website publication...");
    const state = stateManager.loadState(true);

    if (!state.job_id) {
        console.error("❌ No pending job found! Cannot confirm publication.");
        process.exit(1);
    }

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

    stateManager.updateState({ website_status: 'SUCCESS' }, true);
    
    // Copy pending to current for social media to use
    fs.writeFileSync(path.join(ROOT, '.current_topic_state.json'), JSON.stringify(state, null, 2), 'utf-8');
    
    // We intentionally DO NOT delete pending yet. It gets finalized in post-social.js or cleanup.
}

main();
