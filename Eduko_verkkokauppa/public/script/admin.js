/**
 * ADMIN.JS – Güncellenmiş Modern CRUD ve Sipariş Yönetimi
 */

const addProductForm = document.getElementById("addProductForm");
const productList = document.getElementById("productList");
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchProduct");
const imagePreview = document.getElementById("imagePreview");
const mainImageInput = document.querySelector('input[name="mainImage"]');

// Yeni UI Elementleri (HTML'inizde bu ID'lerin olduğundan emin olun)
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const cancelBtn = document.getElementById("cancelEditBtn");
const editBadge = document.getElementById("editModeBadge");

let editingProductId = null;

/* =================================================
   MULTI-LANGUAGE FORM STATE MANAGEMENT
================================================= */
let currentLanguage = "fi";
let firstLanguageChosen = null; // Seuraa ensimmäistä valittua kieltä
const formStates = {
    fi: { name: "", description: "", specs: "", filled: false },
    sv: { name: "", description: "", specs: "", filled: false },
    en: { name: "", description: "", specs: "", filled: false }
};

const languageNames = {
    fi: "SUOMEKSI",
    sv: "RUOTSIKSI",
    en: "ENGLANNIKSI"
};

const languageLabels = {
    fi: "Suomi",
    sv: "Svenska",
    en: "English"
};

const placeholders = {
    fi: {
        name: "Tuotteen nimi",
        description: "Kuvaus",
        specs: "Tekniset tiedot (esim. materiaali, mitat...)",
        price: "Hinta (€)",
        stock: "Varastosaldo (kpl)"
    },
    sv: {
        name: "Produktens namn",
        description: "Beskrivning",
        specs: "Tekniska specifikationer (t.ex. material, dimensioner...)",
        price: "Pris (€)",
        stock: "Lagersaldo (st)"
    },
    en: {
        name: "Product name",
        description: "Description",
        specs: "Technical specifications (e.g. material, dimensions...)",
        price: "Price (€)",
        stock: "Stock (pcs)"
    }
};

// Kategorioiden käännökset
const categoryTranslations = {
    fi: {
        1: "Ajoneuvoala",
        2: "Hius- ja kauneudenhoito",
        3: "Kone- ja metalliala",
        4: "Logistiikka ja varasto",
        5: "Prosessi- ja laboratorio",
        6: "Turvallisuusala",
        7: "Rakennus ja pintakäsittely",
        8: "Ravintola ja catering",
        9: "Sähkö ja automaatio",
        10: "Sosiaali- ja terveysala",
        11: "Tieto- ja viestintätekniikka"
    },
    sv: {
        1: "Fordonsbranschen",
        2: "Hår- och skönhetsvård",
        3: "Maskin- och metallbranschen",
        4: "Logistik och lagring",
        5: "Process- och laboratoriet",
        6: "Säkerhetsbranschen",
        7: "Konstruktion och ytbehandling",
        8: "Restaurang och catering",
        9: "El- och automationsbranschen",
        10: "Social- och hälsovårdssektorn",
        11: "Informations- och kommunikationsteknikk"
    },
    en: {
        1: "Automotive",
        2: "Hair and Beauty Care",
        3: "Machine and Metal Industry",
        4: "Logistics and Warehouse",
        5: "Process and Laboratory",
        6: "Security Industry",
        7: "Construction and Surface Treatment",
        8: "Restaurant and Catering",
        9: "Electrical and Automation",
        10: "Social and Healthcare",
        11: "Information and Communication Technology"
    }
};

// Tuotteen tyypin käännökset
const typeTranslations = {
    fi: ["Opiskelijatyö", "Palvelu"],
    sv: ["Studentarbete", "Tjänst"],
    en: ["Student Work", "Service"]
};

// Valikon placeholder-tekstit
const selectPlaceholders = {
    fi: {
        category: "Valitse kategoria",
        pickup_point: "Valitse noutopiste",
        type: "Valitse tyyppi"
    },
    sv: {
        category: "Välj kategori",
        pickup_point: "Välj upphämtningspunkt",
        type: "Välj typ"
    },
    en: {
        category: "Select category",
        pickup_point: "Select pickup point",
        type: "Select type"
    }
};

