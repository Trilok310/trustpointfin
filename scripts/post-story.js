const fs = require('fs');
const path = require('path');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const STORY_IMAGE_PATH = path.join(ROOT, 'story.jpg');

const PAGE_TOKEN = process.env.META_PAGE_TOKEN;
const IG_ACCOUNT_ID = process.env.IG_ACCOUNT_ID;
const FB_PAGE_ID = process.env.FB_PAGE_ID;

const API_VERSION = 'v20.0';

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (data.error) {
        throw new Error(`Meta API Error: ${data.error.message}`);
    }
    return data;
}

async function getGithubRawUrl() {
    const url = `https://raw.githubusercontent.com/trilok310/trustpointfin/main/story.jpg?t=${Date.now()}`;
    return url;
}

async function main() {
    if (!PAGE_TOKEN || !IG_ACCOUNT_ID || !FB_PAGE_ID) {
        console.error("❌ Missing Meta credentials!");
        process.exit(1);
    }

    if (!fs.existsSync(STORY_IMAGE_PATH)) {
        console.error("❌ story.jpg not found!");
        process.exit(1);
    }

    const publicUrl = await getGithubRawUrl();
    console.log(`🔗 Using GitHub Raw URL: ${publicUrl}`);

    console.log("\n🚀 --- PUBLISHING INSTAGRAM STORY ---");
    console.log("📦 Creating IG Story Container...");
    const igContainer = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media?image_url=${encodeURIComponent(publicUrl)}&media_type=STORIES&access_token=${PAGE_TOKEN}`, {
        method: 'POST'
    });
    console.log(`✅ IG Container Created: ${igContainer.id}`);

    await new Promise(r => setTimeout(r, 5000)); // Wait for Meta to process

    console.log("🚀 Publishing IG Story...");
    const igPublish = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media_publish?creation_id=${igContainer.id}&access_token=${PAGE_TOKEN}`, {
        method: 'POST'
    });
    console.log(`🎉 Instagram Story Published! ID: ${igPublish.id}`);


    console.log("\n🚀 --- PUBLISHING FACEBOOK STORY ---");
    try {
        console.log("📦 Uploading to Facebook Page Stories...");
        // This edge works for many pages, though sometimes requires specific permissions.
        // If it fails, IG auto-share usually acts as a fallback.
        const fbStory = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${FB_PAGE_ID}/photo_stories?url=${encodeURIComponent(publicUrl)}&access_token=${PAGE_TOKEN}`, {
            method: 'POST'
        });
        console.log(`🎉 Facebook Story Published! ID: ${fbStory.id}`);
    } catch (err) {
        console.log(`⚠️ Facebook Story API failed (This is common if specific Story permissions are missing). Ensure Instagram is set to auto-share Stories to Facebook.`);
        console.log(`Error details: ${err.message}`);
    }

    console.log("\n✅ ALL STORY PUBLISHING COMPLETE!");
}

main().catch(err => {
    console.error("❌ Fatal Error in story publishing script:");
    console.error(err);
    process.exit(1);
});
