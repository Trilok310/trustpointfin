const fs = require('fs');
const path = require('path');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const FEED_IMAGE_PATH = path.join(ROOT, 'dussehra_feed.jpg');
const STORY_IMAGE_PATH = path.join(ROOT, 'dussehra_story.jpg');

const PAGE_TOKEN = process.env.META_PAGE_TOKEN;
const IG_ACCOUNT_ID = process.env.IG_ACCOUNT_ID;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const ANGELONE_LINK = "https://a.aonelink.in/ANGOne/uOwRu9n?utm_source=other&utm_medium=Web&utm_campaign=Nov";

const API_VERSION = 'v20.0';

const CAPTION = `🏹 शुभ विजयादशमी • Happy Dussehra from TrustPointFin! ✨

May this Vijayadashami illuminate your journey with wisdom, resilience, and lasting prosperity.

Just as righteousness triumphs over darkness, let knowledge conquer your financial vulnerabilities:
🏹 Slay High-Interest Debt & Speculation
🛡️ Build an Unshakeable Emergency Shield
📈 Beat Inflation with Disciplined Equity Compounding
💡 Master Emotional Discipline over Market Fear & FOMO

Wishing you and your loved ones a blessed, joyous, and prosperous Dussehra!

#HappyDussehra #Vijayadashami #FinancialWisdom #TrustPointFin #WealthCreation #InvestingPrinciples #DalalStreet #FinancialFreedom`;

const TELEGRAM_CAPTION = `🏹 <b>शुभ विजयादशमी • HAPPY DUSSEHRA FROM TRUSTPOINTFIN</b> ✨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

On this auspicious day of Vijayadashami, may the light of truth and wisdom guide your path to financial freedom.

💡 <b>SLAY YOUR FINANCIAL DEMONS:</b>
• 🏹 <b>Eliminate High-Interest Debt</b> before it compounds against you
• 🛡️ <b>Shield Your Family</b> with an adequate emergency cushion
• 📈 <b>Defeat Inflation</b> through disciplined, long-term equity investing
• 🧠 <b>Master Market Psychology</b> over impulsive fear and speculative FOMO

May the divine bow of discipline empower your journey toward wealth creation and lasting peace of mind.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 <i>Start your investment journey with confidence. Open your free AngelOne Demat account:</i>
👉 <a href="${ANGELONE_LINK}"><b>TrustPointFin Referral</b></a>

<i>Warm festive wishes to you and your family from the entire TrustPointFin team!</i>`;

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (data.error) {
        throw new Error(data.error.message || JSON.stringify(data.error));
    }
    return data;
}

async function getRawUrl(filename) {
    return `https://raw.githubusercontent.com/trilok310/trustpointfin/main/${filename}?t=${Date.now()}`;
}

async function publishMetaFeed() {
    if (!PAGE_TOKEN || !FB_PAGE_ID) {
        console.log("⚠️ Meta credentials missing. Skipping Meta Feed.");
        return;
    }

    console.log("\n🚀 --- PUBLISHING FACEBOOK FEED POST ---");
    try {
        const fileData = fs.readFileSync(FEED_IMAGE_PATH);
        const formData = new FormData();
        formData.append('access_token', PAGE_TOKEN);
        formData.append('source', new Blob([fileData]), 'dussehra_feed.jpg');
        formData.append('caption', CAPTION);

        const fbRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${FB_PAGE_ID}/photos`, {
            method: 'POST',
            body: formData
        });
        console.log(`🎉 Facebook Feed Post Published! ID: ${fbRes.id}`);
    } catch (e) {
        console.error("❌ Facebook Feed Error:", e.message);
    }

    if (IG_ACCOUNT_ID) {
        console.log("\n🚀 --- PUBLISHING INSTAGRAM FEED POST ---");
        try {
            const rawFeedUrl = await getRawUrl('dussehra_feed.jpg');
            const containerRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media?image_url=${encodeURIComponent(rawFeedUrl)}&caption=${encodeURIComponent(CAPTION)}&access_token=${PAGE_TOKEN}`, {
                method: 'POST'
            });

            console.log(`📦 IG Feed Container Created: ${containerRes.id}`);
            await new Promise(r => setTimeout(r, 6000));

            const publishRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media_publish?creation_id=${containerRes.id}&access_token=${PAGE_TOKEN}`, {
                method: 'POST'
            });
            console.log(`🎉 Instagram Feed Post Published! Media ID: ${publishRes.id}`);
        } catch (e) {
            console.error("❌ Instagram Feed Error:", e.message);
        }
    }
}

async function publishMetaStory() {
    if (!PAGE_TOKEN || !IG_ACCOUNT_ID) {
        console.log("⚠️ Meta credentials missing. Skipping Stories.");
        return;
    }

    console.log("\n🚀 --- PUBLISHING INSTAGRAM STORY ---");
    try {
        const rawStoryUrl = await getRawUrl('dussehra_story.jpg');
        const storyContainer = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media?image_url=${encodeURIComponent(rawStoryUrl)}&media_type=STORIES&access_token=${PAGE_TOKEN}`, {
            method: 'POST'
        });

        console.log(`📦 IG Story Container Created: ${storyContainer.id}`);
        await new Promise(r => setTimeout(r, 6000));

        const storyPublish = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media_publish?creation_id=${storyContainer.id}&access_token=${PAGE_TOKEN}`, {
            method: 'POST'
        });
        console.log(`🎉 Instagram Story Published! ID: ${storyPublish.id}`);
    } catch (e) {
        console.error("❌ Instagram Story Error:", e.message);
    }

    if (FB_PAGE_ID) {
        console.log("\n🚀 --- PUBLISHING FACEBOOK STORY ---");
        try {
            const rawStoryUrl = await getRawUrl('dussehra_story.jpg');
            const fbStory = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${FB_PAGE_ID}/photo_stories?url=${encodeURIComponent(rawStoryUrl)}&access_token=${PAGE_TOKEN}`, {
                method: 'POST'
            });
            console.log(`🎉 Facebook Story Published! ID: ${fbStory.id}`);
        } catch (e) {
            console.log(`⚠️ Facebook Story API note: ${e.message}`);
        }
    }
}

async function publishTelegram() {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.log("⚠️ Telegram credentials missing. Skipping Telegram.");
        return;
    }

    console.log("\n🚀 --- PUBLISHING TO TELEGRAM CHANNEL ---");
    try {
        const imageBuffer = fs.readFileSync(FEED_IMAGE_PATH);
        const formData = new FormData();
        formData.append('chat_id', TELEGRAM_CHAT_ID);
        formData.append('photo', new Blob([imageBuffer]), 'dussehra_celebration.jpg');
        formData.append('caption', TELEGRAM_CAPTION);
        formData.append('parse_mode', 'HTML');

        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (data.ok) {
            console.log(`🎉 Telegram Post Published! Message ID: ${data.result.message_id}`);
        } else {
            console.error("❌ Telegram API Error:", data.description);
        }
    } catch (e) {
        console.error("❌ Telegram Publish Error:", e.message);
    }
}

async function main() {
    console.log("🌟 Starting TrustPointFin Festive Dussehra Publishing...");

    if (!fs.existsSync(FEED_IMAGE_PATH) || !fs.existsSync(STORY_IMAGE_PATH)) {
        throw new Error("Missing dussehra_feed.jpg or dussehra_story.jpg in repository root!");
    }

    await publishMetaFeed();
    await publishMetaStory();
    await publishTelegram();

    console.log("\n✅ All Festive Dussehra Publications Dispatched!");
}

main().catch(err => {
    console.error("❌ Fatal Error in Festive Publisher:", err);
    process.exit(1);
});
