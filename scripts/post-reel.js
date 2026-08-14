const fs = require('fs');
const path = require('path');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const REEL_VIDEO_PATH = path.join(ROOT, 'reel.mp4');

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
    return `https://raw.githubusercontent.com/trilok310/trustpointfin/main/reel.mp4?t=${Date.now()}`;
}

async function checkStatus(igContainerId) {
    console.log(`⏳ Checking status of IG Container ${igContainerId}...`);
    let isReady = false;
    let attempts = 0;
    while (!isReady && attempts < 12) {
        attempts++;
        await new Promise(r => setTimeout(r, 10000)); // wait 10s
        const statusRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${igContainerId}?fields=status_code&access_token=${PAGE_TOKEN}`);
        console.log(`Status: ${statusRes.status_code}`);
        if (statusRes.status_code === 'FINISHED') {
            isReady = true;
        } else if (statusRes.status_code === 'ERROR') {
            throw new Error("Meta backend failed to process the video.");
        }
    }
    if (!isReady) throw new Error("Timed out waiting for Meta to process the video.");
}

async function main() {
    if (!PAGE_TOKEN || !IG_ACCOUNT_ID || !FB_PAGE_ID) {
        console.error("❌ Missing Meta credentials!");
        process.exit(1);
    }

    if (!fs.existsSync(REEL_VIDEO_PATH)) {
        console.error("❌ reel.mp4 not found!");
        process.exit(1);
    }

    const publicUrl = await getGithubRawUrl();
    console.log(`🔗 Using GitHub Raw URL: ${publicUrl}`);
    const caption = "Learn these powerful financial concepts in just 15 seconds! 🚀 #Finance #Investing #Wealth";

    console.log("\n🚀 --- PUBLISHING INSTAGRAM REEL ---");
    console.log("📦 Creating IG Reel Container...");
    const igContainer = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media?video_url=${encodeURIComponent(publicUrl)}&media_type=REELS&caption=${encodeURIComponent(caption)}&access_token=${PAGE_TOKEN}`, {
        method: 'POST'
    });
    console.log(`✅ IG Reel Container Created: ${igContainer.id}`);

    // Reels require waiting for the Meta backend to process the video before publishing
    await checkStatus(igContainer.id);

    console.log("🚀 Publishing IG Reel...");
    const igPublish = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media_publish?creation_id=${igContainer.id}&access_token=${PAGE_TOKEN}`, {
        method: 'POST'
    });
    console.log(`🎉 Instagram Reel Published! ID: ${igPublish.id}`);

    console.log("\n🚀 --- PUBLISHING FACEBOOK REEL ---");
    try {
        console.log("📦 Initializing Facebook Page Reels upload...");
        
        const fileStat = fs.statSync(REEL_VIDEO_PATH);
        const fileData = fs.readFileSync(REEL_VIDEO_PATH);

        // 1. Start Phase
        const initRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${FB_PAGE_ID}/video_reels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                upload_phase: 'start',
                access_token: PAGE_TOKEN
            })
        });
        
        const videoId = initRes.video_id;
        const uploadUrl = initRes.upload_url;
        console.log(`✅ FB Session Started. Video ID: ${videoId}`);

        // 2. Upload Phase
        console.log("📤 Uploading binary video data to Facebook...");
        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `OAuth ${PAGE_TOKEN}`,
                'offset': '0',
                'file_size': fileStat.size.toString()
            },
            body: fileData
        });
        
        const uploadJson = await uploadRes.json();
        if (uploadJson.error) throw new Error(uploadJson.error.message);
        console.log("✅ Binary upload complete.");

        // 3. Publish Phase
        console.log("🚀 Publishing Facebook Reel...");
        const publishRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${FB_PAGE_ID}/video_reels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                upload_phase: 'finish',
                access_token: PAGE_TOKEN,
                video_id: videoId,
                video_state: 'PUBLISHED',
                description: caption
            })
        });
        console.log(`🎉 Facebook Reel Published! Success: ${publishRes.success}`);

    } catch (err) {
        console.log(`⚠️ Facebook Reel API failed: ${err.message}`);
        console.log("💡 Tip: If this fails, the easiest solution is to turn on 'Auto-Share to Facebook' in your Instagram App settings!");
    }

    console.log("\n✅ ALL REEL PUBLISHING COMPLETE!");
}

main().catch(err => {
    console.error("❌ Fatal Error in reel publishing script:");
    console.error(err);
    process.exit(1);
});
