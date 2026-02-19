// Globaali muuttuja ostoskorille
let cart = [];

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. MOBIILIVALIKON LOGIIKKA ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mainNav = document.getElementById('main-navigation');

    if (mobileMenuBtn && mainNav) {
        mobileMenuBtn.addEventListener('click', () => {
            mainNav.classList.toggle('show');
            mobileMenuBtn.classList.toggle('open');
        });
    }

    // --- 2. OSTOSKORIN MODALIN HALLINTA ---
    const cartBtn = document.getElementById('cart-btn');
    const cartModal = document.getElementById('cart-modal');
    const closeCart = document.getElementById('close-cart');

    if (cartBtn && cartModal) {
        cartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cartModal.classList.remove('hidden');
            renderCart();
        });
    }

    if (closeCart) {
        closeCart.addEventListener('click', () => {
            cartModal.classList.add('hidden');
        });
    }

    // Suljetaan modal, jos klikataan sen ohi (taustaan)
    window.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.classList.add('hidden');
        }
    });

    // --- 3. TUOTTEIDEN LISÄÄMINEN (Event Delegation) ---
    const grid = document.querySelector('.product-grid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            if (e.target.classList.contains('bid-btn')) {
                const card = e.target.closest('.product-card');
                const name = card.querySelector('h3').innerText;
                const priceText = card.querySelector('.price').innerText;
                // Puhdistetaan hinta numeroksi (esim. "15.00 €" -> 15.0)
                const price = parseFloat(priceText.replace(/[^\d.]/g, ''));

                addToCart(name, price);
            }
        });
    }

    // Ladataan tuotteet palvelimelta (jos fetch käytössä)
    loadProducts();
});

// --- FUNKTIOT ---

function addToCart(name, price) {
    cart.push({ name, price, id: Date.now() }); // Käytetään aikaleimaa ID:nä poistamista varten
    updateCartUI();
    
    // Visuaalinen palaute pallolle
    const countSpan = document.getElementById('cart-count');
    if (countSpan) {
        countSpan.style.transform = "scale(1.5)";
        setTimeout(() => { countSpan.style.transform = "scale(1)"; }, 200);
    }
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
    renderCart(); // Päivitetään avoinna oleva lista
}

function updateCartUI() {
    const countSpan = document.getElementById('cart-count');
    if (countSpan) {
        countSpan.innerText = cart.length;
    }
}

function renderCart() {
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total');
    
    if (!list || !totalEl) return;

    list.innerHTML = "";
    let total = 0;

    if (cart.length === 0) {
        list.innerHTML = '<p class="empty-msg">Korisi on tyhjä.</p>';
        totalEl.innerText = "0.00 €";
        return;
    }

    cart.forEach(item => {
        total += item.price;
        list.innerHTML += `
            <div class="cart-item">
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">${item.price.toFixed(2)} €</span>
                </div>
                <button onclick="removeFromCart(${item.id})" class="remove-item-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    });

    totalEl.innerText = total.toFixed(2) + " €";
}

function loadProducts() {
    const grid = document.querySelector('.product-grid');
    if (!grid) return;

    // Huom: Tämä fetch on esimerkkisi mukainen. 
    // Varmista että backend-polkusi on oikea.
    fetch('/api/products/latest')
        .then(res => res.json())
        .then(products => {
            grid.innerHTML = "";
            products.forEach(p => {
                grid.innerHTML += `
                    <div class="product-card">
                        <div class="image-wrapper">
                            <img src="${p.image || '/images/no-image.png'}" alt="${p.name}">
                        </div>
                        <div class="card-content">
                            <h3>${p.name}</h3>
                            <div class="card-footer">
                                <span class="price">${Number(p.price).toFixed(2)} €</span>
                                <button class="bid-btn">Lisää koriin</button>
                            </div>
                        </div>
                    </div>`;
            });
        })
        .catch(err => {
            console.error("Tuotteiden haku epäonnistui:", err);
            // Jos API ei ole vielä pystyssä, voit testata tällä:
            // grid.innerHTML = "<p>Ladataan tuotteita...</p>";
        });
}