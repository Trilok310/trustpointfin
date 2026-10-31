/**
 * post-custom-campaigns.js
 * 
 * Auto-posts custom marketing campaigns to Instagram and Facebook Page.
 * Respects channel-specific UTM tracking links and WhatsApp vanity redirect without exposing phone numbers.
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.env.GITHUB_WORKSPACE || path.join(__dirname, '..');
const PAGE_TOKEN = process.env.META_PAGE_TOKEN;
const IG_ACCOUNT_ID = process.env.IG_ACCOUNT_ID;
const FB_PAGE_ID = process.env.FB_PAGE_ID;
const API_VERSION = 'v21.0';

const FB_REFERRAL_LINK = "https://a.aonelink.in/ANGOne/uOwRu9n?utm_source=faceBook&utm_medium=FB&utm_campaign=Nov";
const IG_REFERRAL_LINK = "https://a.aonelink.in/ANGOne/uOwRu9n?utm_source=other&utm_medium=IG&utm_campaign=Nov";
const WA_LINK = "https://trustpointfin.org/whatsapp";

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (data.error) {
        throw new Error(`Meta API Error: ${data.error.message} (Code: ${data.error.code})`);
    }
    return data;
}

async function uploadToFacebookPage(filePath) {
    console.log(`📤 Uploading image ${path.basename(filePath)} to Facebook Page...`);
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

async function publishFacebookPost(imagePath, caption) {
    console.log(`🚀 Publishing to Facebook Page [${FB_PAGE_ID}]...`);
    const photoId = await uploadToFacebookPage(imagePath);
    const fbRes = await fetchJSON(`https://graph.facebook.com/${API_VERSION}/${FB_PAGE_ID}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            access_token: PAGE_TOKEN,
            message: caption,
            attached_media: [{ media_fbid: photoId }]
        })
    });
    console.log(`✅ Facebook Post Published! ID: ${fbRes.id}`);
    return fbRes.id;
}

async function publishInstagramPost(rawImageUrl, caption) {
    console.log(`🚀 Creating Instagram Container for [${IG_ACCOUNT_ID}]...`);
    const containerRes = await fetchJSON(
        `https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media?image_url=${encodeURIComponent(rawImageUrl)}&caption=${encodeURIComponent(caption)}&access_token=${PAGE_TOKEN}`,
        { method: 'POST' }
    );
    console.log(`⏳ Container created (ID: ${containerRes.id}). Waiting 8s for processing...`);
    await new Promise(r => setTimeout(r, 8000));

    console.log(`🚀 Publishing Instagram Media...`);
    const publishRes = await fetchJSON(
        `https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/media_publish?creation_id=${containerRes.id}&access_token=${PAGE_TOKEN}`,
        { method: 'POST' }
    );
    console.log(`✅ Instagram Post Published! ID: ${publishRes.id}`);
    return publishRes.id;
}

async function main() {
    console.log("==================================================");
    console.log("   🚀 TRUSTPOINTFIN DUAL-CAMPAIGN PUBLISHING PIPELINE");
    console.log("==================================================");

    if (!PAGE_TOKEN || !IG_ACCOUNT_ID || !FB_PAGE_ID) {
        throw new Error("Missing Meta credentials (META_PAGE_TOKEN, IG_ACCOUNT_ID, or FB_PAGE_ID) in environment variables!");
    }

    const campaigns = [
        {
            name: "Campaign #1: 5 Blockbuster Mainboard IPOs",
            imageFile: "TrustPoint_Ad_2_Upcoming_Mega_IPOs.png",
            keyword: "IPO",
            pdfFile: "TrustPoint_Upcoming_Mega_IPO_Report_v2.pdf",
            baseCaption: `5 Blockbuster Mainboard IPOs Lining Up for 2026–27! 🚨📈

India's primary market is preparing for a historic wave of consumer, fintech, and quick-commerce listings:
1️⃣ Flipkart (@flipkart) — E-Commerce Giant (₹3.0L+ Cr Est. Valuation Watch)
2️⃣ PhonePe (@phonepe) — #1 UPI & Digital Payments Ecosystem
3️⃣ Haldiram's Snacks Food (@haldirams_official) — High-RoCE FMCG & QSR Powerhouse
4️⃣ Zepto (@zeptonow) — Quick-Commerce Unicorn
5️⃣ CarDekho (@cardekhoindia) — Auto-Tech & FinTech Platform

💡 3 SEBI-Compliant Rules Smart Retail Investors Follow Before Bidding:
✅ Check Day-2 Institutional (QIB) Demand (>15x): Never bid blindly on grey market hype.
✅ Use 24x7 Pre-Open Application: Apply 1 day early with zero last-day UPI failure.
✅ SEBI-Compliant Family Accounts: Never apply multiple bids from 1 PAN (gets rejected!). Instead, each eligible adult family member can legally apply 1 Retail Lot from their own individual Demat & own linked bank/UPI!

📩 Comment "IPO" below to get the Full 2-Page Mainboard IPO DRHP Scorecard PDF in your DM!

Tag a friend or family member who shouldn't miss these upcoming IPOs! 👇

#UpcomingIPO #FlipkartIPO #PhonePeIPO #Haldirams #Zepto #CarDekho #MainboardIPO #IPOAlert #StockMarketIndia #IndianStockMarket #Nifty50 #DalalStreet #InvestingIndia #TrustPointFin #DematAccount #SmartInvesting #WealthCreation`
        },
        {
            name: "Campaign #2: 2027 India Megatrends & Order-Book Leaders",
            imageFile: "TrustPoint_Ad_1_Megatrends_3DCoins.png",
            keyword: "PDF",
            pdfFile: "TrustPoint_2027_Megatrends_Report_v2.pdf",
            baseCaption: `Order-Book Leaders Created 3X More Wealth Than Nifty 50 in 5 Years! 📊🔥

While a ₹10,000/month SIP in the broad Nifty 50 grew to ₹10.4 Lakhs (13.8% CAGR), top institutional Order-Book & Capex Leaders with 3.5x+ revenue visibility compounded to ₹24.8 Lakhs (31.4% CAGR)!

Inside our 2027 India Megatrends Research Report by TrustPoint Fin:
🔹 Where FIIs & Domestic Mutual Funds are deploying ₹16.6 Lakh Cr across Defence, HVDC Power Grids & Semiconductors
🔹 Ranked Order-Book Leaders including HAL (@hal_india), Bharat Electronics (BEL), Hitachi Energy, and Dixon Technologies
🔹 How to unlock VIP Stocks #5 & #6 (Railway Kavach & Transformer Leaders) for ₹0

📩 Comment "PDF" below to get the Full 2027 India Megatrends Research Report PDF in your DM!

#StockMarketIndia #Nifty50 #MultibaggerStocks #DefenceStocks #HAL #BharatElectronics #CapexIndia #MakeInIndia #IndianShareMarket #MutualFundsIndia #SIP #WealthManagement #TrustPointFin #InvestingTips`
        }
    ];

    const results = [];

    for (const c of campaigns) {
        console.log(`\n--------------------------------------------------`);
        console.log(`📌 PROCESSING: ${c.name}`);
        console.log(`--------------------------------------------------`);

        const localImagePath = path.join(ROOT, 'assets', 'campaigns', c.imageFile);
        if (!fs.existsSync(localImagePath)) {
            throw new Error(`Image not found at: ${localImagePath}`);
        }

        const rawImageUrl = `https://raw.githubusercontent.com/Trilok310/trustpointfin/main/assets/campaigns/${c.imageFile}?t=${Date.now()}`;
        console.log(`Image Raw URL: ${rawImageUrl}`);

        // Format Facebook Caption
        const fbCaption = `${c.baseCaption}\n\n💬 Chat with our desk on WhatsApp: ${WA_LINK}\n👉 Open Free Demat Account: ${FB_REFERRAL_LINK}`;

        // Format Instagram Caption (Link in bio prompt + WhatsApp vanity link)
        const igCaption = `${c.baseCaption}\n\n💬 Chat on WhatsApp: ${WA_LINK}\n🔗 Open Free Demat Account (Link in Bio): ${IG_REFERRAL_LINK}`;

        const campaignResult = {
            name: c.name,
            keyword: c.keyword,
            pdfUrl: `https://trustpointfin.org/reports/${c.pdfFile}`,
            facebookPostId: null,
            instagramMediaId: null
        };

        // 1. Post to Instagram
        try {
            campaignResult.instagramMediaId = await publishInstagramPost(rawImageUrl, igCaption);
        } catch (e) {
            console.error(`❌ Failed to publish to Instagram: ${e.message}`);
        }

        // 2. Post to Facebook
        try {
            campaignResult.facebookPostId = await publishFacebookPost(localImagePath, fbCaption);
        } catch (e) {
            console.error(`❌ Failed to publish to Facebook: ${e.message}`);
        }

        results.push(campaignResult);
        // Pause between campaigns to avoid Meta rate limits
        await new Promise(r => setTimeout(r, 6000));
    }

    const resultsPath = path.join(ROOT, 'campaign_publish_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n🎉 Campaign Publishing Finished! Results saved to campaign_publish_results.json`);
}

main().catch(err => {
    console.error("❌ Fatal Error in Campaign Pipeline:", err);
    process.exit(1);
});
