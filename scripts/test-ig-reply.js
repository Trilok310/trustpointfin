const API_VERSION = 'v21.0';
const PAGE_TOKEN = process.env.META_PAGE_TOKEN;
const IG_ACCOUNT_ID = process.env.IG_ACCOUNT_ID;

async function run() {
    const commentId = '17938333098404360'; // The user's comment ID from the log!
    console.log(`Inspecting Comment ID: ${commentId}`);

    // 1. Get comment details
    try {
        const getRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${commentId}?fields=id,text,username,timestamp&access_token=${PAGE_TOKEN}`);
        const getData = await getRes.json();
        console.log('Comment data:', JSON.stringify(getData));
    } catch (e) {
        console.error('Error fetching comment:', e.message);
    }

    // 2. Test Instagram comment reply: POST /{comment-id}/replies
    try {
        const replyRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${commentId}/replies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: 'Hi! Here is your official IPO DRHP Scorecard: https://trustpointfin.org/reports/TrustPoint_Upcoming_Mega_IPO_Report_v2.pdf 📈\n\nLink in bio for Angel One account!',
                access_token: PAGE_TOKEN
            })
        });
        const replyData = await replyRes.json();
        console.log('POST /{comment-id}/replies result:', JSON.stringify(replyData));
    } catch (e) {
        console.error('Error posting reply:', e.message);
    }

    // 3. Test Instagram private reply (DM): POST /v21.0/{ig_account_id}/messages with recipient: { comment_id }
    if (IG_ACCOUNT_ID) {
        try {
            const dmRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${IG_ACCOUNT_ID}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    recipient: { comment_id: commentId },
                    message: {
                        text: 'Hi! Here is your official IPO DRHP Scorecard: https://trustpointfin.org/reports/TrustPoint_Upcoming_Mega_IPO_Report_v2.pdf\n\n👉 Open Free Demat Account with Angel One: https://a.aonelink.in/ANGOne/uOwRu9n?utm_source=other&utm_medium=IG&utm_campaign=Nov'
                    },
                    access_token: PAGE_TOKEN
                })
            });
            const dmData = await dmRes.json();
            console.log('IG DM Private Reply result:', JSON.stringify(dmData));
        } catch (e) {
            console.error('Error sending DM:', e.message);
        }
    }
}

run();
