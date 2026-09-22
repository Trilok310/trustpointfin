const fs = require('fs');
const path = require('path');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const STATE_PATH = path.join(ROOT, '.current_topic_state.json');
const PENDING_PATH = path.join(ROOT, '.pending_article.json');

const INITIAL_STATE = {
    job_id: null,
    topic: null,
    lineIndex: null,
    scheduled_at: null,
    started_at: null,
    article_generation_status: 'PENDING',
    article_correction_attempts: 0,
    article_compliance_status: 'PENDING',
    website_status: 'PENDING',
    social_generation_status: 'PENDING',
    social_correction_attempts: 0,
    social_compliance_status: 'PENDING',
    instagram_status: 'PENDING',
    facebook_status: 'PENDING',
    final_status: 'RUNNING',
    failure_reason: null,
    updated_at: null
};

function generateJobId(topic) {
    const dateStr = new Date().toISOString().split('T')[0];
    const slug = topic.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').substring(0, 30);
    return `job_${dateStr}_${slug}`;
}

function loadState(isPending = false) {
    const file = isPending ? PENDING_PATH : STATE_PATH;
    if (fs.existsSync(file)) {
        try {
            return JSON.parse(fs.readFileSync(file, 'utf-8'));
        } catch (e) {
            return { ...INITIAL_STATE };
        }
    }
    return { ...INITIAL_STATE };
}

function saveState(state, isPending = false) {
    state.updated_at = new Date().toISOString();
    const file = isPending ? PENDING_PATH : STATE_PATH;
    fs.writeFileSync(file, JSON.stringify(state, null, 2), 'utf-8');
}

function initNewJob(topic, lineIndex) {
    const jobId = generateJobId(topic);
    
    // Check if this job already completed successfully
    const currentState = loadState(false);
    if (currentState.job_id === jobId && currentState.final_status === 'SUCCESS') {
        return { isDuplicate: true, state: currentState };
    }

    const newState = {
        ...INITIAL_STATE,
        job_id: jobId,
        topic: topic,
        lineIndex: lineIndex,
        started_at: new Date().toISOString()
    };
    saveState(newState, true); // Save to pending
    return { isDuplicate: false, state: newState };
}

function updateState(updates, isPending = true) {
    const state = loadState(isPending);
    Object.assign(state, updates);
    saveState(state, isPending);
    return state;
}

function calculateFinalStatus(state) {
    if (state.website_status === 'FAILED' || state.article_compliance_status === 'FAILED') {
        return 'FAILED';
    }
    if (state.final_status === 'HUMAN_REVIEW') {
        return 'HUMAN_REVIEW';
    }
    
    const webSuccess = state.website_status === 'SUCCESS';
    const fbSuccess = state.facebook_status === 'SUCCESS';
    const igSuccess = state.instagram_status === 'SUCCESS';

    if (webSuccess && fbSuccess && igSuccess) {
        return 'SUCCESS';
    } else if (webSuccess && (fbSuccess || igSuccess || state.facebook_status === 'FAILED' || state.instagram_status === 'FAILED')) {
        // If web succeeded, and social was attempted but not completely successful
        return 'PARTIAL_SUCCESS';
    }
    
    return 'FAILED';
}

function finalizeState() {
    // Moves pending state to current state and calculates final status
    const pendingState = loadState(true);
    pendingState.final_status = calculateFinalStatus(pendingState);
    saveState(pendingState, false); // Save to current
    
    if (fs.existsSync(PENDING_PATH)) {
        fs.unlinkSync(PENDING_PATH);
    }
    
    return pendingState;
}

function printGitHubSummary(state) {
    const summary = `
## Pipeline Execution Summary
**Job ID:** ${state.job_id}
**Topic:** ${state.topic}
**Started At:** ${state.started_at}
**Updated At:** ${state.updated_at}

### Stages
- **Article Generation:** ${state.article_generation_status} (Corrections: ${state.article_correction_attempts})
- **Article Compliance:** ${state.article_compliance_status}
- **Website Publication:** ${state.website_status}
- **Social Generation:** ${state.social_generation_status} (Corrections: ${state.social_correction_attempts})
- **Social Compliance:** ${state.social_compliance_status}
- **Instagram Publication:** ${state.instagram_status}
- **Facebook Publication:** ${state.facebook_status}

### Conclusion
**FINAL STATUS:** ${state.final_status}
${state.failure_reason ? `**Failure Reason:** ${state.failure_reason}` : ''}
`;

    if (process.env.GITHUB_STEP_SUMMARY) {
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary, 'utf-8');
    }
    console.log(summary);
}

function handleStalePending() {
    if (fs.existsSync(PENDING_PATH)) {
        const pending = loadState(true);
        if (pending.started_at) {
            const startedDate = new Date(pending.started_at);
            const now = new Date();
            const diffHours = (now - startedDate) / (1000 * 60 * 60);
            if (diffHours > 4) { // More than 4 hours old is stale
                console.log(`[WARNING] Found stale pending job: ${pending.job_id}. Cleaning up.`);
                // Back it up before deleting just in case
                fs.writeFileSync(PENDING_PATH + '.stale', JSON.stringify(pending, null, 2), 'utf-8');
                fs.unlinkSync(PENDING_PATH);
                return true; // Was stale and cleaned
            }
        }
    }
    return false; // Not stale or doesn't exist
}

module.exports = {
    generateJobId,
    initNewJob,
    updateState,
    loadState,
    calculateFinalStatus,
    finalizeState,
    printGitHubSummary,
    handleStalePending
};
