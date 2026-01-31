/**
 * ADMIN.JS - Päivitetty versio (Tietokantayhteys)
 */

const addProductForm = document.getElementById("addProductForm");
const productList = document.getElementById("productList");
const searchBtn = document.getElementById("searchBtn");
const imagePreview = document.getElementById("imagePreview");
const mainImageInput = document.querySelector('input[name="mainImage"]');
const extraImagesInput = document.querySelector('input[name="extraImages"]');

<<<<<<< Updated upstream
// Takaisin etusivulle -painike
const backBtn = document.getElementById('BackToMenuBtn');
backBtn.addEventListener('click', () => {
    window.location.href = 'index.html'; // muokkaa tarvittaessa oikea URL
});

function saveProducts() {
  localStorage.setItem("products", JSON.stringify(products));
=======
// ==========================================
// 1. TUOTTEIDEN LISTAUS (PALVELIMELTA)
// ==========================================
async function renderProducts(filter = "") {
    try {
        // Haetaan kaikki tuotteet API:sta (voit käyttää esim. latest-reittiä tai luoda uuden /api/products)
        const res = await fetch('/api/products/latest'); 
        const products = await res.json();

        productList.innerHTML = "";
        
        products
            .filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
            .forEach((p) => {
                const li = document.createElement("li");
                li.innerHTML = `
                    <span><b>${p.name}</b> (${p.price} €)</span>
                    <button class="delete-btn" onclick="deleteProduct(${p.id})">🗑 Poista</button>
                `;
                productList.appendChild(li);
            });
    } catch (err) {
        console.error("Virhe ladattaessa tuotteita:", err);
    }
>>>>>>> Stashed changes
}

// ==========================================
// 2. TUOTTEEN LISÄÄMINEN (TIETOKANTAAN)
// ==========================================
addProductForm.addEventListener("submit", async e => {
    e.preventDefault();
    const fd = new FormData(addProductForm);

    // Apu-funktio kuvan muuntamiseen Base64-muotoon
    const fileToBase64 = (file) => new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });

    try {
        const mainImageFile = mainImageInput.files[0];
        const mainImageBase64 = mainImageFile ? await fileToBase64(mainImageFile) : null;

        // Lähetettävä data
        const tuoteData = {
            name: fd.get("name"),
            description: fd.get("description"),
            price: parseFloat(fd.get("price")),
            image: mainImageBase64,
            category_id: parseInt(fd.get("category")) // Varmista, että HTML-valuet ovat numeroita
        };

const res = await fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tuoteData),
    // Lisää tämä rivi jos ongelma jatkuu:
    credentials: 'include' 
});

        if (res.ok) {
            alert("Tuote lisätty onnistuneesti!");
            addProductForm.reset();
            imagePreview.innerHTML = "";
            renderProducts(); // Päivitä lista
        } else {
            alert("Lisäys epäonnistui. Oletko kirjautunut?");
        }
    } catch (err) {
        console.error("Virhe tallennuksessa:", err);
    }
});

// ==========================================
// 3. TUOTTEEN POISTAMINEN
// ==========================================
window.deleteProduct = async function(id) {
    if (!confirm("Haluatko varmasti poistaa tuotteen?")) return;

    // Huom: Sinun tulee lisätä tämä reitti server.js-tiedostoon (app.delete('/api/products/:id', ...))
    alert("Poistotoiminto vaatii API-reitin server.js-tiedostoon.");
    
    /* Jos reitti on olemassa:
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    renderProducts(); 
    */
};

// ==========================================
// 4. KUVAN ESIKATSELU
// ==========================================
function previewImages() {
    imagePreview.innerHTML = "";
    if (mainImageInput.files[0]) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(mainImageInput.files[0]);
        img.style.width = "120px";
        img.style.borderRadius = "5px";
        img.style.border = "2px solid #b0a078";
        imagePreview.appendChild(img);
    }
}

mainImageInput.addEventListener("change", previewImages);

// ==========================================
// 5. TILAUKSEN HALLINTA (MOCK)
// ==========================================
const orders = [
    {
        orderNumber: 1001,
        name: "Matti Meikäläinen",
        phone: "0401234567",
        email: "matti@testi.fi",
        date: "2026-01-15 14:32",
        items: [{ name: "Arduino Uno", qty: 1, price: 25 }]
    }
];

const orderList = document.getElementById("orderList");
orders.forEach((o) => {
    const li = document.createElement("li");
    li.textContent = `${o.name} – #${o.orderNumber}`;
    li.style.cursor = "pointer";
    li.onclick = () => {
        document.getElementById("orderNumber").textContent = o.orderNumber;
        document.getElementById("orderName").textContent = o.name;
        document.getElementById("orderPhone").textContent = o.phone;
        document.getElementById("orderEmail").textContent = o.email;
        document.getElementById("orderDate").textContent = o.date;

        const tbody = document.getElementById("orderItems");
        tbody.innerHTML = "";
        o.items.forEach(it => {
            tbody.innerHTML += `<tr><td>${it.name}</td><td>${it.qty}</td><td>${it.price}€</td></tr>`;
        });
        document.getElementById("orderDetails").classList.remove("hidden");
    };
    orderList.appendChild(li);
});

// Hakupainike
searchBtn.addEventListener("click", () => {
    const val = document.getElementById("searchProduct").value;
    renderProducts(val);
});

// Alustus
renderProducts();