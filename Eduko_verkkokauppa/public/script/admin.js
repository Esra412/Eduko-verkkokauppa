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


// 2. TUOTTEEN LISÄÄMINEN
document.getElementById('addProductForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(e.target);
    
    // Apufunktio kuvan muuttamiseksi Base64-muotoon
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });

    try {
        // 1. Käsittele pääkuva
        const mainImageFile = formData.get('mainImage');
        const mainImageBase64 = await toBase64(mainImageFile);

        // 2. Käsittele lisäkuvat (max 5)
        const extraImageFiles = e.target.extraImages.files;
        const extraImagesArray = [];
        
        // Otetaan vain 5 ensimmäistä kuvaa
        const count = Math.min(extraImageFiles.length, 5);
        for (let i = 0; i < count; i++) {
            const base64 = await toBase64(extraImageFiles[i]);
            extraImagesArray.push(base64);
        }

        // 3. Valmistele lähetettävä data
const data = {
    name: formData.get('name'),
    description: formData.get('description'),
    price: formData.get('price'),
    category_id: formData.get('category'),
    specs: formData.get('specs'),
    stock: formData.get('stock'),          // UUSI
    pickup_point: formData.get('pickup_point'), // UUSI
    image: mainImageBase64,
    images: JSON.stringify(extraImagesArray)
};

        const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        if (result.success) {
            alert("Tuote lisätty onnistuneesti!");
            e.target.reset();
            document.getElementById('imagePreview').innerHTML = "";
        } else {
            alert("Virhe: " + result.error);
        }

    } catch (err) {
        console.error("Latausvirhe:", err);
        alert("Kuvien käsittely epäonnistui.");
    }
});

// Kuvaesikatselu (vapaaehtoinen lisä)
document.querySelector('input[name="extraImages"]').addEventListener('change', function(e) {
    const preview = document.getElementById('imagePreview');
    preview.innerHTML = "";
    Array.from(this.files).forEach(file => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        img.style.height = "50px";
        img.style.borderRadius = "5px";
        preview.appendChild(img);
    });
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



// ==========================================
// 5. TILAUSTEN HALLINTA
// ==========================================
/**
 * ADMIN.JS - Korjattu tilausten hallinta
 */

async function renderOrders() {
    const orderList = document.getElementById('orderList');
    try {
        const res = await fetch('/api/admin/orders');
        const orders = await res.json();

        orderList.innerHTML = "";
        if (orders.length === 0) {
            orderList.innerHTML = "<li>Ei tilauksia muistissa.</li>";
            return;
        }

        orders.forEach(order => {
            const li = document.createElement("li");
            const c = order.customer || {};
            
            // Rakennetaan nimi turvallisesti
            const fullName = (c.fname || c.lname) ? `${c.fname || ''} ${c.lname || ''}` : (c.email || "Nimetön");

            li.innerHTML = `
                <div>
                    <b>#${order.id}</b> - ${fullName} 
                    <span style="color: ${order.status === 'Maksettu' ? '#27ae60' : '#f39c12'}; font-weight:bold;">
                        [${order.status}]
                    </span>
                </div>
                <button onclick="showOrderDetail('${order.id}')">🔍 Näytä tiedot</button>
            `;
            // Tärkeää: tallennetaan data elementtiin JSON-muodossa hakuja varten
            li.setAttribute('data-order-data', JSON.stringify(order));
            orderList.appendChild(li);
        });
    } catch (err) {
        console.error("Virhe tilauksissa:", err);
        orderList.innerHTML = "<li>Virhe ladattaessa tilauksia.</li>";
    }
}

window.showOrderDetail = function(orderId) {
    const allLis = Array.from(document.querySelectorAll('#orderList li'));
    const targetLi = allLis.find(li => {
        const data = JSON.parse(li.getAttribute('data-order-data'));
        return data.id === orderId;
    });

    if (!targetLi) return;
    const order = JSON.parse(targetLi.getAttribute('data-order-data'));
    const c = order.customer || {};

document.getElementById('orderNumber').innerText = order.id;
    document.getElementById('orderName').innerText = c.fname; // Tämä on nyt se customer_name
    document.getElementById('orderPhone').innerText = c.phone || 'Ei puhelinta';
    document.getElementById('orderEmail').innerText = c.email || 'Ei sähköpostia';
    document.getElementById('orderAddress').innerText = c.address || 'Ei osoitetta';
    
    const itemsTable = document.getElementById('orderItems');
    itemsTable.innerHTML = `
        <tr style="text-align:left; border-bottom: 2px solid #ddd;">
            <th style="padding:8px;">Tuote</th>
            <th style="padding:8px;">Hinta</th>
        </tr>`;

    order.items.forEach(item => {
        itemsTable.innerHTML += `
            <tr>
                <td style="padding:8px;">${item.name}</td>
                <td style="padding:8px;">${parseFloat(item.price).toFixed(2)} €</td>
            </tr>`;
    });

    itemsTable.innerHTML += `
        <tr style="font-weight:bold; background:#f9f9f9;">
            <td style="padding:8px; border-top:2px solid #b0a078;">YHTEENSÄ</td>
            <td style="padding:8px; border-top:2px solid #b0a078;">${parseFloat(order.amount).toFixed(2)} €</td>
        </tr>`;

    document.getElementById('orderDetails').classList.remove('hidden');
    document.getElementById('orderDetails').scrollIntoView({ behavior: 'smooth' });
};

// Alustetaan tilauslista
renderOrders();

