/**
 * ADMIN.JS – Täydellinen hallintalogiikka
 */

console.log("Admin.js ladattu!");

function showAdminSessionExpiredMessage() {
    alert("Istuntosi on vanhentunut. Kirjaudu uudelleen sisään jatkaaksesi.");
    window.location.href = "/verkkokauppa/login";
}

async function parseAdminJsonResponse(res, defaultMessage) {
    let payload = null;

    try {
        payload = await res.json();
    } catch (err) {
        payload = null;
    }

    if (res.status === 401) {
        showAdminSessionExpiredMessage();
        throw new Error("ADMIN_SESSION_EXPIRED");
    }

    if (!res.ok) {
        throw new Error(payload?.message || defaultMessage || "Toiminto epäonnistui.");
    }

    return payload;
}

// --- TILAN HALLINTA ---
let currentLanguage = 'fi';
let editingProductId = null;

// Sticky-kenttien globaalit (säilyvät kaikkien kielten välillä)
let stickPrice = "";
let stickStock = "";
let stickPickup = "";
let stickType = "";

// Monikieliset kentät (name, description, specs)
const formStates = {
    fi: { name: "", description: "", specs: "" },
    sv: { name: "", description: "", specs: "" },
    en: { name: "", description: "", specs: "" }
};

// --- ALUSTUS ---
document.addEventListener('DOMContentLoaded', () => {
    renderOrders();
    renderProducts();
    setupLanguageButtons();
    setupImagePreview();

    const searchBtn = document.getElementById("searchBtn");
    if (searchBtn) {
        searchBtn.onclick = () => renderProducts(document.getElementById("searchProduct").value);
    }
});

/* =================================================
    MONIKIELISYYS JA LOMAKE
================================================= */

function isLanguageComplete(lang) {
    const state = formStates[lang];
    return state.name.trim() !== '' && state.description.trim() !== '' && 
           state.specs.trim() !== '';
}

function updateLanguageButtonStyles() {
    const buttons = document.querySelectorAll('.lang-flag');
    buttons.forEach(btn => {
        const lang = btn.dataset.lang;
        if (isLanguageComplete(lang)) {
            btn.style.backgroundColor = '#e8f5e9';
            btn.style.borderColor = '#4caf50';
            btn.title = `${lang.toUpperCase()} - Valmis ✓`;
        } else {
            btn.style.backgroundColor = '#fff';
            btn.style.borderColor = '#eee';
            btn.title = `${lang.toUpperCase()} - Puutteellinen`;
        }
    });
}

function setupLanguageButtons() {
    const buttons = document.querySelectorAll('.lang-flag');
    const instruction = document.getElementById('languageInstruction');

    // Seuraava kieli -nappi
    const nextLangBtn = document.getElementById('nextLangBtn');
    if (nextLangBtn) {
        nextLangBtn.onclick = () => {
            const languages = ['fi', 'sv', 'en'];
            const currentIndex = languages.indexOf(currentLanguage);
            const nextLang = languages[(currentIndex + 1) % languages.length];
            
            // Simuloi klikkia seuraavaan kieleen
            const targetBtn = document.querySelector(`[data-lang="${nextLang}"]`);
            if (targetBtn) targetBtn.click();
        };
    }

    buttons.forEach(btn => {
        btn.onclick = () => {
            // 1. Tallenna nykyisen kielen monikieliset sisältö muistiin ennen vaihtoa
            formStates[currentLanguage].name = document.getElementById('prodName').value;
            formStates[currentLanguage].description = document.getElementById('prodDesc').value;
            formStates[currentLanguage].specs = document.getElementById('prodSpecs').value;
            
            // Tallenna sticky-kentät (nämä ovat globaaleja, ei per-language)
            stickPrice = document.getElementById('prodPrice').value;
            stickStock = document.getElementById('prodStock').value;
            stickPickup = document.getElementById('prodPickup').value;
            stickType = document.getElementById('prodType').value;

            // Päivitä kielivalikon värit
            updateLanguageButtonStyles();

            // 2. Päivitä napit
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 3. Vaihda kieli
            currentLanguage = btn.dataset.lang;
            instruction.innerText = `Muokataan kieltä: ${currentLanguage.toUpperCase()}`;

            // 4. Lataa valitun kielen monikieliset sisältö kenttiin
            document.getElementById('prodName').value = formStates[currentLanguage].name;
            document.getElementById('prodDesc').value = formStates[currentLanguage].description;
            document.getElementById('prodSpecs').value = formStates[currentLanguage].specs;
            
            // Lataa sticky-kentät (nämä pysyvät samoina)
            document.getElementById('prodPrice').value = stickPrice;
            document.getElementById('prodStock').value = stickStock;
            document.getElementById('prodPickup').value = stickPickup;
            document.getElementById('prodType').value = stickType;
        };
    });
    
    // Päivitys reaaliajassa kun kirjoitetaan (monikieliset kentät)
    ['prodName', 'prodDesc', 'prodSpecs'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', updateLanguageButtonStyles);
        }
    });
}

