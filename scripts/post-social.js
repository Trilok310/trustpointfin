const fs = require('fs');
const path = require('path');
const stateManager = require('./state-manager.js');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const SLIDES_DIR = path.join(ROOT, 'slides');
const SOCIAL_MD = path.join(ROOT, 'latest_social_media.md');

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

async function getGithubRawUrl(fileName) {
    const url = `https://raw.githubusercontent.com/trilok310/trustpointfin/main/slides/${fileName}?t=${Date.now()}`;
    console.log(`🔗 Using GitHub Raw URL: ${url}`);
    return url;
}

async function uploadToFacebookPage(filePath) {
    console.log(`📤 Uploading ${path.basename(filePath)} to Facebook Page...`);
    const fileData = fs.readFileSync(filePath);
    const formData = new FormData();
    formData.append('access_token', PAGE_TOKEN);
    formData.append('published', 'false');
    formData.append('source', new Blob([fileData]), path.basename(filePath));

    const data = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${FB_PAGE_ID}/photos`, {
        method: 'POST',
        body: formData
    });
    return data.id;
}

async function publishFacebook(slideFiles, fbCaption) {
    console.log("\n🚀 --- STARTING FACEBOOK PUBLISHING ---");
    const fbPhotoIds = [];
    for (const file of slideFiles) {
        const id = await uploadToFacebookPage(path.join(SLIDES_DIR, file));
        fbPhotoIds.push(id);
    }
    const fbAttachedMedia = fbPhotoIds.map(id => ({ media_fbid: id }));
    const fbPostRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${FB_PAGE_ID}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: PAGE_TOKEN,
            message: fbCaption,
            attached_media: fbAttachedMedia
        })
    });
    console.log(`🎉 Facebook Post Published Successfully! Post ID: ${fbPostRes.id}`);
}

async function publishInstagram(slideFiles, igCaption) {
    console.log("\n🚀 --- STARTING INSTAGRAM CAROUSEL PUBLISHING ---");
    const igContainerIds = [];
    for (const file of slideFiles) {
        const publicUrl = await getGithubRawUrl(file);
        const containerRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media?image_url=${encodeURIComponent(publicUrl)}&is_carousel_item=true&access_token=${PAGE_TOKEN}`, {
            method: 'POST'
        });
        igContainerIds.push(containerRes.id);
        await new Promise(r => setTimeout(r, 3000));
    }

    const childrenParam = igContainerIds.join(',');
    const carouselRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media?media_type=CAROUSEL&children=${childrenParam}&caption=${encodeURIComponent(igCaption)}&access_token=${PAGE_TOKEN}`, {
        method: 'POST'
    });

    await new Promise(r => setTimeout(r, 5000));
    const publishRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media_publish?creation_id=${carouselRes.id}&access_token=${PAGE_TOKEN}`, {
        method: 'POST'
    });
    console.log(`🎉 Instagram Carousel Published Successfully! IG Media ID: ${publishRes.id}`);

    // Optional Story
    try {
        console.log("\n🚀 --- STARTING INSTAGRAM STORY PUBLISHING ---");
        const storyUrl = await getGithubRawUrl(slideFiles[0]);
        const storyContainerRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media?image_url=${encodeURIComponent(storyUrl)}&media_type=STORIES&access_token=${PAGE_TOKEN}`, {
            method: 'POST'
        });
        await new Promise(r => setTimeout(r, 5000));
        await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media_publish?creation_id=${storyContainerRes.id}&access_token=${PAGE_TOKEN}`, {
            method: 'POST'
        });
        console.log(`🎉 Instagram Story Published Successfully!`);
    } catch (e) {
        console.log(`⚠️ IG Story failed (Non-fatal): ${e.message}`);
    }
}

async function main() {
    if (!PAGE_TOKEN || !IG_ACCOUNT_ID || !FB_PAGE_ID) {
        console.error("❌ Missing Meta credentials in environment variables!");
        process.exit(0); // Soft exit in dev
    }

    const slideFiles = fs.readdirSync(SLIDES_DIR)
        .filter(f => f.startsWith('final_slide_') && f.endsWith('.jpg'))
        .sort((a, b) => parseInt(a.replace(/\D/g, '')) - parseInt(b.replace(/\D/g, '')));

    if (slideFiles.length === 0) {
        console.error("❌ No slides found in directory!");
        process.exit(1);
    }

    const socialMdContent = fs.readFileSync(SOCIAL_MD, 'utf-8');
    const captionMatch = socialMdContent.match(/## 📝 Caption\n\n([\s\S]*?)\n\n---/);
    const captionText = captionMatch ? captionMatch[1].trim() : "New Insights from TrustPointFin!";

    let igStatus = "PENDING";
    let fbStatus = "PENDING";
    let failureReason = "";

    try {
        await publishInstagram(slideFiles, captionText);
        igStatus = "SUCCESS";
    } catch (err) {
        console.error("❌ Instagram Publishing Failed:", err.message);
        igStatus = "FAILED";
        failureReason += \`IG Error: \${err.message} | \`;
    }

    try {
        await publishFacebook(slideFiles, captionText);
        fbStatus = "SUCCESS";
    } catch (err) {
        console.error("❌ Facebook Publishing Failed:", err.message);
        fbStatus = "FAILED";
        failureReason += \`FB Error: \${err.message}\`;
    }

    stateManager.updateState({ 
        instagram_status: igStatus, 
        facebook_status: fbStatus,
        failure_reason: failureReason || null 
    }, false);

    const finalState = stateManager.finalizeState();
    stateManager.printGitHubSummary(finalState);

    if (finalState.final_status === 'FAILED') {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

main();
