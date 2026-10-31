/**
 * TrustPointFin - Automated Facebook Page Cleanup Script
 * 
 * Rules:
 * 1. Keeps ALL posts published AFTER 21 September 2026.
 * 2. Identifies all posts published BEFORE 21 September 2026.
 * 3. Calculates total engagement (Reactions + Comments + Shares) for each pre-Sep 21 post.
 * 4. Retains the TOP 5 highest engagement posts before Sep 21.
 * 5. Calls `is_hidden=true` to cleanly hide all remaining older posts from public visitors.
 */

const PAGE_TOKEN = process.env.META_PAGE_TOKEN;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const API_VERSION = 'v20.0';
const CUTOFF_DATE = new Date('2026-09-21T00:00:00Z');

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }
    return data;
}

async function hidePost(postId) {
    const url = `https://graph.facebook.com/${API_VERSION}/${postId}`;
    const formData = new URLSearchParams();
    formData.append('is_hidden', 'true');
    formData.append('access_token', PAGE_TOKEN);

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
    });
    const data = await res.json();
    return data;
}

async function main() {
    console.log("==================================================");
    console.log("   🛡️ TRUSTPOINTFIN FACEBOOK CLEANUP PIPELINE");
    console.log("==================================================");

    if (!PAGE_TOKEN || !FB_PAGE_ID) {
        throw new Error("Missing META_PAGE_TOKEN or FB_PAGE_ID in environment variables!");
    }

    console.log(`Connecting to Facebook Page ID: ${FB_PAGE_ID}...`);

    // 1. Fetch published feed posts with reactions, comments, and shares
    let allPosts = [];
    let nextUrl = `https://graph.facebook.com/${API_VERSION}/${FB_PAGE_ID}/feed?fields=id,created_time,message,shares,reactions.summary(total_count),comments.summary(total_count)&limit=100&access_token=${PAGE_TOKEN}`;

    while (nextUrl && allPosts.length < 500) {
        console.log(`Fetching batch from Facebook Graph API...`);
        const feedData = await fetchJSON(nextUrl);
        if (feedData.data && feedData.data.length > 0) {
            allPosts = allPosts.concat(feedData.data);
        }
        nextUrl = feedData.paging && feedData.paging.next ? feedData.paging.next : null;
    }

    console.log(`\nTotal posts retrieved from Page: ${allPosts.length}`);

    // 2. Partition into after-cutoff and before-cutoff
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

    console.log(`\n📌 Posts after 21-Sep-2026: ${postsAfterCutoff.length} (ALL KEPT LIVE)`);
    console.log(`📌 Posts before 21-Sep-2026: ${postsBeforeCutoff.length}`);

    // 3. Sort pre-cutoff posts by total engagement descending
    postsBeforeCutoff.sort((a, b) => b.engagement - a.engagement);

    // Keep top 5
    const top5ToKeep = postsBeforeCutoff.slice(0, 5);
    const postsToHide = postsBeforeCutoff.slice(5);

    console.log("\n==================================================");
    console.log("   🏆 TOP 5 HIGH-ENGAGEMENT POSTS (KEPT LIVE)");
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
        // Small throttle to stay well within Meta rate limits
        await new Promise(r => setTimeout(r, 400));
    }

    console.log(`\n🎉 Facebook Cleanup Complete!`);
    console.log(`- Kept live: ${postsAfterCutoff.length} posts published after Sep 21`);
    console.log(`- Kept live: ${top5ToKeep.length} top-engagement posts published before Sep 21`);
    console.log(`- Successfully hidden from timeline: ${hiddenCount} posts`);
}

main().catch(err => {
    console.error("❌ Fatal Error in Facebook Cleanup:", err);
    process.exit(1);
});