function isLanguageFilled(lang) {
    let state = formStates[lang];
    
    // Jos tarkistetaan nykyistä kieltä, tarkista myös suoraan input-kentistä
    if (lang === currentLanguage) {
        const name = addProductForm.name.value.trim();
        const desc = addProductForm.description.value.trim();
        const specs = addProductForm.querySelector('[name="specs"]').value.trim();
        // Vain kielelliset kentät
        return name !== "" && desc !== "" && specs !== "";
    }
    
    // Tarkista tallennettu tila
    if (!state || !state.name || !state.description || !state.specs) {
        return false;
    }
    return state.name.trim() !== "" && state.description.trim() !== "" && state.specs.trim() !== "";
}

function checkAllLanguagesFilled() {
    // Tarkista että kaikki kielet täytetty (name, description, specs)
    const allLanguagesFilled = isLanguageFilled("fi") && isLanguageFilled("sv") && isLanguageFilled("en");
    
    // Tarkista että globaalit kentät (hinta ja varastosaldo) täytetty
    const price = addProductForm.querySelector('[name="price"]').value.trim();
    const stock = addProductForm.querySelector('[name="stock"]').value.trim();
    const globalFieldsFilled = price !== "" && stock !== "";
    
    return allLanguagesFilled && globalFieldsFilled;
}

function updateLanguageInstruction() {
    const instructionEl = document.getElementById("languageInstruction");
    if (!instructionEl) return;
    
    if (isLanguageFilled(currentLanguage)) {
        instructionEl.textContent = `✓ ${languageNames[currentLanguage]} täytetty`;
    } else {
        instructionEl.textContent = `📝 Lisää tuotteen tiedot ${languageNames[currentLanguage]}`;
    }
}

function updateSubmitButton() {
    if (!submitBtn) return;
    
    const allFilled = checkAllLanguagesFilled();
    
    if (allFilled) {
        submitBtn.innerText = "Lisää tuote";
        submitBtn.style.background = "";
        submitBtn.style.opacity = "1";
        submitBtn.disabled = false;
    } else {
        submitBtn.innerText = "Seuraava kieli";
        submitBtn.style.background = "#666";
        submitBtn.style.opacity = "0.8";
        submitBtn.disabled = false;
    }
}

function saveCurrentLanguageState() {
    const name = addProductForm.name.value;
    const description = addProductForm.description.value;
    const specs = addProductForm.querySelector('[name="specs"]').value;
    console.log('Saving state for language:', currentLanguage, { name, description, specs });
    formStates[currentLanguage] = {
        name: name,
        description: description,
        specs: specs,
        filled: isLanguageFilled(currentLanguage)
    };
}

function loadLanguageState(lang) {
    const state = formStates[lang];
    addProductForm.name.value = state.name || "";
    addProductForm.description.value = state.description || "";
    addProductForm.querySelector('[name="specs"]').value = state.specs || "";
    
    // Päivitä placeholder-tekstit
    addProductForm.name.placeholder = placeholders[lang].name;
    addProductForm.description.placeholder = placeholders[lang].description;
    addProductForm.querySelector('[name="specs"]').placeholder = placeholders[lang].specs;
    addProductForm.querySelector('[name="price"]').placeholder = placeholders[lang].price;
    addProductForm.querySelector('[name="stock"]').placeholder = placeholders[lang].stock;
    
    // Päivitä kategorian valikon vaihtoehdot
    updateCategoryOptions(lang);
    
    // Päivitä tuotteen tyypin valikon vaihtoehdot
    updateTypeOptions(lang);
    
    // Päivitä valikon placeholder-tekstit
    const categorySelect = addProductForm.querySelector('[name="category"]');
    const typeSelect = addProductForm.querySelector('[name="type"]');
    const pickupSelect = addProductForm.querySelector('[name="pickup_point"]');
    
    if (categorySelect && categorySelect.querySelector('option[value=""]')) {
        categorySelect.querySelector('option[value=""]').textContent = selectPlaceholders[lang].category;
    }
    if (typeSelect && typeSelect.querySelector('option[value=""]')) {
        typeSelect.querySelector('option[value=""]').textContent = selectPlaceholders[lang].type;
    }
    if (pickupSelect && pickupSelect.querySelector('option[value=""]')) {
        pickupSelect.querySelector('option[value=""]').textContent = selectPlaceholders[lang].pickup_point;
    }
}