function setupImagePreview() {
    const mainInput = document.getElementById('mainImageInput');
    const extraInput = document.getElementById('extraImagesInput');
    const preview = document.getElementById('imagePreview');

    const renderPreviews = () => {
        preview.innerHTML = "";

        const files = [];
        if (mainInput.files && mainInput.files[0]) {
            files.push({ file: mainInput.files[0], label: 'Pääkuva' });
        }
        if (extraInput.files && extraInput.files.length > 0) {
            for (let i = 0; i < extraInput.files.length; i++) {
                files.push({ file: extraInput.files[i], label: `Lisäkuva ${i + 1}` });
            }
        }

        files.forEach(({ file, label }) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'preview-image-wrapper';
                const caption = document.createElement('div');
                caption.className = 'preview-image-label';
                caption.innerText = label;
                const img = document.createElement('img');
                img.src = e.target.result;
                wrapper.appendChild(img);
                wrapper.appendChild(caption);
                preview.appendChild(wrapper);
            };
            reader.readAsDataURL(file);
        });
    };

    mainInput.onchange = renderPreviews;
    extraInput.onchange = renderPreviews;
}

/* =================================================
    TILAUSTEN HALLINTA
================================================= */

async function renderOrders() {
    const list = document.getElementById('orderList');
    if (!list) return;

    try {
        const res = await fetch('/verkkokauppa/api/admin/orders');
        const orders = await parseAdminJsonResponse(res, "Tilausten lataus epäonnistui.");
        
        if (orders.length === 0) {
            list.innerHTML = "<p>Ei tilauksia.</p>";
            return;
        }

        list.innerHTML = orders.map(o => {
            const customerName = o.customer?.fullName || [o.customer?.fname, o.customer?.lname].filter(Boolean).join(' ') || 'Nimetön';

            return `
            <li>
                <div class="order-basic-info">
                    <span class="order-id-text">Tilaus #${o.id}</span>
                    <span class="customer-name">${customerName}</span>
                </div>
                <button class="search-icon-btn" onclick="showOrderDetail('${o.id}')">
                    <i class="fas fa-search"></i>
                </button>
            </li>
        `}).join('');
    } catch (err) {
        if (err.message === "ADMIN_SESSION_EXPIRED") return;
        console.error("Virhe tilausten latauksessa:", err);
        list.innerHTML = "<p>Tilausten lataus epäonnistui. Yritä hetken kuluttua uudelleen.</p>";
    }
}

