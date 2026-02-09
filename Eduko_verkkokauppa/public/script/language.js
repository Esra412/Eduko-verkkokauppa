// Globaali muuttuja käännöksille
let translations = {}; 

/**
 * Lataa valitun kielen JSON-tiedoston ja päivittää sivun tekstit
 */
async function applyLanguage(lang) {
    try {
        const res = await fetch(`/lang/${lang}.json`);
        if (!res.ok) throw new Error("Käännöstiedostoa ei löytynyt");
        
        translations = await res.json(); 

        // Päivitä elementit, joilla on data-i18n -attribuutti
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.dataset.i18n;
            if (translations[key]) el.textContent = translations[key];
        });

        // Päivitä placeholderit
        document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            if (translations[key]) el.placeholder = translations[key];
        });

        // Tallenna kielivalinta selaimen muistiin (localStorage)
        localStorage.setItem("language", lang);

        // Ilmoita muille scripteille, että kieli on muuttunut
        document.dispatchEvent(new Event('languageChanged'));

    } catch (err) {
        console.error("Kielen lataus epäonnistui:", err);
    }
}

/**
 * Apufunktio tekstin hakemiseen JavaScript-koodin sisällä
 */
function t(key) {
    return translations[key] || key; 
}

/**
 * Kielivalikon (custom select) toiminnallisuus
 */
function setupCustomSelect() {
    const selected = document.getElementById("selected-lang");
    const optionsContainer = document.getElementById("lang-options");
    const options = optionsContainer ? optionsContainer.querySelectorAll("div") : [];

    if (!selected || !optionsContainer) return;

    selected.addEventListener("click", (e) => {
        e.stopPropagation();
        optionsContainer.classList.toggle("select-hide");
    });

    options.forEach(option => {
        option.addEventListener("click", function() {
            const lang = this.getAttribute("data-value");
            selected.innerHTML = this.innerHTML;
            applyLanguage(lang);
            optionsContainer.classList.add("select-hide");
        });
    });

    window.addEventListener("click", () => {
        optionsContainer.classList.add("select-hide");
    });
}

/**
 * Alustetaan kieli sivun latautuessa
 */
function initLanguage() {
    const savedLang = localStorage.getItem("language") || "fi";
    applyLanguage(savedLang);

    // Päivitetään valikon teksti vastaamaan tallennettua kieltä
    const optionsContainer = document.getElementById("lang-options");
    const selected = document.getElementById("selected-lang");
    
    if (optionsContainer && selected) {
        const activeOption = Array.from(optionsContainer.querySelectorAll("div"))
                                  .find(opt => opt.dataset.value === savedLang);
        if (activeOption) selected.innerHTML = activeOption.innerHTML;
    }

    setupCustomSelect();
}

document.addEventListener("DOMContentLoaded", initLanguage);