function updateCategoryOptions(lang) {
    const categorySelect = addProductForm.querySelector('[name="category"]');
    const options = categorySelect.querySelectorAll('option');
    
    options.forEach(opt => {
        const value = opt.value;
        if (value && categoryTranslations[lang] && categoryTranslations[lang][value]) {
            opt.textContent = categoryTranslations[lang][value];
        }
    });
}

function updateTypeOptions(lang) {
    const typeSelect = addProductForm.querySelector('[name="type"]');
    const options = typeSelect.querySelectorAll('option');
    
    // Ensimmäinen option on placeholder (value="")
    // Seuraavat optionit päivitetään käännösten perusteella
    const translations = typeTranslations[lang];
    
    options.forEach((opt, idx) => {
        if (idx === 0) {
            opt.textContent = selectPlaceholders[lang].type;
        } else if (idx < translations.length + 1) {
            opt.textContent = translations[idx - 1];
        }
    });
}

function switchLanguage(newLang) {
    console.log('switchLanguage called with:', newLang, 'currentLanguage:', currentLanguage);
    if (newLang === currentLanguage) {
        console.log('Same language, returning');
        return;
    }
    
    // Tallenna nykyisen kielen tila
    saveCurrentLanguageState();
    
    // Merkitse ensimmäinen valittu kieli
    if (!firstLanguageChosen) {
        firstLanguageChosen = currentLanguage;
    }
    
    // Päivitä nykyinen kieli
    currentLanguage = newLang;
    console.log('Updated currentLanguage to:', currentLanguage);
    
    // Päivitä painikkeiden tyylit
    const languageSelector = document.getElementById('languageSelector');
    if (languageSelector) {
        const allBtns = languageSelector.querySelectorAll('.lang-flag');
        allBtns.forEach(b => {
            b.classList.remove("active");
            b.style.borderColor = "transparent";
            console.log('Removed active from button:', b.dataset.lang);
        });
        
        const activeBtn = languageSelector.querySelector(`.lang-flag[data-lang="${newLang}"]`);
        if (activeBtn) {
            activeBtn.classList.add("active");
            activeBtn.style.borderColor = "#b0a078";
            console.log('Added active to button:', newLang);
        }
    }
    
    // Lataa uuden kielen tila
    loadLanguageState(newLang);
    
    // Päivitä instruction ja nappi
    updateLanguageInstruction();
    updateSubmitButton();
}

function setupLanguageButtons() {
    const languageSelector = document.getElementById('languageSelector');
    console.log('setupLanguageButtons called, languageSelector:', languageSelector);
    if (!languageSelector) {
        console.error('languageSelector not found!');
        return;
    }
    
    // Hae kaikki kieleen liittyvät nappulat
    const languageButtons = languageSelector.querySelectorAll('.lang-flag');
    console.log('Found language buttons:', languageButtons.length);
    
    // Aseta click handlerit suoraan nappeihin
    languageButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const newLang = btn.dataset.lang;
            console.log('Button clicked, switching to language:', newLang);
            switchLanguage(newLang);
        });
    });
    
    // Alussa näytä instruction
    updateLanguageInstruction();
    updateSubmitButton();
}

// Kutsutaan alussa
setupLanguageButtons();

/* =================================================
   1. TUOTELISTAUS + HAKU
================================================= */
async function renderProducts(filter = "") {
    try {
        const res = await fetch('/api/admin/products');
        const products = await res.json();
        productList.innerHTML = "";

        products
            .filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
            .forEach(p => {
                const li = document.createElement("li");
                li.className = "product-item";
                li.innerHTML = `
                    <span><b>${p.name}</b> <small>(${p.price} €)</small></span>
                    <div class="actions" style="display:flex; gap:8px;">
                        <button class="edit-btn" onclick="editProduct(${p.id})">✏️ Muokkaa</button>
                        <button class="delete-btn" onclick="deleteProduct(${p.id})">🗑 Poista</button>
                    </div>
                `;
                productList.appendChild(li);
            });
    } catch (err) {
        console.error("Latausvirhe:", err);
        productList.innerHTML = "<li>Virhe ladattaessa tuotteita.</li>";
    }
}

