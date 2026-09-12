const fs = require('fs');
const path = require('path');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const CALENDAR_PATH = path.join(ROOT, 'content_calendar.md');
const STATE_PATH = path.join(ROOT, '.current_topic_state.json');

function main() {
    if (!fs.existsSync(STATE_PATH)) {
        console.log("No topic state file found. Assuming no topic was processed or already marked.");
        return;
    }

    const state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    const { topic, lineIndex } = state;

    const lines = fs.readFileSync(CALENDAR_PATH, 'utf-8').split('\n');
    
    // Safety check
    if (lines[lineIndex] && lines[lineIndex].includes(topic)) {
        lines[lineIndex] = lines[lineIndex].replace("- [ ]", "- [x]");
        fs.writeFileSync(CALENDAR_PATH, lines.join("\n"), "utf-8");
        console.log(`✅ SUCCESS: Entire pipeline passed. Topic "${topic}" officially marked as complete.`);
    } else {
        console.error(`⚠️ Topic mismatch at line ${lineIndex}. Cannot mark complete.`);
        process.exit(1);
    }

    // Clean up
    fs.unlinkSync(STATE_PATH);
}

main();
