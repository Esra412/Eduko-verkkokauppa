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
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mainNav = document.getElementById('main-navigation');
    const navLinks = document.querySelectorAll('.main-nav .nav-links a');
    const searchInput = document.querySelector('.search-box input');
    const searchBtn = document.querySelector('.search-box button');
    const cartBtn = document.getElementById('cart-btn');

    if (mobileMenuBtn && mainNav) {
        mobileMenuBtn.addEventListener('click', () => {
            const expanded = mainNav.classList.toggle('show');
            mobileMenuBtn.classList.toggle('open', expanded);
            mobileMenuBtn.setAttribute('aria-expanded', String(expanded));
        });
    }

    navLinks.forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            if (mainNav) mainNav.classList.remove('show');
            if (mobileMenuBtn) {
                mobileMenuBtn.classList.remove('open');
                mobileMenuBtn.setAttribute('aria-expanded', 'false');
            }
            // Varmistetaan, että tuotesivun navigaatiolinkit toimivat varmasti
            // myos mobiilivalikon kautta.
            const targetRoute = link.dataset.navRoute || link.getAttribute('href');
            if (targetRoute) {
                window.location.href = targetRoute;
            }
        });
    });

    const goToSearch = () => {
        const term = searchInput?.value.trim() || '';
        const lang = (typeof getCurrentLanguage === 'function') ? getCurrentLanguage() : 'fi';
        const params = new URLSearchParams();
        if (term) params.set('q', term);
        params.set('lang', lang);
        window.location.href = `/verkkokauppa/${params.toString() ? `?${params.toString()}` : ''}`;
    };

    if (searchBtn) searchBtn.addEventListener('click', goToSearch);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                goToSearch();
            }
        });
    }

    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            window.location.href = '/verkkokauppa/kori';
        });
    }

    const vastuuhenkilot = {
        '1': { nimi: 'Matti Meikalainen', email: 'matti.ajoneuvo@eduko.fi', puh: '040 123 4567' },
        '2': { nimi: 'Sanni Suortuva', email: 'sanni.hius@eduko.fi', puh: '040 234 5678' },
        '3': { nimi: 'Esra Bagdat', email: 'esra07bagdat@gmail.com', puh: '040 345 6789' },
        '4': { nimi: 'Lauri Lastaus', email: 'lauri.logistiikka@eduko.fi', puh: '040 456 7890' },
        '5': { nimi: 'Paula Putki', email: 'paula.prosessi@eduko.fi', puh: '040 567 8901' },
        '6': { nimi: 'Teemu Turva', email: 'teemu.turva@eduko.fi', puh: '040 678 9012' },
        '7': { nimi: 'Risto Rakentaja', email: 'risto.raksa@eduko.fi', puh: '040 789 0123' },
        '8': { nimi: 'Keijo Kokki', email: 'keijo.kokki@eduko.fi', puh: '040 890 1234' },
        '9': { nimi: 'Seppo Sahko', email: 'seppo.sahko@eduko.fi', puh: '040 901 2345' },
        '10': { nimi: 'Sari Sote', email: 'sari.sote@eduko.fi', puh: '040 012 3456' },
        '11': { nimi: 'Iiro It', email: 'iiro.it@eduko.fi', puh: '040 111 2222' }
    };

    const oletusHenkilo = {
        nimi: 'Eduko Asiakaspalvelu',
        email: 'info@eduko.fi',
        puh: '020 61511'
    };

    const productId = window.location.pathname.split('/').pop();
    if (!productId || isNaN(productId)) return;

    let currentProductData = null;

    function resolveImageUrl(image) {
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

    function setupGallery(product) {
        const thumbContainer = document.getElementById('thumbnail-container');
        const mainImg = document.getElementById('display-img');
        if (!thumbContainer || !mainImg) return;

        thumbContainer.innerHTML = '';
        document.querySelector('.thumbnail-limit-note')?.remove();

        let allImages = [];
        if (product.image) {
            allImages.push(resolveImageUrl(product.image));
        }

        if (product.images) {
            try {
                const extraImages = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                if (Array.isArray(extraImages)) {
                    allImages = allImages.concat(extraImages.map((img) => resolveImageUrl(img)));
                }
            } catch (error) {
                console.error('Kuvien parsinta epäonnistui', error);
            }
        }

        const uniqueImages = [...new Set(allImages.filter(Boolean))];
        const limitedImages = uniqueImages.slice(0, 8);

        mainImg.onerror = () => {
            mainImg.onerror = null;
            mainImg.src = '/verkkokauppa/images/edukosmall.png';
        };
        mainImg.alt = product.image_alt || product.name || 'Tuotteen kuva';
        mainImg.src = limitedImages[0] || '/verkkokauppa/images/edukosmall.png';

        limitedImages.forEach((imgUrl, index) => {
            const thumb = document.createElement('img');
            thumb.src = imgUrl;
            thumb.alt = product.image_alt || product.name || '';
            thumb.className = index === 0 ? 'thumbnail active' : 'thumbnail';
            thumb.onerror = () => {
                thumb.onerror = null;
                thumb.src = '/verkkokauppa/images/edukosmall.png';
            };
            thumb.addEventListener('click', () => {
                mainImg.src = imgUrl;
                thumbContainer.querySelectorAll('.thumbnail').forEach((img) => img.classList.remove('active'));
                thumb.classList.add('active');
            });
            thumbContainer.appendChild(thumb);
        });

        if (uniqueImages.length > limitedImages.length) {
            const note = document.createElement('p');
            note.className = 'thumbnail-limit-note';
            note.innerText = `Naytetaan enintaan ${limitedImages.length} kuvaa kerralla.`;
            thumbContainer.parentElement?.appendChild(note);
        }
    }

    function loadAndDisplayProduct() {
        const currentLang = (typeof getCurrentLanguage === 'function') ? getCurrentLanguage() : 'fi';

        fetch(`/verkkokauppa/api/products/${productId}?lang=${currentLang}`)
            .then((res) => {
                if (!res.ok) throw new Error('Tuotetta ei löytynyt');
                return res.json();
            })
            .then((product) => {
                currentProductData = product;
                const remainingStock = getRemainingStock(product);
                if (remainingStock <= 0) {
                    window.location.replace('/verkkokauppa/');
                    return;
                }

                document.getElementById('product-name').innerText = product.name;
                document.getElementById('product-price').innerText = `${Number(product.price).toFixed(2)} €`;
                document.getElementById('product-desc').innerText =
                    product.description || (typeof t === 'function' ? t('no_description') : 'Ei kuvausta.');

                setupGallery(product);

                const metaDiv = document.getElementById('product-meta');
                if (metaDiv) {
                    const stockLabel = typeof t === 'function' ? t('stock_label') : 'Varastossa';
                    const pickupLabel = typeof t === 'function' ? t('pickup_point_label') : 'Noutopiste';
                    metaDiv.innerHTML = `
                        <p><strong>${stockLabel}:</strong> ${remainingStock} kpl</p>
                        <p><strong>${pickupLabel}:</strong> ${product.pickup_point || 'Päärakennus'}</p>
                    `;
                }

                const catId = String(product.category_id);
                const henkilo = vastuuhenkilot[catId] || oletusHenkilo;

                document.getElementById('contact-name').innerText = henkilo.nimi;
                document.getElementById('contact-email').innerText = henkilo.email;
                document.getElementById('contact-phone').innerText = henkilo.puh;
                document.getElementById('email-link').href = `mailto:${henkilo.email}`;
                document.getElementById('phone-link').href = `tel:${henkilo.puh}`;

                const specsList = document.getElementById('product-specs');
                if (specsList) {
                    specsList.innerHTML = '';

                    if (product.specs) {
                        product.specs.split(/\r?\n|,/).forEach((item) => {
                            if (!item.trim()) return;
                            const li = document.createElement('li');
                            li.innerText = item.trim();
                            specsList.appendChild(li);
                        });
                    } else {
                        specsList.innerHTML = `<li>${typeof t === 'function' ? t('no_specs') : 'Ei teknisiä tietoja saatavilla'}</li>`;
                    }
                }
            })
            .catch((err) => {
                console.error(err);
                const main = document.querySelector('.product-main');
                if (main) {
                    main.innerHTML = '<h2>Tuotetta ei löytynyt.</h2>';
                }
            });
    }

    function updateCartBadge() {
        const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
        document.querySelectorAll('.cart-count, #cart-count').forEach((badge) => {
            badge.innerText = totalItems;
        });
    }

    function getCartItemQuantity(productId) {
        const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        const existingItem = cart.find((item) => item.id == productId);
        return existingItem ? Number(existingItem.quantity || 0) : 0;
    }

    function getRemainingStock(product) {
        return Math.max(0, Number(product.stock) || 0);
    }

    function updateProductStockDisplay() {
        if (!currentProductData) return;
        const remainingStock = getRemainingStock(currentProductData);
        if (remainingStock <= 0) {
            window.location.replace('/verkkokauppa/');
            return;
        }

        const metaDiv = document.getElementById('product-meta');
        if (!metaDiv) return;

        const stockLabel = typeof t === 'function' ? t('stock_label') : 'Varastossa';
        const pickupLabel = typeof t === 'function' ? t('pickup_point_label') : 'Noutopiste';

        metaDiv.innerHTML = `
            <p><strong>${stockLabel}:</strong> ${remainingStock} kpl</p>
            <p><strong>${pickupLabel}:</strong> ${currentProductData.pickup_point || 'Päärakennus'}</p>
        `;

        const buyButtons = [document.querySelector('.buy-now-btn'), document.querySelector('.mobile-buy-btn')];
        buyButtons.forEach((button) => {
            if (!button) return;
            button.disabled = false;
            button.style.opacity = '';
            button.style.cursor = '';
        });
    }

    updateCartBadge();
    document.addEventListener('cartUpdated', () => {
        updateCartBadge();
        updateProductStockDisplay();
    });
    window.addEventListener('storage', () => {
        updateCartBadge();
        updateProductStockDisplay();
    });
    window.addEventListener('pageshow', () => {
        updateCartBadge();
        updateProductStockDisplay();
        // Lataa tuotteen tiedot uudelleen kun sivu tulee näkyviin (varastosaldo voi muuttua)
        loadAndDisplayProduct();
    });

    const buyBtn = document.querySelector('.buy-now-btn');
    if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
            if (!currentProductData) return;

            // Hae tuotteen nykyiset tiedot palvelimelta varmistaaksesi varastosaldon
            try {
                const response = await fetch(`/verkkokauppa/api/products/${currentProductData.id}`);
                if (response.ok) {
                    const freshProduct = await response.json();
                    currentProductData.stock = freshProduct.stock || 0;
                }
            } catch (err) {
                console.error('Virhe tuotteen tietojen haussa:', err);
            }

            const maxStock = currentProductData.stock || 1;
            const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
            const existingItem = cart.find((item) => item.id == currentProductData.id);

            if (existingItem) {
                if (existingItem.quantity < maxStock) {
                    existingItem.quantity += 1;
                    showToast(typeof t === 'function' ? t('cart_updated').replace('{count}', existingItem.quantity) : `Määrä päivitetty: ${existingItem.quantity} kpl`, 'success');
                } else {
                    showToast(typeof t === 'function' ? t('cart_max_limit').replace('{count}', maxStock) : `Maksimimäärä (${maxStock} kpl) saavutettu!`, 'error');
                    return;
                }
            } else {
                if (maxStock <= 0) {
                    showToast(typeof t === 'function' ? t('product_unavailable') : 'Tuote ei ole saatavilla!', 'error');
                    return;
                }
                
                cart.push({
                    id: currentProductData.id,
                    name: currentProductData.name,
                    price: currentProductData.price,
                    image: resolveImageUrl(currentProductData.image),
                    stock: maxStock,
                    quantity: 1
                });
                showToast(typeof t === 'function' ? t('cart_added') : 'Tuote lisätty koriin!', 'success');
            }

            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            updateCartBadge();
            updateProductStockDisplay();
            document.dispatchEvent(new Event('cartUpdated'));
            
            // Lataa tuotteen tiedot palvelimelta päivittääkseen varastosaldoa
            setTimeout(() => loadAndDisplayProduct(), 300);

            buyBtn.innerText = typeof t === 'function' ? t('added_btn') : 'Lis\u00E4tty!';
            buyBtn.style.background = '#28a745';

            setTimeout(() => {
                buyBtn.innerText = typeof t === 'function' ? t('buy_btn') : 'OSTA';
                buyBtn.style.background = '';
            }, 2000);
        });
    }

    const mobileBuyBtn = document.querySelector('.mobile-buy-btn');
    const mobilePrice = document.querySelector('.mobile-price');
    const observer = new MutationObserver(() => {
        if (currentProductData && mobilePrice) {
            mobilePrice.innerText = `${Number(currentProductData.price).toFixed(2)} €`;
        }
    });

    const productPriceElem = document.getElementById('product-price');
    if (productPriceElem) {
        observer.observe(productPriceElem, { childList: true, subtree: true, characterData: true });
    }

    if (mobileBuyBtn) {
        mobileBuyBtn.addEventListener('click', async () => {
            if (!currentProductData) return;

            // Hae tuotteen nykyiset tiedot palvelimelta varmistaaksesi varastosaldon
            try {
                const response = await fetch(`/verkkokauppa/api/products/${currentProductData.id}`);
                if (response.ok) {
                    const freshProduct = await response.json();
                    currentProductData.stock = freshProduct.stock || 0;
                }
            } catch (err) {
                console.error('Virhe tuotteen tietojen haussa:', err);
            }

            const maxStock = currentProductData.stock || 1;
            const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
            const existingItem = cart.find((item) => item.id == currentProductData.id);

            if (existingItem) {
                if (existingItem.quantity < maxStock) {
                    existingItem.quantity += 1;
                    showToast(typeof t === 'function' ? t('cart_updated').replace('{count}', existingItem.quantity) : `Määrä päivitetty: ${existingItem.quantity} kpl`, 'success');
                } else {
                    showToast(typeof t === 'function' ? t('cart_max_limit').replace('{count}', maxStock) : `Maksimimäärä (${maxStock} kpl) saavutettu!`, 'error');
                    return;
                }
            } else {
                if (maxStock <= 0) {
                    showToast(typeof t === 'function' ? t('product_unavailable') : 'Tuote ei ole saatavilla!', 'error');
                    return;
                }

                cart.push({
                    id: currentProductData.id,
                    name: currentProductData.name,
                    price: currentProductData.price,
                    image: resolveImageUrl(currentProductData.image),
                    stock: maxStock,
                    quantity: 1
                });
                showToast(typeof t === 'function' ? t('cart_added') : 'Tuote lisätty koriin!', 'success');
            }

            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            updateCartBadge();
            updateProductStockDisplay();
            document.dispatchEvent(new Event('cartUpdated'));
            
            // Lataa tuotteen tiedot palvelimelta päivittääkseen varastosaldoa
            setTimeout(() => loadAndDisplayProduct(), 300);

            mobileBuyBtn.innerText = typeof t === 'function' ? t('added_btn') : 'Lis\u00E4tty!';
            mobileBuyBtn.style.background = '#28a745';

            setTimeout(() => {
                mobileBuyBtn.innerText = typeof t === 'function' ? t('add_to_cart') : 'Lis\u00E4\u00E4 koriin';
                mobileBuyBtn.style.background = '';
            }, 2000);
        });
    }

    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            document.querySelectorAll('.tab-pane').forEach((pane) => pane.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach((button) => button.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(target)?.classList.add('active');
        });
    });

    document.addEventListener('languageChanged', () => {
        loadAndDisplayProduct();
    });

    // Lataa tuotteen tiedot säännöllisesti (30 sekunnin välein) varastosaldon päivittämiseksi
    const productRefreshInterval = setInterval(() => {
        loadAndDisplayProduct();
    }, 30000);

    loadAndDisplayProduct();
});
