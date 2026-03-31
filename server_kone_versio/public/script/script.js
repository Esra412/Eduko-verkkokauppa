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
    const checkoutBtn = document.getElementById('go-to-checkout');

    if (cartBtn && cartModal) {
        cartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            cartModal.classList.remove('hidden');
            updateCartUI();
            renderCart();
        });
    }

    if (closeCart) {
        closeCart.addEventListener('click', () => {
            cartModal.classList.add('hidden');
        });
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            sessionStorage.setItem('openCheckoutForm', '1');
            window.location.href = '/verkkokauppa/kori';
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
                const productId = card.dataset.productId;
                const name = card.querySelector('h3').innerText;
                const priceText = card.querySelector('.price').innerText;
                const price = parseFloat(priceText.replace(/[^\d.]/g, ''));
                const image = card.querySelector('img')?.src || '/images/edukosmall.png';

                addToCart(productId, name, price, image);
            }
        });
    }

    // Ladataan tuotteet palvelimelta
    loadProducts();
    // Päivitä korilasku heti latauksen jälkeen
    updateCartUI();

    // --- 4. HAKUTOIMINTO ETUSIVULLA ---
    const searchInput = document.querySelector('.search-box input');
    const searchBtn = document.querySelector('.search-box button');
    const pageTitle = document.querySelector('h1') || document.querySelector('h2');

    const suoritaHaku = () => {
        const term = searchInput.value.trim();
        if (term.length > 0) {
            if (pageTitle) pageTitle.innerText = `Haun tulokset: "${term}"`;
            
            fetch(`/verkkokauppa/api/search?q=${encodeURIComponent(term)}`)
                .then(res => res.json())
                .then(products => {
                    const grid = document.querySelector('.product-grid');
                    if (!grid) return;
                    
                    grid.innerHTML = "";
                    if (products.length === 0) {
                        grid.innerHTML = `<p>Hakusanalla "${term}" ei löytynyt tuotteita.</p>`;
                        return;
                    }

                    products.forEach(p => {
                        grid.innerHTML += `
                            <div class="product-card" data-product-id="${p.id}" onclick="window.location.href='/verkkokauppa/tuote/${p.id}'" style="cursor: pointer;">
                                <div class="image-wrapper">
                                    <img src="${getImageSrc(p.image)}" alt="${p.name}">
                                </div>
                                <div class="card-content">
                                    <h3>${p.name}</h3>
                                    <div class="card-footer">
                                        <span class="price">${Number(p.price).toFixed(2)} €</span>
                                        <button class="bid-btn" onclick="event.stopPropagation();">Lisää koriin</button>
                                    </div>
                                </div>
                            </div>`;
                    });
                })
                .catch(err => {
                    console.error("Hakuvirhe:", err);
                    const grid = document.querySelector('.product-grid');
                    if (grid) grid.innerHTML = '<p style="color: red;">Haku epäonnistui.</p>';
                });
        }
    };

    if (searchBtn) searchBtn.addEventListener('click', suoritaHaku);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') suoritaHaku();
        });
    }
});

// --- FUNKTIOT ---

function getImageSrc(image) {
    const fallback = '/images/edukosmall.png';
    if (!image) return fallback;

    let src = image.toString().trim();
    if (src.startsWith('/verkkokauppa/')) return src;
    if (src.startsWith('data:image/')) return src;
    if (src.startsWith('/uploads/') || src.startsWith('/images/') || src.startsWith('http://') || src.startsWith('https://')) {
        return src;
    }
    if (!src.startsWith('/')) {
        src = '/uploads/' + src;
    }
    return src;
}

function getCartItemCount() {
    const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
    return cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
}

function addToCart(productId, name, price, image) {
    let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
    
    // Tarkista, onko tuote jo korissa
    const existingItem = cart.find(item => item.id == productId);
    if (existingItem) {
        existingItem.quantity = (existingItem.quantity || 1) + 1;
    } else {
        cart.push({ id: productId, name, price, image, quantity: 1 });
    }
    
    localStorage.setItem('eduko_cart', JSON.stringify(cart));
    updateCartUI();
    renderCart();
    document.dispatchEvent(new Event('cartUpdated'));
    
    // Visuaalinen palaute
    const countSpan = document.getElementById('cart-count');
    if (countSpan) {
        countSpan.style.transform = "scale(1.5)";
        setTimeout(() => { countSpan.style.transform = "scale(1)"; }, 200);
    }
}