window.showOrderDetail = async (id) => {
    try {
        const res = await fetch(`/verkkokauppa/api/admin/orders/${id}`);
        if (!res.ok) {
            throw new Error(`Tilauksen haku epäonnistui (${res.status})`);
        }

        const o = await res.json();
        const content = document.getElementById('orderDetailContent');
        const customerName = o.customer?.fullName || [o.customer?.fname, o.customer?.lname].filter(Boolean).join(' ') || 'Nimetön';
        const createdAt = o.created_at ? new Date(o.created_at).toLocaleDateString('fi-FI') : '-';
        const totalPrice = Number(o.total_price ?? o.amount ?? 0).toFixed(2);

        content.innerHTML = `
            <div class="order-info-grid">
                <div><strong>Päivämäärä:</strong><br>${createdAt}</div>
                <div><strong>Tilaus-ID:</strong><br>#${o.id}</div>
                <div><strong>Asiakas:</strong><br>${customerName}</div>
                <div><strong>Puhelin:</strong><br>${o.customer?.phone || '-'}</div>
                <div style="grid-column: span 2;"><strong>Sähköposti:</strong><br>${o.customer?.email || '-'}</div>
                <div style="grid-column: span 2;"><strong>Osoite:</strong><br>${o.customer?.address || 'Ei osoitetta'}</div>
            </div>
            <h4 style="margin: 15px 0 10px 0; border-top: 1px solid #eee; padding-top: 15px;">Tilattu sisältö:</h4>
            ${(o.items || []).map(item => `
                <div class="modal-item-row">
                    <span>${item.name}${item.quantity ? ` (${item.quantity} kpl)` : ''}</span>
                    <b>${Number(item.price || 0).toFixed(2)} €</b>
                </div>
            `).join('')}
            <div style="text-align:right; margin-top:20px; font-size:1.3rem;">
                <strong>Yhteensä: ${totalPrice} €</strong>
            </div>
        `;
        document.getElementById('orderDetailsModal').classList.remove('hidden');
    } catch (err) {
        console.error('Tilauksen tietojen haku epäonnistui:', err);
        alert("Tilauksen tietojen haku epäonnistui.");
    }
};

window.closeOrderModal = () => {
    document.getElementById('orderDetailsModal').classList.add('hidden');
};

/* =================================================
    TUOTTEIDEN CRUD (LISÄYS, MUOKKAUS, POISTO)
================================================= */

async function renderProducts(search = "") {
    const list = document.getElementById("productList");
    try {
        // use the admin endpoint and absolute path to avoid relative URL issues on /admin
        const res = await fetch("/verkkokauppa/api/admin/products");
        let products = await parseAdminJsonResponse(res, "Tuotteiden lataus epäonnistui.");
        
        if (search) {
            products = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
        }

        const getImageSrc = (image) => {
            const fallback = '/verkkokauppa/images/edukosmall.png';
            if (!image) return fallback;

            let src = image.toString().trim();
            if (!src) return fallback;
            if (src.startsWith('data:image/')) return src;

            src = src.replace(/\\/g, '/');

            if (src.startsWith('/verkkokauppa/')) return src;
            if (src.startsWith('http://') || src.startsWith('https://')) return src;
            if (src.startsWith('/uploads/') || src.startsWith('/images/')) {
                return '/verkkokauppa' + src;
            }
            if (src.includes('/uploads/')) {
                return '/verkkokauppa' + src.slice(src.indexOf('/uploads/'));
            }
            if (src.includes('/images/')) {
                return '/verkkokauppa' + src.slice(src.indexOf('/images/'));
            }
            if (src.startsWith('uploads/') || src.startsWith('images/')) {
                return '/verkkokauppa/' + src;
            }
            return '/verkkokauppa/uploads/' + src;
        };

        list.innerHTML = products.map(p => {
            const imgSrc = getImageSrc(p.image);
            return `
            <li style="display: flex; gap: 12px; align-items: center;">
                <img src="${imgSrc}" alt="${p.name}" onerror="this.onerror=null; this.src='/verkkokauppa/images/edukosmall.png';" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                <div class="product-basic-info" style="flex: 1;">
                    <strong>${p.name}</strong>
                    <span style="font-size: 0.85rem; color: #666;">Hinta: ${p.price} € | Varasto: ${p.stock} kpl</span>
                </div>
                <div class="action-buttons">
                    <button class="edit-btn" onclick="editProduct(${p.id})" title="Muokkaa">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteProduct(${p.id})" title="Poista">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </li>
        `}).join('');
    } catch (e) {
        if (e.message === "ADMIN_SESSION_EXPIRED") return;
        console.error("Tuotteiden latausvirhe:", e);
        list.innerHTML = "<p>Tuotteiden lataus epäonnistui. Yritä hetken kuluttua uudelleen.</p>";
    }
}

