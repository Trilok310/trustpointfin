const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const filesToUpdate = ['index.html', 'insights.html', 'sample-insight.html'];

const logoReplacement = `
            <a href="index.html" class="logo">
                <img src="logo.jpg" alt="TrustPointFin Logo" class="logo-img" style="height: 45px; width: auto; border-radius: 8px; padding: 2px;">
            </a>`;

const textLogoRegex = /<a href="index\.html" class="logo-text">\s*TrustPoint<span class="highlight">Fin<\/span>\s*<\/a>/g;
const footerTextLogoRegex = /<div class="logo-text">TrustPoint<span class="highlight">Fin<\/span><\/div>/g;

const footerLogoReplacement = `
                    <a href="index.html" class="logo" style="display:inline-block; margin-bottom:16px;">
                        <img src="logo.jpg" alt="TrustPointFin Logo" class="logo-img" style="height: 45px; width: auto; border-radius: 8px; padding: 2px;">
                    </a>`;

const footerContactLinks = `
                <div class="footer-col">
                    <h4>Contact Us</h4>
                    <ul class="contact-links-list">
                        <li><a href="tel:+919116068671"><i class="fas fa-phone-alt"></i> +91 9116068671</a></li>
                        <li><a href="mailto:sales@trustpointfin.org"><i class="fas fa-envelope"></i> sales@trustpointfin.org</a></li>
                        <li><a href="https://wa.me/919116058671" target="_blank"><i class="fab fa-whatsapp"></i> WhatsApp</a></li>
                        <li><a href="https://t.me/trustpointfin" target="_blank"><i class="fab fa-telegram"></i> Telegram</a></li>
                    </ul>
                </div>`;

const floatingWidgetHTML = `
    <!-- Floating Contact Widget -->
    <div class="floating-contact">
        <button class="fab-main" id="fabMain" aria-label="Contact Options">
            <i class="fas fa-comment-dots"></i>
        </button>
        <div class="fab-menu" id="fabMenu">
            <a href="https://wa.me/919116058671" target="_blank" class="fab-item whatsapp" aria-label="WhatsApp"><i class="fab fa-whatsapp"></i></a>
            <a href="tel:+919116068671" class="fab-item phone" aria-label="Call Us"><i class="fas fa-phone-alt"></i></a>
            <a href="mailto:sales@trustpointfin.org" class="fab-item email" aria-label="Email Us"><i class="fas fa-envelope"></i></a>
            <a href="https://t.me/trustpointfin" target="_blank" class="fab-item telegram" aria-label="Telegram"><i class="fab fa-telegram"></i></a>
        </div>
    </div>
    
    <style>
        .floating-contact { position: fixed; bottom: 24px; right: 24px; z-index: 1000; display: flex; flex-direction: column-reverse; align-items: center; gap: 12px; }
        .fab-main { width: 56px; height: 56px; border-radius: 50%; background: var(--color-primary); color: white; border: none; font-size: 1.5rem; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.2); transition: transform 0.2s; display: flex; align-items: center; justify-content: center; }
        .fab-main:hover { transform: scale(1.05); }
        .fab-menu { display: flex; flex-direction: column; gap: 12px; opacity: 0; pointer-events: none; transform: translateY(20px); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .fab-menu.active { opacity: 1; pointer-events: auto; transform: translateY(0); }
        .fab-item { width: 48px; height: 48px; border-radius: 50%; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; text-decoration: none; box-shadow: 0 4px 8px rgba(0,0,0,0.15); transition: transform 0.2s; }
        .fab-item:hover { transform: scale(1.1); }
        .fab-item.whatsapp { background: #25D366; }
        .fab-item.phone { background: #34b7f1; }
        .fab-item.email { background: #EA4335; }
        .fab-item.telegram { background: #0088cc; }
        .contact-links-list li a { display: flex; align-items: center; gap: 8px; }
        
        /* Adjust mobile sticky CTA so it doesnt overlap fab */
        @media (max-width: 768px) {
            .mobile-sticky-cta { padding-right: 90px; }
        }
    </style>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const fabMain = document.getElementById('fabMain');
            const fabMenu = document.getElementById('fabMenu');
            if(fabMain && fabMenu) {
                fabMain.addEventListener('click', () => {
                    fabMenu.classList.toggle('active');
                    const icon = fabMain.querySelector('i');
                    if(fabMenu.classList.contains('active')) {
                        icon.classList.remove('fa-comment-dots');
                        icon.classList.add('fa-times');
                    } else {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-comment-dots');
                    }
                });
            }
        });
    </script>
`;

for (const file of filesToUpdate) {
    const filepath = path.join(ROOT, file);
    if (fs.existsSync(filepath)) {
        let content = fs.readFileSync(filepath, 'utf8');
        
        // 1. Fix double quotes issue specific to insights.html
        if (file === 'insights.html') {
            content = content.replace(/""/g, '"');
            content = content.replace(/styles\.css\?v=5"/g, 'styles.css?v=5"');
        }

        // 2. Replace Header Text Logo with Image Logo
        content = content.replace(textLogoRegex, logoReplacement);

        // 3. Replace Footer Text Logo with Image Logo
        content = content.replace(footerTextLogoRegex, footerLogoReplacement);

        // 4. Inject Contact Column in Footer
        // Find the Services column and inject Contact Us column before it
        if (!content.includes('<h4>Contact Us</h4>')) {
            content = content.replace(
                /<div class="footer-col">\s*<h4>Services<\/h4>/,
                footerContactLinks + '\n                <div class="footer-col">\n                    <h4>Services</h4>'
            );
        }

        // 5. Inject Floating Widget right before </body>
        if (!content.includes('<!-- Floating Contact Widget -->')) {
            content = content.replace(/<\/body>/, floatingWidgetHTML + '\n</body>');
        }

        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`Updated ${file}`);
    }
}
