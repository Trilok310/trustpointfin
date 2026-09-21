const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const oldVisualRegex = /<div class="about-visual" style="flex: 1;">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/section>/;

const newVisual = `<div class="about-visual" style="flex: 1;">
                    <div class="visual-card" style="background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%); border: 1px solid var(--color-border); border-radius: 16px; padding: 0; overflow: hidden; display: flex; flex-direction: column; box-shadow: var(--shadow-md); height: 100%;">
                        <div style="padding: 48px 40px; text-align: center; border-bottom: 1px solid var(--color-border); background: #fff;">
                            <div style="display: inline-flex; align-items: center; justify-content: center; width: 80px; height: 80px; border-radius: 50%; background: #eff6ff; color: var(--color-primary); margin-bottom: 24px;">
                                <i class="fas fa-shield-alt" style="font-size: 2.5rem;"></i>
                            </div>
                            <h3 style="font-size: 1.75rem; margin-bottom: 12px; color: #0f172a;">Official Partner</h3>
                            <p style="color: var(--color-text-muted); font-size: 1.05rem; line-height: 1.6;">Proudly partnered with <strong>Angel One</strong> to deliver enterprise-grade trading technology to retail investors across India.</p>
                        </div>
                        <div style="padding: 32px 24px; flex: 1; display: flex; justify-content: space-evenly; align-items: center;">
                            <div style="text-align: center;">
                                <div style="font-size: 2.25rem; font-weight: 800; color: var(--color-primary); margin-bottom: 4px;">0₹</div>
                                <div style="font-size: 0.8rem; color: var(--color-text-light); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Account Opening</div>
                            </div>
                            <div style="width: 1px; height: 50px; background: var(--color-border);"></div>
                            <div style="text-align: center;">
                                <div style="font-size: 2.25rem; font-weight: 800; color: var(--color-primary); margin-bottom: 4px;">0₹</div>
                                <div style="font-size: 0.8rem; color: var(--color-text-light); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Equity Delivery</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>`;

if (oldVisualRegex.test(html)) {
    html = html.replace(oldVisualRegex, newVisual);
    fs.writeFileSync('index.html', html, 'utf8');
    console.log("Updated About visual successfully.");
} else {
    console.log("Regex did not match.");
}