window.editProduct = async (id) => {
    try {
        // public endpoint is fine here but ensure absolute path
        const res = await fetch(`/verkkokauppa/api/products/${id}`);
        const p = await res.json();
        
        editingProductId = id;
        document.getElementById('formTitle').innerText = "Muokkaa tuotetta";
        document.getElementById('submitBtn').innerText = "Tallenna muutokset";
        document.getElementById('cancelEditBtn').classList.remove('hidden');
        document.getElementById('editModeBadge').classList.remove('hidden');

        // Täytetään sticky-kentät
        const form = document.getElementById('addProductForm');
        stickPrice = p.price || "";
        stickStock = p.stock || "";
        stickPickup = p.pickup_point || "";
        stickType = p.type || "";
        
        form.category.value = p.category_id;
        document.getElementById('prodPrice').value = stickPrice;
        document.getElementById('prodStock').value = stickStock;
        document.getElementById('prodPickup').value = stickPickup;
        document.getElementById('prodType').value = stickType;

        // Täytetään monikieliset tilat
        // API palauttaa name_fi, description_fi, specs_fi jne.
        formStates.fi = { 
            name: p.name_fi || p.name || "", 
            description: p.description_fi || p.description || "", 
            specs: p.specs_fi || p.specs || "" 
        };
        formStates.sv = { 
            name: p.name_sv || "", 
            description: p.description_sv || "", 
            specs: p.specs_sv || "" 
        };
        formStates.en = { 
            name: p.name_en || "", 
            description: p.description_en || "", 
            specs: p.specs_en || "" 
        };

        // Päivitetään nykyinen näkymä (Finnish)
        currentLanguage = 'fi';
        document.getElementById('prodName').value = formStates.fi.name;
        document.getElementById('prodDesc').value = formStates.fi.description;
        document.getElementById('prodSpecs').value = formStates.fi.specs;
        
        // Päivitä language button styles
        updateLanguageButtonStyles();

        window.scrollTo({ top: document.getElementById('add-product').offsetTop - 100, behavior: 'smooth' });
    } catch (e) { 
        console.error("Tuotteen haku epäonnistui:", e);
        alert("Tuotteen tietojen haku epäonnistui."); 
    }
};

document.getElementById('cancelEditBtn').onclick = () => {
    // Nollaa edit-tila
    editingProductId = null;
    currentLanguage = 'fi';
    
    // Tyhjennä lomake
    document.getElementById('addProductForm').reset();
    document.getElementById('imagePreview').innerHTML = '';
    
    // Nollaa formStates
    formStates.fi = { name: "", description: "", specs: "" };
    formStates.sv = { name: "", description: "", specs: "" };
    formStates.en = { name: "", description: "", specs: "" };
    stickPrice = "";
    stickStock = "";
    stickPickup = "";
    stickType = "";
    
    // Päivitä näkymä
    document.getElementById('formTitle').innerText = "Lisää uusi tuote";
    document.getElementById('submitBtn').innerText = "Tallenna tuote";
    document.getElementById('cancelEditBtn').classList.add('hidden');
    document.getElementById('editModeBadge').classList.add('hidden');
    
    // Päivitä kielinappuloiden värit
    updateLanguageButtonStyles();
    
    // Palauta FI-kielisessä tilassa
    const fiBtn = document.querySelector('[data-lang="fi"]');
    if (fiBtn) fiBtn.click();
};

