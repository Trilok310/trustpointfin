const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Rewrite About Section
const oldAbout = `    <!-- About Section -->
    <section id="about" class="about section-padding">
        <div class="container">
            <div class="section-header text-center" style="max-width: 800px; margin: 0 auto 56px;">
                <h2 class="section-title">Who is TrustPointFin?</h2>
                <p class="section-subtitle">Your gateway to the Indian stock market.</p>
                <p>We are a dedicated financial services provider operating as an Authorized partner Angel one. Our mission is to democratize retail investing by providing seamless access to the capital markets.</p>
                <p>By opening your Demat account through TrustPointFin, you gain access to Angel One's robust technological ecosystem, including zero account opening charges, competitive brokerage rates, and an advanced trading suite, while receiving dedicated onboarding support from our team.</p>
            </div>
        </div>
    </section>`;

const newAbout = `    <!-- About Section -->
    <section id="about" class="about section-padding">
        <div class="container">
            <div class="about-editorial" style="display: flex; gap: 64px; align-items: center;">
                <div class="about-text" style="flex: 0 0 55%;">
                    <span class="eyebrow" style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-primary); display: block; margin-bottom: 16px;">ABOUT TRUSTPOINTFIN</span>
                    <h2 class="section-title">Who is TrustPointFin?</h2>
                    <p class="section-subtitle" style="text-align: left; margin: 0 0 24px; color: var(--color-text-muted); font-size: 1.25rem;">Your gateway to the Indian stock market.</p>
                    <p style="margin-bottom: 16px; font-size: 1.1rem; line-height: 1.7; color: var(--color-text-main);">We are a dedicated financial services provider operating as an Authorized partner Angel one. Our mission is to democratize retail investing by providing seamless access to the capital markets.</p>
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

html = html.replace(oldAbout, newAbout);


// 2. Rewrite Services Section
const oldServicesHeader = `<div class="section-header text-center">
                <h2 class="section-title">One Platform. Multiple Opportunities.</h2>
                <p class="section-subtitle">Diversify your portfolio with a single Demat account.</p>
            </div>`;
            
const newServicesHeader = `<div class="section-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 48px; flex-wrap: wrap; gap: 24px;">
                <div style="max-width: 600px;">
                    <span class="eyebrow" style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-primary); display: block; margin-bottom: 16px;">OUR SERVICES</span>
                    <h2 class="section-title" style="margin-bottom: 16px;">One Platform. Multiple Opportunities.</h2>
                    <p class="section-subtitle" style="text-align: left; margin: 0; color: var(--color-text-muted);">Diversify your portfolio with a single Demat account.</p>
                </div>
                <div>
                    <a href="https://a.aonelink.in/ANGOne/8Xovqg1" target="_blank" class="btn btn-outline" style="background: #fff; border-color: var(--color-border);">Explore All Products</a>
                </div>
            </div>`;

html = html.replace(oldServicesHeader, newServicesHeader);

// Remove the centered button at the bottom of services since we moved it to the header
const oldServicesBtn = `<div style="text-align: center; margin-top: 48px;">
                <a href="https://a.aonelink.in/ANGOne/8Xovqg1" target="_blank" class="btn btn-primary btn-lg">Explore All Products</a>
            </div>`;
html = html.replace(oldServicesBtn, '');


// 3. Rewrite Why Us Section
const oldWhyUs = `    <!-- Why Us Section -->
    <section class="section-padding">
        <div class="container">
            <div class="section-header text-center">
                <h2 class="section-title">Why Invest With Us?</h2>
                <p class="section-subtitle">The advantages of choosing the TrustPointFin & Angel One partnership.</p>
            </div>
            <div class="why-grid">
                <div class="why-card">
                    <div class="why-icon"><i class="fas fa-bolt"></i></div>
                    <h3>Simple Onboarding</h3>
                    <p>A fast, paperless digital KYC process. Open your Demat account from your smartphone in minutes.</p>
                </div>
                <div class="why-card">
                    <div class="why-icon"><i class="fas fa-users"></i></div>
                    <h3>Dedicated Support</h3>
                    <p>As our client, you receive dedicated assistance for account queries and technical onboarding.</p>
                </div>
                <div class="why-card">
                    <div class="why-icon"><i class="fas fa-shield-alt"></i></div>
                    <h3>Trusted Platform</h3>
                    <p>Backed by Angel One, one of India's largest and most trusted retail broking houses.</p>
                </div>
            </div>
        </div>
    </section>`;

const newWhyUs = `    <!-- Why Us Section -->
    <section class="section-padding">
        <div class="container">
            <div class="why-us-editorial" style="display: flex; gap: 64px; align-items: flex-start; flex-wrap: wrap;">
                <div class="why-header" style="flex: 1; min-width: 300px; max-width: 400px;">
                    <span class="eyebrow" style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-primary); display: block; margin-bottom: 16px;">THE ADVANTAGE</span>
                    <h2 class="section-title">Why Invest With Us?</h2>
                    <p style="color: var(--color-text-muted); font-size: 1.1rem; line-height: 1.6; margin-top: 16px;">The TrustPointFin & Angel One partnership provides you with the best of both worlds: industry-leading technology paired with dedicated support.</p>
                </div>
                <div class="why-grid" style="flex: 2; min-width: 300px; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 32px;">
                    <div class="why-card">
                        <div class="why-icon"><i class="fas fa-bolt"></i></div>
                        <h3>Simple Onboarding</h3>
                        <p>A fast, paperless digital KYC process. Open your Demat account from your smartphone in minutes.</p>
                    </div>
                    <div class="why-card">
                        <div class="why-icon"><i class="fas fa-users"></i></div>
                        <h3>Dedicated Support</h3>
                        <p>As our client, you receive dedicated assistance for account queries and technical onboarding.</p>
                    </div>
                    <div class="why-card">
                        <div class="why-icon"><i class="fas fa-shield-alt"></i></div>
                        <h3>Trusted Platform</h3>
                        <p>Backed by Angel One, one of India's largest and most trusted retail broking houses.</p>
                    </div>
                </div>
            </div>
        </div>
    </section>`;

html = html.replace(oldWhyUs, newWhyUs);

// 4. Fix How It Works Header
const oldHowHeader = `<div class="section-header text-center">
                <h2 class="section-title">Start Investing in Minutes</h2>
                <p class="section-subtitle">A seamless, 100% paperless account opening process.</p>
            </div>`;
const newHowHeader = `<div class="section-header" style="max-width: 600px; margin-bottom: 56px;">
                <span class="eyebrow" style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-primary); display: block; margin-bottom: 16px;">GETTING STARTED</span>
                <h2 class="section-title" style="margin-bottom: 16px;">Start Investing in Minutes</h2>
                <p class="section-subtitle" style="text-align: left; margin: 0; color: var(--color-text-muted);">A seamless, 100% paperless account opening process.</p>
            </div>`;
html = html.replace(oldHowHeader, newHowHeader);


// 5. Fix Mobile responsiveness for the new flex layouts by injecting a tiny style block at the top
const responsiveStyles = `
    <style>
        @media (max-width: 992px) {
            .about-editorial { flex-direction: column !important; text-align: left !important; }
            .about-visual { width: 100% !important; }
            .visual-logo-container { flex-direction: column !important; gap: 16px !important; }
            .why-us-editorial { flex-direction: column !important; }
            .why-header { max-width: 100% !important; margin-bottom: 32px !important; }
        }
    </style>
</head>`;
html = html.replace('</head>', responsiveStyles);

fs.writeFileSync('index.html', html, 'utf8');
console.log('index.html updated successfully.');