/* =================================================
   2. MUOKKAUSTILAN AKTIOINTI
================================================= */
window.editProduct = async function(id) {
    try {
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error("Tuotetta ei löytynyt");
        const p = await res.json();

        editingProductId = id;

        // Reset language states before loading product data
        formStates.fi = { name: "", description: "", specs: "", filled: true };
        formStates.sv = { name: "", description: "", specs: "", filled: true };
        formStates.en = { name: "", description: "", specs: "", filled: true };

        // Lataa tuotetiedot nykyiselle kielelle
        currentLanguage = "fi";
        firstLanguageChosen = null;
        formStates.fi = {
            name: p.name || "",
            description: p.description || "",
            specs: p.specs || "",
            filled: true
        };

        // Formu doldur
        addProductForm.name.value = p.name;
        addProductForm.description.value = p.description || "";
        addProductForm.querySelector('[name="price"]').value = p.price;
        addProductForm.querySelector('[name="category"]').value = p.category_id || "";
        addProductForm.querySelector('[name="specs"]').value = p.specs || "";
        addProductForm.querySelector('[name="stock"]').value = p.stock || 0;
        addProductForm.querySelector('[name="pickup_point"]').value = p.pickup_point || "";
        addProductForm.querySelector('[name="type"]').value = p.type;

        // Reset language button styles
        const langFlags = document.querySelectorAll(".lang-flag");
        langFlags.forEach((btn, idx) => {
            btn.classList.remove("active");
            if (idx === 0) {
                btn.classList.add("active");
                btn.style.borderColor = "#b0a078";
            } else {
                btn.style.borderColor = "transparent";
            }
        });

        // UI Güncellemeleri
        formTitle.innerText = "Muokkaa tuotetta";
        submitBtn.innerText = "Tallenna muutokset";
        submitBtn.style.background = "#2c3e50"; // Daha ciddi bir renk
        
        if (cancelBtn) cancelBtn.classList.remove("hidden");
        if (editBadge) editBadge.classList.remove("hidden");

        // Lataa kielen tila niin että valikon vaihtoehdot päivittyvät
        loadLanguageState("fi");

        // Mevcut resim önizlemesi
        imagePreview.innerHTML = p.image 
            ? `<div style="position:relative;">
                <p style="font-size:10px; margin:0;">Nykyinen kuva:</p>
                <img src="${p.image}" style="width:120px; border-radius:6px; border:2px solid #b0a078;">
               </div>` 
            : "";

        // Form alanına yumuşak geçiş
        document.getElementById("add-product").scrollIntoView({ behavior: "smooth" });

    } catch (err) {
        alert("Virhe haettaessa tuotteen tietoja.");
        console.error(err);
    }
};

