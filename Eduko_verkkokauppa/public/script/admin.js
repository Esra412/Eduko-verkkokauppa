/**
 * ADMIN.JS – Täydellinen hallintalogiikka
 */

// --- TILAN HALLINTA ---
let currentLanguage = 'fi';
let editingProductId = null;
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

function setupLanguageButtons() {
    const buttons = document.querySelectorAll('.lang-flag');
    const instruction = document.getElementById('languageInstruction');

    buttons.forEach(btn => {
        btn.onclick = () => {
            // 1. Tallenna nykyisen kielen sisältö muistiin ennen vaihtoa
            formStates[currentLanguage].name = document.getElementById('prodName').value;
            formStates[currentLanguage].description = document.getElementById('prodDesc').value;
            formStates[currentLanguage].specs = document.getElementById('prodSpecs').value;

            // 2. Päivitä napit
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // 3. Vaihda kieli
            currentLanguage = btn.dataset.lang;
            instruction.innerText = `Muokataan kieltä: ${currentLanguage.toUpperCase()}`;

            // 4. Lataa valitun kielen sisältö kenttiin
            document.getElementById('prodName').value = formStates[currentLanguage].name;
            document.getElementById('prodDesc').value = formStates[currentLanguage].description;
            document.getElementById('prodSpecs').value = formStates[currentLanguage].specs;
        };
    });
}

function setupImagePreview() {
    const mainInput = document.getElementById('mainImageInput');
    const preview = document.getElementById('imagePreview');

    mainInput.onchange = () => {
        preview.innerHTML = "";
        if (mainInput.files && mainInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
            };
            reader.readAsDataURL(mainInput.files[0]);
        }
    };
}

/* =================================================
    TILAUSTEN HALLINTA
================================================= */

async function renderOrders() {
    const list = document.getElementById('orderList');
    if (!list) return;

    try {
        const res = await fetch('/api/admin/orders');
        const orders = await res.json();
        
        if (orders.length === 0) {
            list.innerHTML = "<p>Ei tilauksia.</p>";
            return;
        }

        list.innerHTML = orders.map(o => `
            <li>
                <div class="order-basic-info">
                    <span class="order-id-text">Tilaus #${o.id}</span>
                    <span class="customer-name">${o.customer ? o.customer.fname + ' ' + o.customer.lname : 'Nimetön'}</span>
                </div>
                <button class="search-icon-btn" onclick="showOrderDetail('${o.id}')">
                    <i class="fas fa-search"></i>
                </button>
            </li>
        `).join('');
    } catch (err) {
        console.error("Virhe tilausten latauksessa:", err);
    }
}

window.showOrderDetail = async (id) => {
    try {
        const res = await fetch(`/api/admin/orders/${id}`);
        const o = await res.json();
        const content = document.getElementById('orderDetailContent');

        content.innerHTML = `
            <div class="order-info-grid">
                <div><strong>Päivämäärä:</strong><br>${new Date(o.created_at).toLocaleDateString('fi-FI')}</div>
                <div><strong>Tilaus-ID:</strong><br>#${o.id}</div>
                <div><strong>Asiakas:</strong><br>${o.customer?.fname} ${o.customer?.lname}</div>
                <div><strong>Puhelin:</strong><br>${o.customer?.phone}</div>
                <div style="grid-column: span 2;"><strong>Sähköposti:</strong><br>${o.customer?.email}</div>
                <div style="grid-column: span 2;"><strong>Osoite:</strong><br>${o.customer?.address || 'Ei osoitetta'}</div>
            </div>
            <h4 style="margin: 15px 0 10px 0; border-top: 1px solid #eee; padding-top: 15px;">Tilattu sisältö:</h4>
            ${o.items.map(item => `
                <div class="modal-item-row">
                    <span>${item.name}</span>
                    <b>${Number(item.price).toFixed(2)} €</b>
                </div>
            `).join('')}
            <div style="text-align:right; margin-top:20px; font-size:1.3rem;">
                <strong>Yhteensä: ${Number(o.total_price).toFixed(2)} €</strong>
            </div>
        `;
        document.getElementById('orderDetailsModal').classList.remove('hidden');
    } catch (err) {
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
        const res = await fetch("/api/products");
        let products = await res.json();
        
        if (search) {
            products = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
        }

        list.innerHTML = products.map(p => `
            <li>
                <div class="product-basic-info">
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
        `).join('');
    } catch (e) { console.error("Tuotteiden latausvirhe:", e); }
}

window.editProduct = async (id) => {
    try {
        const res = await fetch(`/api/products/${id}`);
        const p = await res.json();
        
        editingProductId = id;
        editingProductId = id;
        document.getElementById('formTitle').innerText = "Muokkaa tuotetta";
        document.getElementById('submitBtn').innerText = "Tallenna muutokset";
        document.getElementById('cancelEditBtn').classList.remove('hidden');
        document.getElementById('editModeBadge').classList.remove('hidden');

        // Täytetään perusarvot
        const form = document.getElementById('addProductForm');
        form.price.value = p.price;
        form.stock.value = p.stock;
        form.category.value = p.category_id;
        form.pickup_point.value = p.pickup_point;
        form.type.value = p.type;

        // Täytetään monikieliset tilat (tässä oletetaan että API palauttaa käännökset)
        formStates.fi = { name: p.name, description: p.description, specs: p.specs };
        // Jos API tukee muita kieliä, ne asetetaan tässä...

        // Päivitetään nykyinen näkymä
        document.getElementById('prodName').value = formStates[currentLanguage].name;
        document.getElementById('prodDesc').value = formStates[currentLanguage].description;
        document.getElementById('prodSpecs').value = formStates[currentLanguage].specs;

        window.scrollTo({ top: document.getElementById('add-product').offsetTop - 100, behavior: 'smooth' });
    } catch (e) { alert("Tuotteen tietojen haku epäonnistui."); }
};

document.getElementById('cancelEditBtn').onclick = () => {
    location.reload(); // Helpoin tapa nollata muokkaustila
};

document.getElementById('addProductForm').onsubmit = async (e) => {
    e.preventDefault();
    
    // Tallenna viimeisimmät muutokset aktiivisesta kielestä
    formStates[currentLanguage].name = document.getElementById('prodName').value;
    formStates[currentLanguage].description = document.getElementById('prodDesc').value;
    formStates[currentLanguage].specs = document.getElementById('prodSpecs').value;

    const formData = new FormData(e.target);
    
    // Luodaan objekti joka sisältää kaikki käännökset ja perusdatat
    const productData = {
        price: formData.get('price'),
        stock: formData.get('stock'),
        category_id: formData.get('category'),
        pickup_point: formData.get('pickup_point'),
        type: formData.get('type'),
        translations: formStates // Lähetetään kaikki kieliversiot kerralla
    };

    const method = editingProductId ? 'PUT' : 'POST';
    const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products';

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        if (res.ok) {
            alert(editingProductId ? "Tuote päivitetty!" : "Tuote lisätty onnistuneesti!");
            location.reload();
        }
    } catch (err) { alert("Tallennus epäonnistui."); }
};

window.deleteProduct = async (id) => {
    if (!confirm("Haluatko varmasti poistaa tämän tuotteen?")) return;
    try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (res.ok) renderProducts();
    } catch (e) { alert("Poisto epäonnistui."); }
};