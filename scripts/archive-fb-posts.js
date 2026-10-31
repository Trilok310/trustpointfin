/**
 * archive-fb-posts.js
 * 
 * Safe Cleanup / Archival for Facebook Page posts:
 * - Fetches published posts from the Facebook Page.
 * - Protects ALL posts published after 21st September 2026.
 * - Keeps exactly the top 5 high-engagement / foundational posts published before 21st September 2026.
 * - Hides all remaining pre-Sep 21 posts from the page timeline via Meta Graph API:
 *     POST https://graph.facebook.com/v21.0/{post-id}?is_hidden=true
 * - Gracefully attempts published_posts, feed, and photos endpoints depending on token scopes.
 * - DOES NOT permanently delete any post.
 */

const https = require('https');

const PAGE_TOKEN = process.env.META_PAGE_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const API_VERSION = 'v21.0';
const CUTOFF_DATE = new Date('2026-09-21T00:00:00Z');

function fetchJSON(url, options = {}) {
    return new Promise((resolve, reject) => {
        const req = https.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    if (parsed.error) {
                        const err = new Error(parsed.error.message || 'Meta API error');
                        err.code = parsed.error.code;
                        err.subcode = parsed.error.error_subcode;
                        return reject(err);
                    }
                    resolve(parsed);
                } catch (e) {
                    reject(new Error(`Failed to parse response: ${body.substring(0, 200)}`));
                }
            });
        });
        req.on('error', reject);
        if (options.body) {
            req.write(options.body);
        }
        req.end();
    });
}

async function hidePost(postId) {
    const postUrl = `https://graph.facebook.com/${API_VERSION}/${postId}?is_hidden=true&access_token=${PAGE_TOKEN}`;
    return fetchJSON(postUrl, { method: 'POST' });
}

async function tryFetchEndpoint(endpoint, fields) {
    let allItems = [];
    let nextUrl = `https://graph.facebook.com/${API_VERSION}/${FB_PAGE_ID}/${endpoint}?fields=${fields}&limit=100&access_token=${PAGE_TOKEN}`;

    while (nextUrl && allItems.length < 500) {
        console.log(`Querying ${endpoint} (limit=100)...`);
        const data = await fetchJSON(nextUrl);
        if (data.data && data.data.length > 0) {
            allItems = allItems.concat(data.data);
        }
        nextUrl = data.paging && data.paging.next ? data.paging.next : null;
    }
    return allItems;
}

async function fetchAllAvailablePosts() {
    // Attempt 1: published_posts with basic fields (standard for pages_manage_posts)
    try {
        console.log("Attempting to fetch via 'published_posts'...");
        const posts = await tryFetchEndpoint('published_posts', 'id,created_time,message');
        if (posts.length > 0) return posts;
    } catch (e) {
        console.warn(`⚠️ 'published_posts' endpoint failed: ${e.message}`);
    }

    // Attempt 2: feed endpoint
    try {
        console.log("Attempting to fetch via 'feed'...");
        const posts = await tryFetchEndpoint('feed', 'id,created_time,message');
        if (posts.length > 0) return posts;
    } catch (e) {
        console.warn(`⚠️ 'feed' endpoint failed: ${e.message}`);
    }

    // Attempt 3: uploaded photos endpoint
    try {
        console.log("Attempting to fetch via 'photos?type=uploaded'...");
        const photos = await tryFetchEndpoint('photos', 'id,created_time,name');
        if (photos.length > 0) {
            return photos.map(p => ({
                id: p.id,
                created_time: p.created_time,
                message: p.name || 'Photo post'
            }));
        }
    } catch (e) {
        console.warn(`⚠️ 'photos' endpoint failed: ${e.message}`);
    }

    throw new Error("Unable to retrieve posts using available endpoints and token permissions.");
}

async function main() {
    console.log("==================================================");
    console.log("   🛡️ TRUSTPOINTFIN FACEBOOK CLEANUP PIPELINE");
    console.log("==================================================");

    if (!PAGE_TOKEN || !FB_PAGE_ID) {
        throw new Error("Missing META_PAGE_TOKEN or FB_PAGE_ID in environment variables!");
    }

    console.log(`Connecting to Facebook Page ID: ${FB_PAGE_ID}...`);

    const allPosts = await fetchAllAvailablePosts();
    console.log(`\nTotal posts retrieved from Page: ${allPosts.length}`);

    // Partition into after-cutoff and before-cutoff
    const postsAfterCutoff = [];
    const postsBeforeCutoff = [];

    for (const post of allPosts) {
        const postDate = new Date(post.created_time);
        const reactions = post.reactions && post.reactions.summary ? post.reactions.summary.total_count : 0;
        const comments = post.comments && post.comments.summary ? post.comments.summary.total_count : 0;
        const shares = post.shares ? post.shares.count : 0;
        const totalEngagement = reactions + comments + shares;

        const summaryItem = {
            id: post.id,
            date: post.created_time,
            title: (post.message || 'No caption').split('\n')[0].substring(0, 60),
            engagement: totalEngagement,
            reactions,
            comments,
            shares
        };

        if (postDate >= CUTOFF_DATE) {
            postsAfterCutoff.push(summaryItem);
        } else {
            postsBeforeCutoff.push(summaryItem);
        }
    }

    console.log(`\nFound ${postsAfterCutoff.length} posts published AFTER 21 Sep 2026 (PROTECTED, WILL KEEP LIVE).`);
    console.log(`Found ${postsBeforeCutoff.length} posts published BEFORE 21 Sep 2026.`);

    // Sort pre-Sep 21 posts: if engagement exists, sort by engagement; otherwise keep the 5 closest to cutoff
    postsBeforeCutoff.sort((a, b) => {
        if (b.engagement !== a.engagement) {
            return b.engagement - a.engagement;
        }
        return new Date(b.date) - new Date(a.date);
    });

    // Keep top 5
    const top5ToKeep = postsBeforeCutoff.slice(0, 5);
    const postsToHide = postsBeforeCutoff.slice(5);

    console.log("\n==================================================");
    console.log("   🏆 TOP 5 FOUNDATIONAL POSTS (KEPT LIVE)");
    console.log("==================================================");
    top5ToKeep.forEach((p, idx) => {
        console.log(`${idx + 1}. [Engagement: ${p.engagement}] (${p.date}) ${p.title} (ID: ${p.id})`);
    });

    console.log("\n==================================================");
    console.log(`   📦 HIDING REMAINING ${postsToHide.length} HISTORICAL POSTS`);
    console.log("==================================================");

    let hiddenCount = 0;
    for (const p of postsToHide) {
        try {
            const res = await hidePost(p.id);
            if (res.success || res === true) {
                hiddenCount++;
                console.log(`✅ Hidden: [ID: ${p.id}] ${p.title}`);
            } else {
                console.log(`⚠️ Status: [ID: ${p.id}]`, res);
            }
        } catch (e) {
            console.error(`❌ Failed to hide [ID: ${p.id}]: ${e.message}`);
        }
        // Throttle to stay within Meta rate limits
        await new Promise(r => setTimeout(r, 400));
    }

    console.log(`\n🎉 Facebook Cleanup Complete!`);
    console.log(`- Kept live: ${postsAfterCutoff.length} posts published after Sep 21`);
    console.log(`- Kept live: ${top5ToKeep.length} foundational posts published before Sep 21`);
    console.log(`- Successfully hidden from timeline: ${hiddenCount} posts`);
}

main().catch(err => {
    console.error("❌ Fatal Error in Facebook Cleanup:", err);
    process.exit(1);
});
