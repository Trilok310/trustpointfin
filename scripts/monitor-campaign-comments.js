/**
 * monitor-campaign-comments.js
 * 
 * Case-insensitive monitor for campaign comments on Facebook & Instagram.
 * Detects "IPO" or "PDF" (any case: ipo, IPO, Ipo, pdf, PDF, Pdf, etc.)
 * Responds via Meta Graph API comment reply with the report PDF link.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const PAGE_TOKEN = process.env.META_PAGE_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const API_VERSION = 'v21.0';
const RESULTS_FILE = path.join(ROOT, 'campaign_publish_results.json');
const REPLIED_LOG = path.join(ROOT, 'campaign_replied_comments.json');

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (data.error) {
        throw new Error(`Meta API Error: ${data.error.message}`);
    }
    return data;
}

// Reply to Facebook Page comment
async function replyToFBComment(commentId, message) {
    const url = `https://graph.facebook.com/${API_VERSION}/${commentId}/comments`;
    return fetchJSON(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: PAGE_TOKEN,
            message: message
        })
    });
}

// Reply to Instagram comment (Uses /{ig-comment-id}/replies)
async function replyToIGComment(commentId, message) {
    const url = `https://graph.facebook.com/${API_VERSION}/${commentId}/replies`;
    return fetchJSON(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: PAGE_TOKEN,
            message: message
        })
    });
}

async function main() {
    if (!PAGE_TOKEN) {
        throw new Error("Missing META_PAGE_TOKEN in environment variables!");
    }

    if (!fs.existsSync(RESULTS_FILE)) {
        console.log("No campaign_publish_results.json found. Run post-custom-campaigns.js first.");
        return;
    }

    const campaigns = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
    let repliedIds = [];
    if (fs.existsSync(REPLIED_LOG)) {
        try {
            repliedIds = JSON.parse(fs.readFileSync(REPLIED_LOG, 'utf8'));
            if (!Array.isArray(repliedIds)) repliedIds = [];
        } catch (e) {
            repliedIds = [];
        }
    }

    console.log("🔍 Scanning comments for campaign triggers (case-insensitive)...");

    for (const c of campaigns) {
        const regex = new RegExp(`\\b${c.keyword}\\b`, 'i');
        console.log(`Checking [${c.name}] for trigger keyword: "${c.keyword}" (Regex: ${regex})`);

        // Check Facebook Comments
        if (c.facebookPostId) {
            try {
                const targetPostId = (FB_PAGE_ID && !c.facebookPostId.includes('_'))
                    ? `${FB_PAGE_ID}_${c.facebookPostId}`
                    : c.facebookPostId;

                const fbCommentsUrl = `https://graph.facebook.com/${API_VERSION}/${targetPostId}/comments?access_token=${PAGE_TOKEN}`;
                const fbData = await fetchJSON(fbCommentsUrl);
                const comments = fbData.data || [];

                for (const cm of comments) {
                    if (repliedIds.includes(cm.id)) continue;

                    if (regex.test(cm.message || '')) {
                        console.log(`🎯 Match found on FB from "${cm.from ? cm.from.name : 'User'}": "${cm.message}"`);
                        const replyMsg = `Hi! Here is your official ${c.keyword.toUpperCase()} Research Report PDF: ${c.pdfUrl}\n\n👉 Open Free Demat Account with Angel One: https://a.aonelink.in/ANGOne/uOwRu9n?utm_source=faceBook&utm_medium=FB&utm_campaign=Nov`;
                        
                        try {
                            await replyToFBComment(cm.id, replyMsg);
                            repliedIds.push(cm.id);
                            console.log(`✅ Replied to FB comment [ID: ${cm.id}]`);
                        } catch (err) {
                            console.error(`❌ Failed to reply to FB comment ${cm.id}: ${err.message}`);
                        }
                    }
                }
            } catch (err) {
                console.warn(`⚠️ Could not query FB comments for ${c.name}: ${err.message}`);
            }
        }

        // Check Instagram Comments
        if (c.instagramMediaId) {
            try {
                const igCommentsUrl = `https://graph.facebook.com/${API_VERSION}/${c.instagramMediaId}/comments?access_token=${PAGE_TOKEN}`;
                const igData = await fetchJSON(igCommentsUrl);
                const comments = igData.data || [];

                for (const cm of comments) {
                    if (repliedIds.includes(cm.id)) continue;

                    if (regex.test(cm.text || '')) {
                        console.log(`🎯 Match found on IG: "${cm.text}"`);
                        const replyMsg = `Hi! Here is your official ${c.keyword.toUpperCase()} Research Report PDF: ${c.pdfUrl} 📈\n\n🔗 Tap the link in our bio to open your Angel One Demat account!`;
                        
                        try {
                            await replyToIGComment(cm.id, replyMsg);
                            repliedIds.push(cm.id);
                            console.log(`✅ Replied to IG comment [ID: ${cm.id}]`);
                        } catch (err) {
                            console.error(`❌ Failed to reply to IG comment ${cm.id}: ${err.message}`);
                        }
                    }
                }
            } catch (err) {
                console.warn(`⚠️ Could not query IG comments for ${c.name}: ${err.message}`);
            }
        }
    }

    fs.writeFileSync(REPLIED_LOG, JSON.stringify(repliedIds, null, 2), 'utf8');
    console.log("🏁 Comment monitoring cycle complete.");
}

main().catch(err => {
    console.error("❌ Fatal Error in Comment Monitor:", err);
    process.exit(1);
});
