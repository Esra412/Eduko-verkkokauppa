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

        // Formu doldur
        addProductForm.name.value = p.name;
        addProductForm.description.value = p.description || "";
        addProductForm.price.value = p.price;
        addProductForm.category.value = p.category_id || "";
        addProductForm.specs.value = p.specs || "";
        addProductForm.stock.value = p.stock || 0;
        addProductForm.pickup_point.value = p.pickup_point || "";
        addProductForm.type.value = p.type;

        // UI Güncellemeleri
        formTitle.innerText = "Muokkaa tuotetta";
        submitBtn.innerText = "Tallenna muutokset";
        submitBtn.style.background = "#2c3e50"; // Daha ciddi bir renk
        
        if (cancelBtn) cancelBtn.classList.remove("hidden");
        if (editBadge) editBadge.classList.remove("hidden");

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
    
    formTitle.innerText = "Lisää uusi tuote";
    submitBtn.innerText = "Lisää tuote";
    submitBtn.style.background = "";
    
    if (cancelBtn) cancelBtn.classList.add("hidden");
    if (editBadge) editBadge.classList.add("hidden");
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

// Başlat
renderProducts();
renderOrders();