document.getElementById('addProductForm').onsubmit = async (e) => {
    e.preventDefault();
    
    // 1. Päivitä nykyisen kielen tiedot muistiin ennen lähetystä
    formStates[currentLanguage].name = document.getElementById('prodName').value;
    formStates[currentLanguage].description = document.getElementById('prodDesc').value;
    formStates[currentLanguage].specs = document.getElementById('prodSpecs').value;
    
    // 2. Päivitä sticky-kentät muistiin
    stickPrice = document.getElementById('prodPrice').value;
    stickStock = document.getElementById('prodStock').value;
    stickPickup = document.getElementById('prodPickup').value;
    stickType = document.getElementById('prodType').value;

    // 3. Validaatio (Tarkistetaan että kaikki kielet on täytetty)
    const missingLanguages = ['fi', 'sv', 'en'].filter(lang => !isLanguageComplete(lang));
    if (missingLanguages.length > 0) {
        alert(`Täytä kaikki kielet ennen tallennusta: ${missingLanguages.join(', ')}`);
        return;
    }

    // 4. Määrittele URL ja Metodi
    const method = editingProductId ? 'PUT' : 'POST';
    // Käytetään absoluuttisia URL:ja /verkkokauppa prefiksillä
    const url = editingProductId
        ? `/verkkokauppa/api/products/${editingProductId}`
        : `/verkkokauppa/api/products`;

    // 5. LUODAAN FORMDATA (Tämä on kriittinen osa)
    const formData = new FormData();
    
    // TÄRKEÄÄ: Multer lukee nämä req.bodyyn palvelimella
    formData.append('price', stickPrice);
    formData.append('stock', stickStock);
    formData.append('pickup_point', stickPickup);
    formData.append('type', stickType);
    formData.append('category', document.getElementById('addProductForm').category.value);

    // Lähetetään käännökset JSON-merkkijonona (server.js JSON.parse purkaa tämän)
    const translations = {
        fi: formStates.fi,
        sv: formStates.sv,
        en: formStates.en
    };
    console.log(JSON.stringify(translations)); // Debug-tuloste
    formData.append('translations', JSON.stringify(translations));

    // Lisätään pääkuva jos se on valittu
    const mainImageFile = document.getElementById('mainImageInput').files[0];
    if (mainImageFile) {
        formData.append('mainImage', mainImageFile);
    }

    // Lisätään kaikki valitut lisäkuvat
    const extraImageFiles = document.getElementById('extraImagesInput').files;
    if (extraImageFiles && extraImageFiles.length > 0) {
        for (let i = 0; i < extraImageFiles.length; i++) {
            formData.append('extraImages', extraImageFiles[i]);
        }
    }

    try {
        console.log("Lähetetään dataa...", Object.fromEntries(formData.entries())); // Debug-tuloste
        console.log("Tallennetaan osoitteeseen:", url);

        const res = await fetch(url, {
            method,
            body: formData
        });

        if (res.status === 401) {
            showAdminSessionExpiredMessage();
            return;
        }

        if (res.ok) {
            const result = await res.json();
            alert(editingProductId ? "Tuote päivitetty onnistuneesti!" : "Tuote lisätty onnistuneesti!");
            
            // Kevyt nollaus ilman reload
            editingProductId = null;
            document.getElementById('addProductForm').reset();
            document.getElementById('imagePreview').innerHTML = '';
            document.getElementById('formTitle').innerText = "Lisää uusi tuote";
            document.getElementById('submitBtn').innerText = "Tallenna tuote";
            document.getElementById('cancelEditBtn').classList.add('hidden');
            document.getElementById('editModeBadge').classList.add('hidden');
            
            // Nollaa formStates
            formStates.fi = { name: "", description: "", specs: "" };
            formStates.sv = { name: "", description: "", specs: "" };
            formStates.en = { name: "", description: "", specs: "" };
            stickPrice = "";
            stickStock = "";
            stickPickup = "";
            stickType = "";
            
            // Päivitä tuotteet
            renderProducts();
        } else {
            const errorText = await res.text();
            console.error("Palvelimen virhe:", res.status, errorText);
            alert("Virhe tallennuksessa: " + (res.status === 413 ? "Tiedosto liian suuri" : "Tallennus epäonnistui. Tarkista tiedot ja yritä uudelleen."));
        }
    } catch (err) {
        console.error("Verkkovirhe:", err);
        alert("Yhteys palvelimeen epäonnistui: " + err.message);
    }
};

window.deleteProduct = async (id) => {
    if (!confirm("Haluatko varmasti poistaa tämän tuotteen?")) return;
    try {
        const res = await fetch(`/verkkokauppa/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) renderProducts();
    } catch (e) { alert("Poisto epäonnistui."); }
};
