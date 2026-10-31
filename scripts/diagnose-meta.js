const API_VERSION = 'v21.0';
const PAGE_TOKEN = process.env.META_PAGE_TOKEN;
const IG_ACCOUNT_ID = process.env.IG_ACCOUNT_ID;
const FB_PAGE_ID = process.env.FB_PAGE_ID;

async function run() {
    const commentId = '17938333098404360'; // triloknayabas's comment
    const fbPostId2 = `${FB_PAGE_ID}_122117556632339162`;
    const igMediaId1 = '18092612972221512';
    const igMediaId2 = '17885613990690591';

    // 1. Update FB Post 2 to remove @angelone
    try {
        const fbRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${fbPostId2}?fields=message&access_token=${PAGE_TOKEN}`);
        const fbData = await fbRes.json();
        if (fbData.message) {
            const updatedMsg = fbData.message.replace(/@angelone/gi, 'Angel One');
            const updateRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${fbPostId2}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: updatedMsg,
                    access_token: PAGE_TOKEN
                })
            });
            const updateData = await updateRes.json();
            console.log('FB Post 2 Update Result:', JSON.stringify(updateData));
        }
    } catch (e) {
        console.error('FB Post 2 error:', e.message);
    }

    // 2. Test IG Caption update on IG Media 1 & 2
    for (const mediaId of [igMediaId1, igMediaId2]) {
        try {
            const getRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${mediaId}?fields=caption&access_token=${PAGE_TOKEN}`);
            const getData = await getRes.json();
            if (getData.caption && getData.caption.includes('@angelone')) {
                const newCap = getData.caption.replace(/@angelone/gi, 'Angel One');
                // Test if IG API allows updating caption
                const patchRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${mediaId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        caption: newCap,
                        access_token: PAGE_TOKEN
                    })
                });
                const patchData = await patchRes.json();
                console.log(`IG Media ${mediaId} Caption Update Result:`, JSON.stringify(patchData));
            } else {
                console.log(`IG Media ${mediaId} caption does not have @angelone or cannot be read`);
            }
        } catch (e) {
            console.error(`IG Media ${mediaId} error:`, e.message);
        }
    }

    // 3. Test Private Reply (DM) to Comment
    // Test endpoint A: POST /v21.0/{IG_ACCOUNT_ID}/messages
    // Test endpoint B: POST /v21.0/{FB_PAGE_ID}/messages
    // Test endpoint C: POST /v21.0/me/messages
    const msgPayload = {
        recipient: { comment_id: commentId },
        message: {
            text: "Hi! Here is your official IPO DRHP Scorecard: https://trustpointfin.org/reports/TrustPoint_Upcoming_Mega_IPO_Report_v2.pdf 📈\n\nLink in bio for Angel One account!"
        },
        access_token: PAGE_TOKEN
    };

    console.log(`Testing Private Reply endpoints for IG comment ${commentId}...`);
    for (const [name, target] of [['IG_ACCOUNT_ID', IG_ACCOUNT_ID], ['FB_PAGE_ID', FB_PAGE_ID], ['me', 'me']]) {
        try {
            const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${target}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(msgPayload)
            });
            const d = await res.json();
            console.log(`Private Reply on /${name}/messages:`, JSON.stringify(d));
        } catch (e) {
            console.error(`Private Reply on /${name}/messages error:`, e.message);
        }
    }
}

run();
