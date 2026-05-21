(function () {
    const storageKey = 'eduko_cookie_consent';
    const existing = localStorage.getItem(storageKey);

    window.edukoCookieConsent = {
        get() {
            try {
                return JSON.parse(localStorage.getItem(storageKey) || '{"necessary":true,"analytics":false,"marketing":false}');
            } catch (err) {
                return { necessary: true, analytics: false, marketing: false };
            }
        },
        canUseAnalytics() {
            return this.get().analytics === true;
        },
        canUseMarketing() {
            return this.get().marketing === true;
        }
    };

    if (existing) return;

    function saveConsent(consent) {
        localStorage.setItem(storageKey, JSON.stringify({
            necessary: true,
            analytics: Boolean(consent.analytics),
            marketing: Boolean(consent.marketing),
            savedAt: new Date().toISOString()
        }));
        window.dispatchEvent(new CustomEvent('eduko:cookie-consent', { detail: window.edukoCookieConsent.get() }));
    }

    function buildBanner() {
        const banner = document.createElement('section');
        banner.className = 'cookie-consent';
        banner.setAttribute('aria-label', 'Evästeasetukset');
        banner.innerHTML = `
            <div class="cookie-consent__text">
                <h2>Evästeasetukset</h2>
                <p>Kauppa käyttää välttämättömiä toimintaevästeitä esimerkiksi ostoskoria ja kielivalintaa varten. Analytiikka- ja markkinointievästeitä ei aseteta ilman lupaasi.</p>
            </div>
            <div class="cookie-consent__options">
                <label><input type="checkbox" checked disabled> Välttämättömät</label>
                <label><input type="checkbox" id="cookie-analytics"> Analytiikka</label>
                <label><input type="checkbox" id="cookie-marketing"> Markkinointi</label>
            </div>
            <div class="cookie-consent__actions">
                <button type="button" id="cookie-reject">Vain välttämättömät</button>
                <button type="button" id="cookie-save">Tallenna valinnat</button>
                <button type="button" id="cookie-accept">Hyväksy kaikki</button>
            </div>
        `;

        document.body.appendChild(banner);

        document.getElementById('cookie-reject').addEventListener('click', () => {
            saveConsent({ analytics: false, marketing: false });
            banner.remove();
        });

        document.getElementById('cookie-save').addEventListener('click', () => {
            saveConsent({
                analytics: document.getElementById('cookie-analytics').checked,
                marketing: document.getElementById('cookie-marketing').checked
            });
            banner.remove();
        });

        document.getElementById('cookie-accept').addEventListener('click', () => {
            saveConsent({ analytics: true, marketing: true });
            banner.remove();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildBanner);
    } else {
        buildBanner();
    }
})();
