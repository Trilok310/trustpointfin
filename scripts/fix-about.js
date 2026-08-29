const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const newAbout = `    <!-- About Section -->
    <section id="about" class="about section-padding">
        <div class="container">
            <div class="about-editorial" style="display: flex; gap: 64px; align-items: center;">
                <div class="about-text" style="flex: 0 0 55%;">
                    <span class="eyebrow" style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-primary); display: block; margin-bottom: 16px;">ABOUT TRUSTPOINTFIN</span>
                    <h2 class="section-title">Who is TrustPointFin?</h2>
                    <p class="section-subtitle" style="text-align: left; margin: 0 0 24px; color: var(--color-text-muted); font-size: 1.25rem;">Your gateway to the Indian stock market.</p>
                    <p style="margin-bottom: 16px; font-size: 1.1rem; line-height: 1.7; color: var(--color-text-main);">TrustPointFin is an official <strong>Authorized partner Angel one</strong>. Our mission is to facilitate a seamless onboarding experience for retail investors, traders, and beginners across India.</p>
                    <p style="margin-bottom: 24px; font-size: 1.1rem; line-height: 1.7; color: var(--color-text-main);">By opening your Demat account through TrustPointFin, you gain access to Angel One's robust technological ecosystem, including zero account opening charges, competitive brokerage rates, and an advanced trading suite, while receiving dedicated onboarding support from our team.</p>
                    <div style="margin-top: 32px;">
                        <a href="https://a.aonelink.in/ANGOne/8Xovqg1" target="_blank" class="btn btn-primary">Open Demat Account</a>
                    </div>
                </div>
                <div class="about-visual" style="flex: 1;">
                    <div class="visual-card" style="background: var(--color-bg-alt); border: 1px solid var(--color-border); border-radius: 16px; padding: 48px; display: flex; flex-direction: column; gap: 40px; align-items: center; box-shadow: var(--shadow-md);">
                        <div class="visual-logo-container" style="display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 24px;">
                            <img src="logo.jpg" alt="TrustPointFin Logo" style="max-width: 200px; border-radius: 8px;">
                            <i class="fas fa-handshake" style="font-size: 2rem; color: var(--color-primary);"></i>
                            <div class="angel-one-badge" style="background: var(--color-bg-base); padding: 12px 24px; border-radius: 8px; font-weight: 700; color: #002366; border: 1px solid var(--color-border); box-shadow: var(--shadow-sm);">Angel One AP</div>
                        </div>
                        <div class="visual-stats" style="display: flex; gap: 32px; width: 100%; justify-content: center; flex-wrap: wrap;">
                            <div class="stat-item" style="text-align: center;">
                                <h4 style="font-size: 1.5rem; color: var(--color-primary); margin-bottom: 4px;">Authorized</h4>
                                <p style="font-size: 0.9rem; color: var(--color-text-muted);">Partner</p>
                            </div>
                            <div class="stat-item" style="text-align: center;">
                                <h4 style="font-size: 1.5rem; color: var(--color-primary); margin-bottom: 4px;">0₹</h4>
                                <p style="font-size: 0.9rem; color: var(--color-text-muted);">Account Opening</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>`;

html = html.replace(/<section id="about" class="section-padding">[\s\S]*?<\/section>/, newAbout);
fs.writeFileSync('index.html', html, 'utf8');
console.log('Fixed About section.');
