/**
 * ADMIN.JS - Täysi versio tuotteiden lisäykseen ja poistoon
 */

const addProductForm = document.getElementById("addProductForm");
const productList = document.getElementById("productList");
const searchBtn = document.getElementById("searchBtn");
const searchInput = document.getElementById("searchProduct");
const imagePreview = document.getElementById("imagePreview");
const mainImageInput = document.querySelector('input[name="mainImage"]');

// ==========================================
// 1. TUOTTEIDEN LISTAUS JA HAKU
// ==========================================
async function renderProducts(filter = "") {
    try {
        // Haetaan tuotteet admin-reitistä (joka näyttää kaikki tuotteet)
        const res = await fetch('/api/admin/products');
        if (!res.ok) throw new Error("Haku epäonnistui");
        
        const products = await res.json();

        productList.innerHTML = "";
        
        const filteredProducts = products.filter(p => 
            p.name.toLowerCase().includes(filter.toLowerCase())
        );

        filteredProducts.forEach((p) => {
            const li = document.createElement("li");
            li.innerHTML = `
                <span><b>${p.name}</b> (${p.price} €)</span>
                <button class="delete-btn" onclick="deleteProduct(${p.id})">🗑 Poista</button>
            `;
            productList.appendChild(li);
        });
    } catch (err) {
        console.error("Virhe ladattaessa tuotteita:", err);
        productList.innerHTML = "<li>Virhe ladattaessa tuotteita.</li>";
    }
}

// ==========================================
// 2. TUOTTEEN LISÄÄMINEN
// ==========================================
addProductForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const fd = new FormData(addProductForm);

    // Apu-funktio kuvan muuntamiseen Base64-muotoon
    const fileToBase64 = (file) => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });

    try {
        const mainImageFile = mainImageInput.files[0];
        let mainImageBase64 = null;

        if (mainImageFile) {
            mainImageBase64 = await fileToBase64(mainImageFile);
        }

        const tuoteData = {
            name: fd.get("name"),
            description: fd.get("description"),
            price: parseFloat(fd.get("price")),
            image: mainImageBase64,
            category_id: parseInt(fd.get("category"))
        };

        const res = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(tuoteData),
            credentials: 'include'
        });

        if (res.ok) {
            alert("Tuote lisätty onnistuneesti!");
            addProductForm.reset();
            imagePreview.innerHTML = "";
            renderProducts(); // Päivitetään poistolista
        } else {
            const errorData = await res.json();
            alert("Lisäys epäonnistui: " + (errorData.message || "Tarkista kirjautuminen"));
        }
    } catch (err) {
        console.error("Virhe tallennuksessa:", err);
        alert("Tallennusvirhe. Tarkista kuvan koko.");
    }
});

// ==========================================
// 3. TUOTTEEN POISTAMINEN (AKTIVOITU)
// ==========================================
window.deleteProduct = async function(id) {
    if (!confirm("Haluatko varmasti poistaa tämän tuotteen pysyvästi?")) return;

    try {
        const res = await fetch(`/api/products/${id}`, { 
            method: 'DELETE',
            credentials: 'include' 
        });

        if (res.ok) {
            alert("Tuote poistettu!");
            renderProducts(); // Päivitetään lista heti
        } else {
            alert("Poisto epäonnistui. Oletko edelleen kirjautuneena?");
        }
    } catch (err) {
        console.error("Virhe poistossa:", err);
        alert("Yhteysvirhe poistettaessa tuotetta.");
    }
};

// ==========================================
// 4. ESIKATSELU JA HAKU-NAPPI
// ==========================================
mainImageInput.addEventListener("change", () => {
    imagePreview.innerHTML = "";
    if (mainImageInput.files[0]) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(mainImageInput.files[0]);
        img.style.width = "120px";
        img.style.marginTop = "10px";
        img.style.borderRadius = "5px";
        img.style.border = "2px solid #b0a078";
        imagePreview.appendChild(img);
    }
});

searchBtn.addEventListener("click", () => {
    renderProducts(searchInput.value);
});

// Alustetaan tuotelista kun sivu latautuu
renderProducts();