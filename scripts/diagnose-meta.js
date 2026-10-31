const API_VERSION = 'v21.0';
const PAGE_TOKEN = process.env.META_PAGE_TOKEN;
const IG_ACCOUNT_ID = process.env.IG_ACCOUNT_ID;
const FB_PAGE_ID = process.env.FB_PAGE_ID;

async function check() {
    // 1. Check Token Permissions
    try {
        const res = await fetch(`https://graph.facebook.com/${API_VERSION}/me/permissions?access_token=${PAGE_TOKEN}`);
        const data = await res.json();
        console.log('Token Permissions:', JSON.stringify(data.data.map(p => `${p.permission}: ${p.status}`)));
    } catch (e) {
        console.error('Perms check error:', e.message);
    }

    // 2. Test editing FB Post #1 to remove @angelone
    const fbPostId1 = `${FB_PAGE_ID}_122117556362339162`;
    const fbPostId2 = `${FB_PAGE_ID}_122117556632339162`;

    // 3. Test editing Instagram Post caption
    const igMediaId1 = '18092612972221512';
    const igMediaId2 = '17885613990690591';

    // Check IG Media 1
    try {
        const igRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${igMediaId1}?fields=caption&access_token=${PAGE_TOKEN}`);
        const igData = await igRes.json();
        console.log('IG 1 Current Caption preview:', igData.caption ? igData.caption.substring(0, 100) : igData);
    } catch (e) {
        console.error('IG caption check error:', e.message);
    }

    // Try updating FB Post 1 caption
    try {
        // Read current FB post 1
        const fbRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${fbPostId1}?fields=message&access_token=${PAGE_TOKEN}`);
        const fbData = await fbRes.json();
        if (fbData.message) {
            const updatedMsg = fbData.message.replace(/@angelone/gi, 'Angel One');
            const updateRes = await fetch(`https://graph.facebook.com/${API_VERSION}/${fbPostId1}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: updatedMsg,
                    access_token: PAGE_TOKEN
                })
            });
            const updateData = await updateRes.json();
            console.log('FB Post 1 Update Result:', JSON.stringify(updateData));
        } else {
            console.log('FB Post 1 data:', fbData);
        }
    } catch (e) {
        console.error('FB update error:', e.message);
    }
}

check();
