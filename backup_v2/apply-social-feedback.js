const fs = require('fs');
const path = require('path');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const PERFORMANCE_FILE = path.join(ROOT, 'content_performance.json');
const SLIDES_JSON = path.join(ROOT, 'latest_slides.json');

async function main() {
    let performanceData = { posts: [] };
    if (fs.existsSync(PERFORMANCE_FILE)) {
        performanceData = JSON.parse(fs.readFileSync(PERFORMANCE_FILE, 'utf8'));
    }

    // 1. In a real scenario, this would fetch from Meta Graph API using the POST ID.
    // For now, we simulate collecting feedback for the last posted item.
    let lastPostInfo = null;
    if (fs.existsSync(SLIDES_JSON)) {
        const slideData = JSON.parse(fs.readFileSync(SLIDES_JSON, 'utf8'));
        
        // Mock random engagement metrics for demonstration
        const mockSaves = Math.floor(Math.random() * 50);
        const mockShares = Math.floor(Math.random() * 100);
        const mockComments = Math.floor(Math.random() * 20);
        const mockLikes = Math.floor(Math.random() * 500);
        const mockReach = Math.floor(Math.random() * 5000);

        lastPostInfo = {
            date: new Date().toISOString().split('T')[0],
            pillar: slideData.content_pillar || 'education',
            format: slideData.format || 'CAROUSEL',
            hook_type: slideData.hook_type || 'unknown',
            reach: mockReach,
            likes: mockLikes,
            comments: mockComments,
            shares: mockShares,
            saves: mockSaves,
            score: (mockShares * 3) + (mockSaves * 3) + (mockComments * 2) + mockLikes
        };
        
        // Ensure we don't duplicate today's data in the mock
        performanceData.posts = performanceData.posts.filter(p => p.date !== lastPostInfo.date);
        performanceData.posts.push(lastPostInfo);
    }

    // Keep only last 100 posts to avoid over-fitting and huge files
    if (performanceData.posts.length > 100) {
        performanceData.posts = performanceData.posts.slice(-100);
    }

    fs.writeFileSync(PERFORMANCE_FILE, JSON.stringify(performanceData, null, 2), 'utf8');
    
    // 2. Analyze top performing pillars and formats
    const analysis = {};
    for (const post of performanceData.posts) {
        if (!analysis[post.pillar]) analysis[post.pillar] = { totalScore: 0, count: 0 };
        analysis[post.pillar].totalScore += post.score;
        analysis[post.pillar].count++;
    }

    console.log("o. Feedback loop applied. Current best pillars:");
    for (const [pillar, data] of Object.entries(analysis)) {
        console.log(`- \${pillar}: avg score \${Math.round(data.totalScore / data.count)}`);
    }
}

main().catch(console.error);
