const fs = require('fs');
const path = require('path');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const SLIDES_DIR = path.join(ROOT, 'slides');
const SOCIAL_MD = path.join(ROOT, 'latest_social_media.md');

const PAGE_TOKEN = process.env.META_PAGE_TOKEN;
const IG_ACCOUNT_ID = process.env.IG_ACCOUNT_ID;
const FB_PAGE_ID = process.env.FB_PAGE_ID;

const API_VERSION = 'v20.0';

// Fetch polyfill if needed, but Node 20 has native fetch
async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (data.error) {
        throw new Error(`Meta API Error: ${data.error.message}`);
    }
    return data;
}

// Upload a file to a temporary public host so Meta can download it for Instagram
async function uploadToTempHost(filePath) {
    console.log(`📤 Uploading ${path.basename(filePath)} to temporary host for IG...`);
    const fileData = fs.readFileSync(filePath);
    
    // We use tmpfiles.org as a temporary bridge to provide Meta with a public URL
    const formData = new FormData();
    formData.append('file', new Blob([fileData]), path.basename(filePath));
    
    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData
    });
    
    if (!res.ok) throw new Error("Failed to upload to temp host");
    
    const json = await res.json();
    // Convert regular URL to direct download URL
    const directUrl = json.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
    console.log(`🔗 Got temporary public URL: ${directUrl}`);
    return directUrl;
}

// Upload raw bytes directly to Facebook Pages (Unpublished)
async function uploadToFacebookPage(filePath) {
    console.log(`📤 Uploading ${path.basename(filePath)} to Facebook Page...`);
    const fileData = fs.readFileSync(filePath);
    
    const formData = new FormData();
    formData.append('access_token', PAGE_TOKEN);
    formData.append('published', 'false'); // Do not publish immediately
    formData.append('source', new Blob([fileData]), path.basename(filePath));

    const data = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${FB_PAGE_ID}/photos`, {
        method: 'POST',
        body: formData
    });
    
    console.log(`✅ Uploaded to FB, Photo ID: ${data.id}`);
    return data.id;
}

async function main() {
    if (!PAGE_TOKEN || !IG_ACCOUNT_ID || !FB_PAGE_ID) {
        console.error("❌ Missing Meta credentials in environment variables!");
        process.exit(1);
    }

    if (!fs.existsSync(SLIDES_DIR)) {
        console.error("❌ Slides directory not found!");
        process.exit(1);
    }

    const slideFiles = fs.readdirSync(SLIDES_DIR)
        .filter(f => f.endsWith('.jpg'))
        .sort((a, b) => {
            const numA = parseInt(a.replace(/\D/g, ''));
            const numB = parseInt(b.replace(/\D/g, ''));
            return numA - numB;
        });

    if (slideFiles.length === 0) {
        console.error("❌ No slides found in directory!");
        process.exit(1);
    }

    const socialMdContent = fs.readFileSync(SOCIAL_MD, 'utf-8');
    
    const igMatch = socialMdContent.match(/## 📸 Instagram Caption\n\n([\s\S]*?)\n\n---/);
    const fbMatch = socialMdContent.match(/## 👥 Facebook Post\n\n([\s\S]*?)\n\n---/);
    
    const igCaption = igMatch ? igMatch[1].trim() : "New Insights from TrustPointFin!";
    const fbCaption = fbMatch ? fbMatch[1].trim() : "Check out our latest insights.";

    console.log("Found", slideFiles.length, "slides to publish.");

    console.log("\n🚀 --- STARTING FACEBOOK PUBLISHING ---");
    const fbPhotoIds = [];
    for (const file of slideFiles) {
        const id = await uploadToFacebookPage(path.join(SLIDES_DIR, file));
        fbPhotoIds.push(id);
    }

    console.log("📦 Creating Facebook Multi-Photo Post...");
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

    console.log("\n🚀 --- STARTING INSTAGRAM CAROUSEL PUBLISHING ---");
    const igContainerIds = [];
    
    for (const file of slideFiles) {
        const publicUrl = await uploadToTempHost(path.join(SLIDES_DIR, file));
        
        console.log(`📦 Creating IG Item Container for ${file}...`);
        const containerRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media?image_url=${encodeURIComponent(publicUrl)}&is_carousel_item=true&access_token=${PAGE_TOKEN}`, {
            method: 'POST'
        });
        console.log(`✅ IG Item Container Created: ${containerRes.id}`);
        igContainerIds.push(containerRes.id);
        
        await new Promise(r => setTimeout(r, 3000));
    }

    console.log("📦 Bundling IG Items into Carousel Container...");
    const childrenParam = igContainerIds.join(',');
    const carouselRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media?media_type=CAROUSEL&children=${childrenParam}&caption=${encodeURIComponent(igCaption)}&access_token=${PAGE_TOKEN}`, {
        method: 'POST'
    });
    console.log(`✅ IG Carousel Container Created: ${carouselRes.id}`);

    console.log("⏳ Waiting 5 seconds for Meta backend processing...");
    await new Promise(r => setTimeout(r, 5000));

    console.log("🚀 Publishing Carousel to Instagram Feed...");
    const publishRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media_publish?creation_id=${carouselRes.id}&access_token=${PAGE_TOKEN}`, {
        method: 'POST'
    });
    console.log(`🎉 Instagram Carousel Published Successfully! IG Media ID: ${publishRes.id}`);

    console.log("\n✅ ALL SOCIAL MEDIA PUBLISHING COMPLETE!");
}

main().catch(err => {
    console.error("❌ Fatal Error in publishing script:");
    console.error(err);
    process.exit(1);
});
