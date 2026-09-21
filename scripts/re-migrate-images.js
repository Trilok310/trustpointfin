const fs = require('fs');
const path = require('path');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchImage(topic) {
    const query = encodeURIComponent(topic + " finance business");
    const key = process.env.UNSPLASH_API_KEY;
    
    try {
        let res = await fetch(`https://api.unsplash.com/photos/random?query=${query}&orientation=landscape&client_id=${key}`);
        if (res.status === 404) {
            console.log(`No results for ${topic}, falling back to general finance...`);
            res = await fetch(`https://api.unsplash.com/photos/random?query=finance,stock-market&orientation=landscape&client_id=${key}`);
        }
        
        if (res.ok) {
            const data = await res.json();
            return data.urls.regular;
        } else {
            console.log(`Unsplash error: ${res.status}`);
        }
    } catch (e) {
        console.log(`Network error: ${e.message}`);
    }
    
    return "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=1200&auto=format&fit=crop";
}

async function run() {
    const dir = path.join(__dirname, '..');
    const insightsPath = path.join(dir, 'insights.html');
    let insightsHtml = fs.readFileSync(insightsPath, 'utf8');
    
    // Find all article files
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.html') && !['index.html', 'privacy.html', 'insights.html', 'sample-insight.html'].includes(f) && !f.startsWith('google'));
    
    console.log(`Found ${files.length} articles to update.`);
    
    for (const file of files) {
        const filePath = path.join(dir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Extract title to use as topic
        const titleMatch = content.match(/<title>(.*?) \| TrustPointFin<\/title>/);
        const title = titleMatch ? titleMatch[1] : "finance";
        
        console.log(`\nProcessing: ${file} (Topic: ${title})`);
        
        // Fetch specific image
        const imgUrl = await fetchImage(title);
        console.log(`Got image: ${imgUrl}`);
        
        // Replace in article file
        content = content.replace(/<img src="https:\/\/images\.unsplash\.com[^"]+"/i, `<img src="${imgUrl}"`);
        content = content.replace(/<meta property="og:image" content="https:\/\/images\.unsplash\.com[^"]+"/i, `<meta property="og:image" content="${imgUrl}"`);
        
        fs.writeFileSync(filePath, content, 'utf8');
        
        // Replace in insights.html
        const regex = new RegExp(`(<a href="${file}"[^>]*>[\\s\\S]*?<div class="insight-thumb" style="background-image: url\\(')([^']+)('\\);">)`, 'i');
        insightsHtml = insightsHtml.replace(regex, `$1${imgUrl}$3`);
        
        // Sleep to respect rate limits
        await sleep(1500);
    }
    
    fs.writeFileSync(insightsPath, insightsHtml, 'utf8');
    console.log("All done!");
}

run();
