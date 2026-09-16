const fs = require('fs');
const puppeteer = require('puppeteer');

async function check() {
    console.log(`Node version: ${process.version}`);
    
    try {
        const pkg = require('puppeteer/package.json');
        console.log(`Puppeteer version: ${pkg.version}`);
    } catch (e) {
        console.log(`Puppeteer version: (Could not resolve package.json)`);
    }
    
    let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!executablePath) {
        try {
            executablePath = puppeteer.executablePath();
        } catch (e) {
            executablePath = "(Not found by Puppeteer)";
        }
    }
    
    console.log(`Chrome executable path: ${executablePath}`);
    const exists = executablePath && fs.existsSync(executablePath);
    console.log(`Executable exists: ${exists}`);
    
    if (!exists) {
        console.error("❌ Chrome executable not found! Failing pipeline.");
        process.exit(1);
    }
    
    console.log("Testing Chrome launch...");
    try {
        const browser = await puppeteer.launch({
            executablePath: executablePath,
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        await browser.close();
        console.log("✅ Chrome launched successfully.");
        process.exit(0);
    } catch (e) {
        console.error("❌ Failed to launch Chrome:", e.message);
        process.exit(1);
    }
}
check();
