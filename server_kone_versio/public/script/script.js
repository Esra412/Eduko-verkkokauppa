/**
 * Näytä toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast-notification ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mainNav = document.getElementById('main-navigation');
    const categoryToggleBtn = document.getElementById('category-toggle-btn');
    const sidebar = document.querySelector('.sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const cartBtn = document.getElementById('cart-btn');
    const cartModal = document.getElementById('cart-modal');
    const closeCart = document.getElementById('close-cart');
    const checkoutBtn = document.getElementById('go-to-checkout');
    const grid = document.querySelector('.product-grid');
    const searchInput = document.querySelector('.search-box input');
    const searchBtn = document.querySelector('.search-box button');
    const pageTitle = document.querySelector('.hero-text h1') || document.querySelector('h1') || document.querySelector('h2');

    const getActiveLanguage = () => (
        typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'fi'
    );

    const setPageTitle = (text) => {
        if (pageTitle) {
            pageTitle.innerText = text;
        }
    };

    const openCartModal = () => {
        if (cartModal) {
            cartModal.classList.remove('hidden');
            updateCartUI();
            renderCart();
        }
    };

    const renderProductCards = (products) => {
        if (!grid) return;

        grid.innerHTML = '';
        if (!products || products.length === 0) {
            grid.innerHTML = `<p>${typeof t === 'function' ? t('no_products') : 'Ei tuotteita saatavilla.'}</p>`;
            return;
        }

        const addCartText = typeof t === 'function' ? t('add_to_cart') : 'Lis\u00E4\u00E4 ostoskoriin';
        products.forEach((product) => {
            grid.innerHTML += `
                <div class="product-card" data-product-id="${product.id}" data-stock="${product.stock || 0}" style="cursor: pointer;">
                    <div class="image-wrapper">
                        <img src="${getImageSrc(product.image)}" alt="${product.name}" onerror="this.onerror=null; this.src='/verkkokauppa/images/edukosmall.png';">
                    </div>
                    <div class="card-content">
                        <h3>${product.name}</h3>
                        <div class="card-footer">
                            <span class="price">${Number(product.price).toFixed(2)} €</span>
                            <button class="bid-btn" type="button" data-i18n="add_to_cart">${addCartText}</button>
                        </div>
                    </div>
                </div>`;
        });
    };

    const runSearch = () => {
        const term = searchInput?.value.trim() || '';
        const lang = getActiveLanguage();

        if (!grid) {
            const params = new URLSearchParams();
            if (term) params.set('q', term);
            params.set('lang', lang);
            window.location.href = `/verkkokauppa/${params.toString() ? `?${params.toString()}` : ''}`;
            return;
        }

        if (!term) {
            const params = new URLSearchParams(window.location.search);
            params.delete('q');
            window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`);
            loadProducts();
            return;
        }

        const searchTitle = typeof t === 'function' ? t('search_results_title') : 'Haun tulokset';
        setPageTitle(`${searchTitle}: "${term}"`);

        fetch(`/verkkokauppa/api/search?q=${encodeURIComponent(term)}&lang=${encodeURIComponent(lang)}`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((products) => {
                if (!products || products.length === 0) {
                    grid.innerHTML = `<p>${typeof t === 'function' ? t('search_no_results') : 'Hakusanalla ei löytynyt tuotteita'} "${term}".</p>`;
                    return;
                }

                renderProductCards(products);
                const params = new URLSearchParams(window.location.search);
                params.set('q', term);
                params.set('lang', lang);
                window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
            })
            .catch((err) => {
                console.error('Hakuvirhe:', err);
                grid.innerHTML = `<p style="color: red;">${typeof t === 'function' ? t('search_error') : 'Haku epäonnistui.'}</p>`;
            });
    };

    if (mobileMenuBtn && mainNav) {
        mobileMenuBtn.addEventListener('click', () => {
            const expanded = mainNav.classList.toggle('show');
            mobileMenuBtn.classList.toggle('open', expanded);
            mobileMenuBtn.setAttribute('aria-expanded', String(expanded));
        });
    }

    if (categoryToggleBtn && sidebar) {
        const toggleSidebar = (open) => {
            sidebar.classList.toggle('open', open);
            categoryToggleBtn.classList.toggle('open', open);
            categoryToggleBtn.setAttribute('aria-expanded', String(open));
            document.body.classList.toggle('sidebar-open', open);
        };

        categoryToggleBtn.addEventListener('click', () => {
            toggleSidebar(!sidebar.classList.contains('open'));
        });

        sidebar.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => toggleSidebar(false));
        });
    }

    if (sidebarOverlay && sidebar && categoryToggleBtn) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            categoryToggleBtn.classList.remove('open');
            categoryToggleBtn.setAttribute('aria-expanded', 'false');
            document.body.classList.remove('sidebar-open');
        });
    }

    if (cartBtn && cartModal) {
        cartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openCartModal();
        });
    } else if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            window.location.href = '/verkkokauppa/kori';
        });
    }

    if (closeCart) {
        closeCart.addEventListener('click', () => cartModal.classList.add('hidden'));
    }

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            sessionStorage.setItem('openCheckoutForm', '1');
            window.location.href = '/verkkokauppa/kori';
        });
    }

    const clearCartBtn = document.getElementById('clear-cart-btn');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
            if (confirm(typeof t === 'function' ? t('confirm_clear_cart') : 'Haluatko varmasti tyhjentää ostoskorin?')) {
                clearCart();
            }
        });
    }

    window.addEventListener('click', (e) => {
        if (e.target === cartModal) {
            cartModal.classList.add('hidden');
        }
    });

    if (grid) {
        grid.addEventListener('click', (e) => {
            const addButton = e.target.closest('.bid-btn');
            if (addButton) {
                e.preventDefault();
                e.stopPropagation();

                const card = addButton.closest('.product-card');
                if (!card) return;

                const productId = card.dataset.productId;
                const name = card.querySelector('h3')?.innerText || '';
                const priceText = card.querySelector('.price')?.innerText || '0';
                const price = parseFloat(priceText.replace(/[^\d.,]/g, '').replace(',', '.'));
                const image = card.querySelector('img')?.src || '/verkkokauppa/images/edukosmall.png';
                const stock = parseInt(card.dataset.stock, 10) || 0;

                addToCart(productId, name, price, image, stock, {
                    showToastNotification: false,
                    buttonElement: addButton
                });
                return;
            }

            const card = e.target.closest('.product-card');
            if (card?.dataset.productId) {
                window.location.href = `/verkkokauppa/tuote/${card.dataset.productId}`;
            }
        });
    }

    loadProducts();
    updateCartUI();

    if (searchBtn) searchBtn.addEventListener('click', runSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') runSearch();
        });
    }
});

function getImageSrc(image) {
    const fallback = '/verkkokauppa/images/edukosmall.png';
    if (!image) return fallback;

    let src = image.toString().trim();
    if (!src) return fallback;
    if (src.startsWith('data:image/')) return src;

    src = src.replace(/\\/g, '/');

    if (src.startsWith('/verkkokauppa/')) return src;
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    if (src.startsWith('/uploads/') || src.startsWith('/images/')) return '/verkkokauppa' + src;
    if (src.includes('/uploads/')) return '/verkkokauppa' + src.slice(src.indexOf('/uploads/'));
    if (src.includes('/images/')) return '/verkkokauppa' + src.slice(src.indexOf('/images/'));
    if (src.startsWith('uploads/') || src.startsWith('images/')) return '/verkkokauppa/' + src;
    return '/verkkokauppa/uploads/' + src;
}

function getCartItemCount() {
    const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
    return cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
}

function addToCart(productId, name, price, image, stock, options = {}) {
    const { showToastNotification = true, buttonElement = null } = options;
    const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
    const existingItem = cart.find((item) => item.id == productId);
    const currentQuantity = existingItem ? (existingItem.quantity || 1) : 0;

    if (currentQuantity >= stock) {
        showToast(`Tuote "${name}" on loppunut varastosta. Varastosaldo: ${stock} kpl`, 'error');
        return false;
    }

    if (existingItem) {
        existingItem.quantity = currentQuantity + 1;
    } else {
        cart.push({ id: productId, name, price, image, quantity: 1, stock });
    }

    localStorage.setItem('eduko_cart', JSON.stringify(cart));
    updateCartUI();
    renderCart();

    const cartModal = document.getElementById('cart-modal');
    if (cartModal) {
        cartModal.classList.remove('hidden');
    }

    document.dispatchEvent(new Event('cartUpdated'));

    // Pulssiefekti kori-ikonille
    const cartWrapper = document.querySelector('.cart-wrapper');
    if (cartWrapper) {
        cartWrapper.classList.add('pulse');
        setTimeout(() => {
            cartWrapper.classList.remove('pulse');
        }, 600);
    }

    if (buttonElement) {
        const originalText = buttonElement.innerText;
        buttonElement.innerText = 'Lisätty! ✓';
        buttonElement.disabled = true;
        buttonElement.style.background = '#28a745';

        setTimeout(() => {
            buttonElement.innerText = originalText;
            buttonElement.disabled = false;
            buttonElement.style.background = '';
        }, 1500);
    }

    if (showToastNotification) {
        showToast(`✓ ${name} lisätty koriin`, 'success');
    }

    return true;
}

async function updateQuantity(index, change) {
    // Clear any previous error for this item
    showQuantityError(index, '');

    const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
    const item = cart[index];
    if (!item) return;

    let maxStock = item.stock;
    if (!maxStock) {
        try {
            const response = await fetch(`/verkkokauppa/api/products/${item.id}`);
            const product = await response.json();
            maxStock = product.stock || 0;
            item.stock = maxStock;
        } catch (err) {
            console.error('Virhe tuotteen varastosaldon haussa:', err);
            const stockErrorText = typeof t === 'function' ? t('product_stock_fetch_error') : 'Virhe tuotteen tietojen haussa. Yritä uudelleen.';
            showQuantityError(index, stockErrorText);
            return;
        }
    }

    const newQuantity = (item.quantity || 1) + change;
    if (newQuantity <= 0) {
        cart.splice(index, 1);
        localStorage.setItem('eduko_cart', JSON.stringify(cart));
        renderCart();
        updateCartUI();
        return;
    }

    if (newQuantity > maxStock) {
        const maxStockText = typeof t === 'function' ? t('cart_max_stock_message').replace('{count}', maxStock) : `Maksimissaan ${maxStock} kpl saatavilla.`;
        showQuantityError(index, maxStockText);
        return;
    }

    item.quantity = newQuantity;
    cart[index] = item;
    localStorage.setItem('eduko_cart', JSON.stringify(cart));
    renderCart();
    updateCartUI();
    document.dispatchEvent(new Event('cartUpdated'));
}

function showQuantityError(index, message) {
    const errorElement = document.querySelector(`[data-error-index="${index}"]`);
    if (errorElement) {
        if (message) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else {
            errorElement.style.display = 'none';
            errorElement.textContent = '';
        }
    }
}

async function setQuantity(index, newQuantity) {
    // Clear any previous error for this item
    showQuantityError(index, '');

    const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
    const item = cart[index];
    if (!item) return;

    // Validate input
    if (isNaN(newQuantity) || newQuantity < 1) {
        const invalidQuantityText = typeof t === 'function' ? t('invalid_quantity') : 'Virheellinen määrä. Anna positiivinen kokonaisluku.';
        showQuantityError(index, invalidQuantityText);
        return;
    }

    let maxStock = item.stock;
    if (!maxStock) {
        try {
            const response = await fetch(`/verkkokauppa/api/products/${item.id}`);
            const product = await response.json();
            maxStock = product.stock || 0;
            item.stock = maxStock;
        } catch (err) {
            console.error('Virhe tuotteen varastosaldon haussa:', err);
            const stockErrorText = typeof t === 'function' ? t('product_stock_fetch_error') : 'Virhe tuotteen tietojen haussa. Yritä uudelleen.';
            showQuantityError(index, stockErrorText);
            return;
        }
    }

    if (newQuantity > maxStock) {
        const maxStockText = typeof t === 'function' ? t('cart_max_stock_message').replace('{count}', maxStock) : `Maksimissaan ${maxStock} kpl saatavilla.`;
        showQuantityError(index, maxStockText);
        return;
    }

    item.quantity = newQuantity;
    cart[index] = item;
    localStorage.setItem('eduko_cart', JSON.stringify(cart));
    renderCart();
    updateCartUI();
    document.dispatchEvent(new Event('cartUpdated'));
}

function removeFromCart(index) {
    const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
    cart.splice(index, 1);
    localStorage.setItem('eduko_cart', JSON.stringify(cart));
    updateCartUI();
    renderCart();
    document.dispatchEvent(new Event('cartUpdated'));
}

function clearCart() {
    localStorage.setItem('eduko_cart', JSON.stringify([]));
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

    const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
    list.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        list.innerHTML = `<p class="empty-msg">${typeof t === 'function' ? t('cart_empty_message') : 'Korisi on tyhjä.'}</p>`;
        totalEl.innerText = '0.00 €';
        const clearCartBtn = document.getElementById('clear-cart-btn');
        if (clearCartBtn) clearCartBtn.disabled = true;
        return;
    }

    const clearCartBtn = document.getElementById('clear-cart-btn');
    if (clearCartBtn) clearCartBtn.disabled = false;

    cart.forEach((item, index) => {
        const price = parseFloat(item.price);
        const quantity = item.quantity || 1;
        const itemTotal = price * quantity;
        total += itemTotal;

        list.innerHTML += `
            <div class="cart-item">
                <img src="${getImageSrc(item.image)}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 4px;">
                <div class="item-info">
                    <span class="item-name">${item.name}</span>
                    <span class="item-price">${price.toFixed(2)} €</span>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                        <button onclick="updateQuantity(${index}, -1)" style="background: #eee; border: none; width: 24px; height: 24px; border-radius: 3px; cursor: pointer; font-weight: bold;">-</button>
                        <input type="number" class="quantity-input" data-index="${index}" value="${quantity}" min="1" max="${item.stock || 999}" style="width: 50px; text-align: center; border: 1px solid #ddd; border-radius: 3px; padding: 2px;">
                        <button onclick="updateQuantity(${index}, 1)" style="background: #eee; border: none; width: 24px; height: 24px; border-radius: 3px; cursor: pointer; font-weight: bold;">+</button>
                    </div>
                    <div class="quantity-error" data-error-index="${index}" style="display: none; color: red; font-size: 0.85rem; margin-top: 4px;"></div>
                </div>
                <div style="text-align: right;">
                    <div style="font-weight: bold;">${itemTotal.toFixed(2)} €</div>
                    <button onclick="removeFromCart(${index})" class="remove-btn" style="background: #ff4444; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; margin-top: 5px; font-size: 0.85rem;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });

    totalEl.innerText = `${total.toFixed(2)} €`;

    // Add event listeners for quantity inputs
    document.querySelectorAll('.quantity-input').forEach((input) => {
        input.addEventListener('change', (e) => {
            e.preventDefault();
            const index = parseInt(input.dataset.index, 10);
            const newQuantity = parseInt(input.value, 10);
            setQuantity(index, newQuantity);
        });
        input.addEventListener('blur', (e) => {
            // Reset to current value if invalid
            const index = parseInt(input.dataset.index, 10);
            const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
            const item = cart[index];
            if (item) {
                input.value = item.quantity || 1;
            }
        });
    });
}

function loadProducts() {
    const grid = document.querySelector('.product-grid');
    if (!grid) return;

    const currentLang = typeof getCurrentLanguage === 'function' ? getCurrentLanguage() : 'fi';
    const pageTitle = document.querySelector('.hero-text h1') || document.querySelector('h1') || document.querySelector('h2');
    const params = new URLSearchParams(window.location.search);
    const searchTerm = (params.get('q') || '').trim();

    if (searchTerm) {
        if (pageTitle) {
            const label = typeof t === 'function' ? t('search_results_title') : 'Haun tulokset';
            pageTitle.innerText = `${label}: "${searchTerm}"`;
        }

        fetch(`/verkkokauppa/api/search?q=${encodeURIComponent(searchTerm)}&lang=${encodeURIComponent(currentLang)}`)
            .then((res) => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then((products) => {
                grid.innerHTML = '';
                if (!products || products.length === 0) {
                    grid.innerHTML = `<p>${typeof t === 'function' ? t('search_no_results') : 'Hakusanalla ei löytynyt tuotteita'} "${searchTerm}".</p>`;
                    return;
                }

                const addCartText = typeof t === 'function' ? t('add_to_cart') : 'Lis\u00E4\u00E4 ostoskoriin';
                products.forEach((product) => {
                    grid.innerHTML += `
                        <div class="product-card" data-product-id="${product.id}" data-stock="${product.stock || 0}" style="cursor: pointer;">
                            <div class="image-wrapper">
                                <img src="${getImageSrc(product.image)}" alt="${product.name}" onerror="this.onerror=null; this.src='/verkkokauppa/images/edukosmall.png';">
                            </div>
                            <div class="card-content">
                                <h3>${product.name}</h3>
                                <div class="card-footer">
                                    <span class="price">${Number(product.price).toFixed(2)} €</span>
                                    <button class="bid-btn" type="button" data-i18n="add_to_cart">${addCartText}</button>
                                </div>
                            </div>
                        </div>`;
                });
            })
            .catch((err) => {
                console.error('Haku epäonnistui:', err);
                grid.innerHTML = `<p style="color: red;">${typeof t === 'function' ? t('search_error') : 'Haku epäonnistui.'}</p>`;
            });
        return;
    }

    if (pageTitle) {
        pageTitle.innerText = typeof t === 'function' ? t('latest_items') : 'Tuoreimmat kohteet';
    }

    fetch(`/verkkokauppa/api/products/latest?lang=${encodeURIComponent(currentLang)}`)
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then((products) => {
            grid.innerHTML = '';
            if (!products || products.length === 0) {
                grid.innerHTML = `<p>${typeof t === 'function' ? t('no_products') : 'Ei tuotteita saatavilla.'}</p>`;
                return;
            }

            const addCartText = typeof t === 'function' ? t('add_to_cart') : 'Lis\u00E4\u00E4 ostoskoriin';
            products.forEach((product) => {
                grid.innerHTML += `
                    <div class="product-card" data-product-id="${product.id}" data-stock="${product.stock || 0}" style="cursor: pointer;">
                        <div class="image-wrapper">
                            <img src="${getImageSrc(product.image)}" alt="${product.name}" onerror="this.onerror=null; this.src='/verkkokauppa/images/edukosmall.png';">
                        </div>
                        <div class="card-content">
                            <h3>${product.name}</h3>
                            <div class="card-footer">
                                <span class="price">${Number(product.price).toFixed(2)} €</span>
                                <button class="bid-btn" type="button" data-i18n="add_to_cart">${addCartText}</button>
                            </div>
                        </div>
                    </div>`;
            });
        })
        .catch((err) => {
            console.error('Tuotteiden haku epäonnistui:', err);
            grid.innerHTML = `<p style="color: red;">${typeof t === 'function' ? t('load_error') : 'Tuotteiden lataus epäonnistui.'}</p>`;
        });
}

document.addEventListener('cartUpdated', () => {
    updateCartUI();
});

document.addEventListener('languageChanged', () => {
    loadProducts();
});