/* =================================================
   3. LOMAKKEEN LÄHETYS (LISÄYS JA PÄIVITYS)
================================================= */
addProductForm.addEventListener("submit", async e => {
    e.preventDefault();
    
    // Tallenna nykyisen kielen tila ennen lähettämistä
    saveCurrentLanguageState();
    
    // Jos kaikki kielet ei ole täytetty, siirry seuraavaan kieleen
    if (!checkAllLanguagesFilled()) {
        const langOrder = ["fi", "sv", "en"];
        for (const lang of langOrder) {
            if (!isLanguageFilled(lang)) {
                // Siirry täyttämättömään kieleen
                switchLanguage(lang);
                return;
            }
        }
        return;
    }
    
    // Kaikki kielet on täytetty, jatka submittaukseen
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = "Tallennetaan...";

    const formData = new FormData(addProductForm);

    const toBase64 = file => new Promise(resolve => {
        if (!file || !file.size) return resolve(null);
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.readAsDataURL(file);
    });

    // Resimleri işle
    const mainImage = await toBase64(formData.get("mainImage"));
    const extraFiles = addProductForm.extraImages ? addProductForm.extraImages.files : [];
    const extraImagesArray = [];
    
    for (const file of extraFiles) {
        const base64 = await toBase64(file);
        if (base64) extraImagesArray.push(base64);
        if (extraImagesArray.length >= 5) break; 
    }

    const payload = {
        name: formData.get("name"),
        description: formData.get("description"),
        price: formData.get("price"),
        category_id: formData.get("category"),
        specs: formData.get("specs"),
        stock: formData.get("stock"),
        pickup_point: formData.get("pickup_point"),
        type: formData.get("type"),
        image: mainImage, // null ise backend mevcut resmi korumalı
        images: JSON.stringify(extraImagesArray)
    };

    const url = editingProductId ? `/api/products/${editingProductId}` : `/api/products`;
    const method = editingProductId ? "PUT" : "POST";

    try {
        const res = await fetch(url, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await res.json();

        if (result.success) {
            alert(editingProductId ? "Tuote päivitetty!" : "Tuote lisätty!");
            resetForm();
            renderProducts();
        } else {
            alert("Virhe: " + (result.error || "Tallennus epäonnistui"));
        }
    } catch (err) {
        alert("Yhteysvirhe tallennettaessa.");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
    }
});

/* =================================================
   4. POISTO JA RESET
================================================= */
window.deleteProduct = async function(id) {
    if (!confirm("Poistetaanko tuote pysyvästi?")) return;
    try {
        const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
        if (res.ok) {
            renderProducts();
        } else {
            alert("Poisto epäonnistui");
        }
    } catch (err) {
        console.error(err);
    }
};

function resetForm() {
    editingProductId = null;
    addProductForm.reset();
    imagePreview.innerHTML = "";
    
    // Zeroize language states
    formStates.fi = { name: "", description: "", specs: "", filled: false };
    formStates.sv = { name: "", description: "", specs: "", filled: false };
    formStates.en = { name: "", description: "", specs: "", filled: false };
    currentLanguage = "fi";
    firstLanguageChosen = null;
    
    // Reset language button styles
    const langFlags = document.querySelectorAll(".lang-flag");
    langFlags.forEach((btn, idx) => {
        btn.classList.remove("active");
        if (idx === 0) {
            btn.classList.add("active");
            btn.style.borderColor = "#b0a078";
        } else {
            btn.style.borderColor = "transparent";
        }
    });
    
    formTitle.innerText = "Lisää uusi tuote";
    
    if (cancelBtn) cancelBtn.classList.add("hidden");
    if (editBadge) editBadge.classList.add("hidden");
    
    // Update instruction and button
    updateLanguageInstruction();
    updateSubmitButton();
    
    // Reload language state to show correct placeholder texts
    loadLanguageState("fi");
}

if (cancelBtn) cancelBtn.onclick = resetForm;

/* =================================================
   5. TILAUKSET & ALUSTUS
================================================= */
async function renderOrders() {
    const orderList = document.getElementById("orderList");
    if(!orderList) return;
    
    try {
        const res = await fetch("/api/admin/orders");
        const orders = await res.json();
        orderList.innerHTML = "";

        orders.forEach(o => {
            const li = document.createElement("li");
            li.innerHTML = `
                <b>#${o.id}</b> - ${o.customer ? o.customer.fname : 'Nimetön'}
                <button onclick="showOrderDetail('${o.id}')">🔍</button>
            `;
            li.dataset.order = JSON.stringify(o);
            orderList.appendChild(li);
        });
    } catch (err) {
        console.error("Tilausten latausvirhe:", err);
    }
}

// Arama butonu tetikleyici
if (searchBtn) {
    searchBtn.onclick = () => renderProducts(searchInput.value);
}

// Resim seçildiğinde anlık önizleme
if (mainImageInput) {
    mainImageInput.onchange = () => {
        if (mainImageInput.files[0]) {
            const url = URL.createObjectURL(mainImageInput.files[0]);
            imagePreview.innerHTML = `
                <p style="font-size:10px; margin:0;">Uusi kuva valittu:</p>
                <img src="${url}" style="width:120px; border-radius:6px; border:2px solid #2ecc71;">
            `;
        }
    };
}

// Päivitä nappi kun käyttäjä kirjoittaa
const nameInput = addProductForm.querySelector('[name="name"]');
const descInput = addProductForm.querySelector('[name="description"]');
const specsInput = addProductForm.querySelector('[name="specs"]');
const priceInput = addProductForm.querySelector('[name="price"]');
const stockInput = addProductForm.querySelector('[name="stock"]');

if (nameInput) nameInput.addEventListener("input", updateSubmitButton);
if (descInput) descInput.addEventListener("input", updateSubmitButton);
if (specsInput) specsInput.addEventListener("input", updateSubmitButton);
if (priceInput) priceInput.addEventListener("input", updateSubmitButton);
if (stockInput) stockInput.addEventListener("input", updateSubmitButton);

// Başlat
renderProducts();
renderOrders();