/**
 * Näytä toast notification
 */
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast-notification');
    if (!toast) return;

    toast.textContent = message;
    window.announceToScreenReader?.(message);
    toast.className = `toast-notification ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('product-grid');
    const categoryTitle = document.querySelector('.section-title');
    const searchInput = document.querySelector('.search-box input');
    const searchBtn = document.querySelector('.search-box button');

    // --- 1. Ostoskorin tilan paivitys (Ylapalkin numero) ---
    const updateCartBadge = () => {
        const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
        const cartCountElements = document.querySelectorAll('.cart-count, #cart-count');

        cartCountElements.forEach((cartCountElement) => {
            cartCountElement.innerText = totalItems;
        });
    };

    updateCartBadge();
    document.addEventListener('cartUpdated', updateCartBadge);
    window.addEventListener('storage', updateCartBadge);
    window.addEventListener('pageshow', updateCartBadge);

    const sidebar = document.querySelector('.sidebar');
    const categoryToggleBtn = document.getElementById('category-toggle-btn');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (categoryToggleBtn && sidebar) {
        const toggleSidebar = (open) => {
            sidebar.classList.toggle('open', open);
            categoryToggleBtn.classList.toggle('open', open);
            categoryToggleBtn.setAttribute('aria-expanded', String(open));
            document.body.classList.toggle('sidebar-open', open);
        };

        categoryToggleBtn.addEventListener('click', () => {
            const isOpen = !sidebar.classList.contains('open');
            toggleSidebar(isOpen);
        });

        sidebar.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                toggleSidebar(false);
            });
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

    // --- 1.5. Mobile navigation toggle ---
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mainNav = document.getElementById('main-navigation');
    if (mobileMenuBtn && mainNav) {
        mobileMenuBtn.addEventListener('click', () => {
            const expanded = mainNav.classList.toggle('show');
            mobileMenuBtn.classList.toggle('open', expanded);
            mobileMenuBtn.setAttribute('aria-expanded', String(expanded));
        });
    }

    // --- 2. Kategorian tunnistus osoitepalkista ---
    const pathParts = window.location.pathname.split('/').filter(part => part !== '');
    const categoryId = pathParts[pathParts.length - 1];

    const kategoriat = {
        '1': 'cat_auto',
        '2': 'cat_beauty',
        '3': 'cat_metal',
        '4': 'cat_logistics',
        '5': 'cat_lab',
        '6': 'cat_security',
        '7': 'cat_construction',
        '8': 'cat_restaurant',
        '9': 'cat_electric',
        '10': 'cat_health',
        '11': 'cat_ict'
    };

    if (kategoriat[categoryId] && categoryTitle) {
        categoryTitle.innerText = typeof t === 'function' ? t(kategoriat[categoryId]) : kategoriat[categoryId];
    }

    // --- 3. Tuotteiden piirtaminen sivulle ---
    function resolveImageSrc(image) {
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
    }

    function renderProducts(products) {
        grid.innerHTML = '';
        if (products.length === 0) {
            grid.innerHTML = '<p>Kategoriassa ei ole viela tuotteita.</p>';
            return;
        }

const visibleProducts = products.filter((product) => (Number(product.stock) || 0) > 0);
    if (visibleProducts.length === 0) {
        grid.innerHTML = '<p>Kategoriassa ei ole viela tuotteita.</p>';
        return;
    }

    const addCartText = typeof t === 'function' ? t('add_to_cart') : 'Lis\u00E4\u00E4 koriin';
    const stockText = typeof t === 'function' ? t('stock_label') : 'Varasto';
    visibleProducts.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = product.id;
        const stock = product.stock || 0;
        card.dataset.stock = stock;
        card.style.cursor = 'pointer';

        card.innerHTML = `
            <div class="image-wrapper">
                <img src="${resolveImageSrc(product.image)}" alt="${product.image_alt || product.name}" onerror="this.onerror=null; this.src='/verkkokauppa/images/edukosmall.png';">
            </div>
            <div class="card-content">
                <h3>${product.name}</h3>
                <div class="card-footer">
                    <span class="price">${Number(product.price).toFixed(2)} €</span>
                    <button class="bid-btn"
                        data-id="${product.id}"
                        data-name="${product.name}"
                        data-price="${product.price}"
                        data-image="${resolveImageSrc(product.image)}"
                        data-i18n="add_to_cart"
                        type="button">
                        ${addCartText}
                    </button>
                </div>
                <p style="color: #666; font-size: 0.75rem; margin: 4px 0 0 0;">${stockText}: ${stock} kpl</p>
                </div>
            `;

            grid.appendChild(card);
        });

        activateProductCards();
        activateCartButtons();
    }

    function activateProductCards() {
        document.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.bid-btn')) return;
                if (!card.dataset.productId) return;
                window.location.href = `/verkkokauppa/tuote/${card.dataset.productId}`;
            });
        });
    }

    // --- 4. Ostoskorimekaniikka ---
    function activateCartButtons() {
        document.querySelectorAll('.bid-btn').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                const productId = button.dataset.id;
                const name = button.dataset.name;
                const price = button.dataset.price;
                const image = button.dataset.image;

                let stock = 1;
                try {
                    const response = await fetch(`/verkkokauppa/api/products/${productId}`);
                    const productData = await response.json();
                    stock = productData.stock || 0;
                } catch (err) {
                    console.error('Virhe varastosaldon haussa:', err);
                }

                if (typeof addToCart === 'function') {
                    addToCart(productId, name, price, image, stock, { showToastNotification: false });
                } else {
                    let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
                    const existingItem = cart.find(item => item.id == productId);
                    const currentQuantity = existingItem ? (existingItem.quantity || 1) : 0;

                    if (currentQuantity >= stock) {
                        showToast(`Tuote "${name}" on loppunut varastosta. Varastosaldo: ${stock} kpl`, 'error');
                        return;
                    }

                    if (existingItem) {
                        existingItem.quantity = currentQuantity + 1;
                    } else {
                        cart.push({ id: productId, name, price, image, quantity: 1, stock: stock });
                    }

                    localStorage.setItem('eduko_cart', JSON.stringify(cart));
                    updateCartBadge();
                    document.dispatchEvent(new Event('cartUpdated'));

                    const countSpan = document.querySelector('.cart-count, #cart-count');
                    if (countSpan) {
                        countSpan.style.transform = 'scale(1.5)';
                        setTimeout(() => { countSpan.style.transform = 'scale(1)'; }, 200);
                    }
                }

                const originalText = button.innerText;
                button.innerText = 'Lisätty! ✓';
                button.style.background = '#28a745';
                button.disabled = true;

                setTimeout(() => {
                    button.innerText = originalText;
                    button.style.background = '';
                    button.disabled = false;
                }, 1500);
            });
        });
    }

    function loadCategoryProducts() {
        const currentLang = getCurrentLanguage();
        fetch(`/verkkokauppa/api/products?category=${categoryId}&lang=${currentLang}`)
            .then(res => res.json())
            .then(products => {
                console.log('Kategoriasta haetut tuotteet:', products);
                renderProducts(products);
            })
            .catch(err => {
                console.error('Virhe:', err);
                grid.innerHTML = '<p>Tuotteiden haku epaonnistui.</p>';
            });
    }

    loadCategoryProducts();

    // --- 6. Hakutoiminto ---
    const suoritaHaku = () => {
        const term = searchInput.value.trim();
        const currentLang = getCurrentLanguage();
        if (term.length > 0) {
            const label = typeof t === 'function' ? t('search_results_title') : 'Haun tulokset';
            categoryTitle.innerText = `${label}: "${term}"`;
            fetch(`/verkkokauppa/api/search?q=${encodeURIComponent(term)}&lang=${encodeURIComponent(currentLang)}`)
                .then(res => res.json())
                .then(products => renderProducts(products))
                .catch(err => console.error('Hakuvirhe:', err));
        } else {
            loadCategoryProducts();
        }
    };

    if (searchBtn) searchBtn.addEventListener('click', suoritaHaku);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') suoritaHaku();
        });
    }

    document.addEventListener('languageChanged', () => {
        console.log('Kieli muuttui kategorian sivulla - ladataan tuotteet uudelleen');
        if (kategoriat[categoryId] && categoryTitle) {
            categoryTitle.innerText = typeof t === 'function' ? t(kategoriat[categoryId]) : kategoriat[categoryId];
        }
        loadCategoryProducts();
    });
});
