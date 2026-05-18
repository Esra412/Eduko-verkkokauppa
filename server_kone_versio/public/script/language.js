// Global variable for translations
let translations = {};
const routeBasePath = window.location.pathname.startsWith('/verkkokauppa') ? '/verkkokauppa' : '';
const languageBasePath = `${routeBasePath}/lang`;
const flagBasePath = `${routeBasePath}/images/flags`;
const translationCachePrefix = 'translations_cache_';

function markLanguageReady() {
    document.documentElement.classList.remove('i18n-pending');
    document.documentElement.classList.add('i18n-ready');
}

function getCurrentLanguage() {
    return localStorage.getItem('language') || 'fi';
}

function getCachedTranslations(lang) {
    try {
        const cached = localStorage.getItem(`${translationCachePrefix}${lang}`);
        return cached ? JSON.parse(cached) : null;
    } catch (err) {
        return null;
    }
}

function setCachedTranslations(lang, data) {
    try {
        localStorage.setItem(`${translationCachePrefix}${lang}`, JSON.stringify(data));
    } catch (err) {
        // ignore storage errors
    }
}

function applyTranslations(translationsToApply) {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.dataset.i18n;
        if (translationsToApply && translationsToApply.hasOwnProperty(key)) {
            el.textContent = translationsToApply[key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const key = el.dataset.i18nPlaceholder;
        if (translationsToApply && translationsToApply.hasOwnProperty(key)) {
            el.placeholder = translationsToApply[key];
        }
    });
}

async function fetchAndCacheTranslations(lang) {
    const res = await fetch(`${languageBasePath}/${lang}.json`);
    if (!res.ok) throw new Error('Käännöstiedostoa ei löytynyt');

    const freshTranslations = await res.json();
    setCachedTranslations(lang, freshTranslations);
    return freshTranslations;
}

async function applyLanguage(lang) {
    const cachedTranslations = getCachedTranslations(lang);
    if (cachedTranslations) {
        translations = cachedTranslations;
        applyTranslations(translations);
        document.documentElement.lang = lang;
        localStorage.setItem('language', lang);
        markLanguageReady();
        document.dispatchEvent(new Event('languageChanged'));
    }

    try {
        const freshTranslations = await fetchAndCacheTranslations(lang);
        translations = freshTranslations;
        applyTranslations(translations);
        document.documentElement.lang = lang;
        localStorage.setItem('language', lang);
        markLanguageReady();
        document.dispatchEvent(new Event('languageChanged'));
    } catch (err) {
        if (!cachedTranslations) {
            console.error('Kielen lataus epäonnistui:', err);
            markLanguageReady();
        }
    }
}

function t(key) {
    return translations[key] || key;
}

function getLanguageMeta(lang) {
    const languages = {
        fi: { code: 'FI', label: 'Suomi', flagSrc: `${flagBasePath}/fi.svg` },
        en: { code: 'EN', label: 'Englanti', flagSrc: `${flagBasePath}/gb.svg` },
        sv: { code: 'SV', label: 'Ruotsi', flagSrc: `${flagBasePath}/se.svg` }
    };

    return languages[lang] || languages.fi;
}

function renderSelectedLanguage(lang) {
    const selected = document.getElementById('selected-lang');
    if (!selected) return;

    const meta = getLanguageMeta(lang);
    selected.innerHTML = `
        <img class="lang-flag" src="${meta.flagSrc}" alt="">
        <span class="lang-code">${meta.code}</span>
    `;
}

function renderLanguageOptions() {
    const optionsContainer = document.getElementById('lang-options');
    if (!optionsContainer) return;

    ['fi', 'en', 'sv'].forEach((lang) => {
        const option = optionsContainer.querySelector(`[data-value="${lang}"]`);
        if (!option) return;

        const meta = getLanguageMeta(lang);
        option.innerHTML = `
            <img class="lang-flag" src="${meta.flagSrc}" alt="">
            <span class="lang-label">${meta.label}</span>
        `;
    });
}

function setupCustomSelect() {
    const selected = document.getElementById('selected-lang');
    const optionsContainer = document.getElementById('lang-options');
    const options = optionsContainer ? optionsContainer.querySelectorAll('div') : [];

    if (!selected || !optionsContainer) return;

    selected.addEventListener('click', (e) => {
        e.stopPropagation();
        optionsContainer.classList.toggle('select-hide');
    });

    options.forEach((option) => {
        option.addEventListener('click', function () {
            const lang = this.getAttribute('data-value');
            renderSelectedLanguage(lang);
            applyLanguage(lang);
            optionsContainer.classList.add('select-hide');
        });
    });

    window.addEventListener('click', () => {
        optionsContainer.classList.add('select-hide');
    });
}

function initLanguage() {
    const savedLang = localStorage.getItem('language') || 'fi';
    renderLanguageOptions();
    renderSelectedLanguage(savedLang);
    applyLanguage(savedLang);
    setupCustomSelect();
}

document.addEventListener('DOMContentLoaded', initLanguage);
