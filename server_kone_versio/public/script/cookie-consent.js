/*
 * GDPR-yhteensopiva evästebanneri.
 * Tämä skripti näyttää evästevalikon, tallentaa käyttäjän suostumuksen ja
 * lataa analytiikka- tai markkinointiskirjastoja vasta, kun suostumus on annettu.
 */
(function () {
    const storageKey = 'eduko_cookie_consent';
    const existing = localStorage.getItem(storageKey);

    const analyticsConfig = {
        provider: 'umami',
        // Muuta nämä omiin arvoihisi, jos haluat käyttää europealaista analytiikkaa.
        umamiScriptUrl: '', // esim. 'https://umami.example.com/umami.js'
        umamiWebsiteId: '',
        matomoUrl: '', // esim. 'https://matomo.esimerkki.fi/'
        matomoSiteId: ''
    };

    let analyticsLoaded = false;

    function loadUmami() {
        if (!analyticsConfig.umamiScriptUrl || !analyticsConfig.umamiWebsiteId) return;
        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.dataset.websiteId = analyticsConfig.umamiWebsiteId;
        script.src = analyticsConfig.umamiScriptUrl;
        document.head.appendChild(script);
        analyticsLoaded = true;
    }

    function loadMatomo() {
        if (!analyticsConfig.matomoUrl || !analyticsConfig.matomoSiteId) return;
        const script = document.createElement('script');
        script.async = true;
        script.src = `${analyticsConfig.matomoUrl}matomo.js`;
        document.head.appendChild(script);

        window._paq = window._paq || [];
        window._paq.push(['trackPageView']);
        window._paq.push(['enableLinkTracking']);
        window._paq.push(['setSiteId', analyticsConfig.matomoSiteId]);
        window._paq.push(['setTrackerUrl', `${analyticsConfig.matomoUrl}matomo.php`]);
        analyticsLoaded = true;
    }

    function loadAnalyticsProvider() {
        if (analyticsLoaded || !window.edukoCookieConsent.canUseAnalytics()) return;

        if (analyticsConfig.provider === 'matomo') {
            loadMatomo();
            return;
        }
        if (analyticsConfig.provider === 'umami') {
            loadUmami();
            return;
        }
    }

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

    function notifyConsentState() {
        window.dispatchEvent(new CustomEvent('eduko:cookie-consent', { detail: window.edukoCookieConsent.get() }));
    }

    function saveConsent(consent) {
        localStorage.setItem(storageKey, JSON.stringify({
            necessary: true,
            analytics: Boolean(consent.analytics),
            marketing: Boolean(consent.marketing),
            savedAt: new Date().toISOString()
        }));
        notifyConsentState();
        loadAnalyticsProvider();
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

    function initConsent() {
        if (!existing) {
            buildBanner();
        }
        notifyConsentState();
        loadAnalyticsProvider();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initConsent);
    } else {
        initConsent();
    }
})();
