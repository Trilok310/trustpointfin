const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const oldAboutRegex = /<!-- About Section -->[\s\S]*?<\/section>/;

const newAbout = `    <!-- About Section -->
    <section id="about" class="about section-padding">
        <div class="container">
            <div class="about-editorial" style="max-width: 900px; margin: 0 auto;">
                <span class="eyebrow" style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-primary); display: block; margin-bottom: 16px;">ABOUT TRUSTPOINTFIN</span>
                <h2 class="section-title">Who is TrustPointFin?</h2>
                <p class="section-subtitle" style="text-align: left; margin: 0 0 32px; color: var(--color-text-muted); font-size: 1.25rem;">Your gateway to the Indian stock market.</p>
                
                <div class="about-content-wrapper" style="display: flex; flex-direction: column; gap: 16px;">
                    <p style="font-size: 1.15rem; line-height: 1.8; color: var(--color-text-main); margin: 0;">TrustPointFin is an official <strong>Authorized partner Angel one</strong>. Our mission is to facilitate a seamless onboarding experience for retail investors, traders, and beginners across India.</p>
                    <p style="font-size: 1.15rem; line-height: 1.8; color: var(--color-text-main); margin: 0;">By opening your Demat account through TrustPointFin, you gain access to Angel One's robust technological ecosystem, including zero account opening charges, competitive brokerage rates, and an advanced trading suite, while receiving dedicated onboarding support from our team.</p>
                </div>
                <div style="margin-top: 40px;">
                    <a href="https://a.aonelink.in/ANGOne/8Xovqg1" target="_blank" class="btn btn-primary btn-lg">Open Demat Account</a>
                </div>
            </div>
        </div>
    </section>`;

if (oldAboutRegex.test(html)) {
    html = html.replace(oldAboutRegex, newAbout);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log("Updated About Section successfully.");
} else {
    console.log("Regex did not match.");
}
