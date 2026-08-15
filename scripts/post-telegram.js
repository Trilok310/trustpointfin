const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ANGELONE_LINK = "https://a.aonelink.in/ANGOne/8Xovqg1";

async function fetchJSON(url, options = {}) {
    const res = await fetch(url, options);
    const data = await res.json();
    if (!res.ok || data.ok === false) {
        throw new Error(data.description || data.error?.message || `HTTP Error ${res.status}`);
    }
    return data;
}

async function getTelegramContent() {
    console.log("🤖 Asking Gemini for the Daily Educational Trade Setup...");
    
    // We strictly instruct the AI to use HTML formatting supported by Telegram
    // Telegram supports: <b>, <i>, <u>, <s>, <a href="...">, <code>, <pre>
    const prompt = `You are a professional SEBI-compliant stock market educator running a premium Telegram channel in India.
Generate today's "Daily Educational Technical Setup" for the Indian Market (e.g., Nifty 50, BankNifty, or a major large-cap stock).

Requirements:
1. Must provide a highly insightful, professional technical analysis (support, resistance, chart patterns).
2. NEVER give explicit Buy/Sell tips. Always frame it as: "Educational Paper Trade Observation".
3. Use engaging emojis and perfect formatting.
4. Format using HTML tags strictly supported by Telegram: <b>, <i>, <u>, <s>, <code>, <pre>. DO NOT use markdown like ** or #.
5. Provide a 1-2 word search term for an Unsplash background image (e.g., "stockchart", "bullmarket", "finance").
6. End the post with this exact call-to-action for opening a Demat account:
"📈 <i>Analyze this setup yourself with zero brokerage on delivery. Open your AngelOne account here: <a href='${ANGELONE_LINK}'>TrustPointFin Referral</a></i>"

Return ONLY a raw JSON object (no markdown wrapping) with these keys:
{
  "caption": "The full HTML formatted message",
  "image_query": "search term"
}`;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
    const result = await model.generateContent(prompt);
    
    let rawText = result.response.text();
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(rawText);
}

async function postToTelegram(contentData) {
    console.log(`📤 Preparing to post to Telegram Chat ID: ${TELEGRAM_CHAT_ID}...`);
    
    // Fallback Unsplash URL generator
    const photoUrl = `https://source.unsplash.com/1200x800/?${encodeURIComponent(contentData.image_query)},trading,finance`;
    
    // Telegram Bot API endpoint for sending a photo with a caption
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
    
    const body = {
        chat_id: TELEGRAM_CHAT_ID,
        photo: photoUrl,
        caption: contentData.caption,
        parse_mode: "HTML"
    };

    const res = await fetchJSON(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    
    console.log(`🎉 Successfully posted to Telegram! Message ID: ${res.result.message_id}`);
}

async function main() {
    if (!GEMINI_API_KEY || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.error("❌ Missing required Environment Variables (GEMINI_API_KEY, TELEGRAM_BOT_TOKEN, or TELEGRAM_CHAT_ID).");
        process.exit(1);
    }

    try {
        const content = await getTelegramContent();
        console.log("✅ Content generated successfully.");
        await postToTelegram(content);
        console.log("✅ Telegram automation complete.");
    } catch (err) {
        console.error("❌ Fatal Error in Telegram automation:");
        console.error(err.message);
        process.exit(1);
    }
}

main();