function updateQuantity(index, change) {
    let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
    const item = cart[index];

    if (!item) return;

    item.quantity = (item.quantity || 1) + change;

    // Jos määrä menee 0 tai alle, poista tuote
    if (item.quantity <= 0) {
        cart.splice(index, 1);
        localStorage.setItem('eduko_cart', JSON.stringify(cart));
        renderCart();
        updateCartUI();
        return;
    }

    localStorage.setItem('eduko_cart', JSON.stringify(cart));
    renderCart();
    updateCartUI();
    document.dispatchEvent(new Event('cartUpdated'));
}

function removeFromCart(index) {
    let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('eduko_cart', JSON.stringify(cart));
    updateCartUI();
    renderCart();
    document.dispatchEvent(new Event('cartUpdated'));
}

function updateCartUI() {
    const countSpan = document.getElementById('cart-count');
    if (countSpan) {
        countSpan.innerText = getCartItemCount();
    }
}

function renderCart() {
    const list = document.getElementById('cart-items-list');
    const totalEl = document.getElementById('cart-total');
    
    if (!list || !totalEl) return;

    let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
    list.innerHTML = "";
    let total = 0;

    if (cart.length === 0) {
        list.innerHTML = '<p class="empty-msg">Korisi on tyhjä.</p>';
        totalEl.innerText = "0.00 €";
        return;
    }

    cart.forEach((item, index) => {
        const price = parseFloat(item.price);
        const quantity = item.quantity || 1;
        const itemTotal = price * quantity;
        total += itemTotal;

        list.innerHTML += `
            <div class="cart-item">
                <img src="${item.image || '/images/edukosmall.png'}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">${price.toFixed(2)} €</span>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                        <button onclick="updateQuantity(${index}, -1)" style="background: #eee; border: none; width: 24px; height: 24px; border-radius: 3px; cursor: pointer; font-weight: bold;">−</button>
                        <span style="min-width: 24px; text-align: center; font-weight: bold;">${quantity}</span>
                        <button onclick="updateQuantity(${index}, 1)" style="background: #eee; border: none; width: 24px; height: 24px; border-radius: 3px; cursor: pointer; font-weight: bold;">+</button>
                    </div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: bold;">${itemTotal.toFixed(2)} €</div>
                    <button onclick="removeFromCart(${index})" class="remove-item-btn" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 5px; font-size: 0.85rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    totalEl.innerText = total.toFixed(2) + " €";
}

function loadProducts() {
    const grid = document.querySelector('.product-grid');
    if (!grid) return;

    console.log('Ladataan tuotteita osoitteesta: /verkkokauppa/api/products/latest');
    
    fetch('/verkkokauppa/api/products/latest')
        .then(res => {
            console.log('API vastaus status:', res.status);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then(products => {
            console.log('Tuotteet ladattu:', products);
            grid.innerHTML = "";
            if (!products || products.length === 0) {
                grid.innerHTML = '<p>Ei tuotteita saatavilla.</p>';
                return;
            }
            products.forEach(p => {
                const imageSrc = getImageSrc(p.image);
                console.log(`Product: ${p.name}, Image: ${p.image}, ImageSrc: ${imageSrc}`);
                grid.innerHTML += `
        <div class="product-card" data-product-id="${p.id}" onclick="window.location.href='/verkkokauppa/tuote/${p.id}'" style="cursor: pointer;">
            <div class="image-wrapper">
                <img src="${getImageSrc(p.image)}" alt="${p.name}" onerror="this.onerror=null; this.src='/images/edukosmall.png';">
            </div>
            <div class="card-content">
                <h3>${p.name}</h3>
                <div class="card-footer">
                    <span class="price">${Number(p.price).toFixed(2)} €</span>
                    <button class="bid-btn" onclick="event.stopPropagation();">Lisää koriin</button>
                </div>
            </div>
        </div>`;
        });
        })
        .catch(err => {
            console.error("❌ Tuotteiden haku epäonnistui:", err);
            grid.innerHTML = '<p style="color: red;">Tuotteiden lataus epäonnistui. Ks. konsoli (F12).</p>';
        });
}

// Kuuntele ostoskori päivityksistä
document.addEventListener('cartUpdated', () => {
    updateCartUI();
});