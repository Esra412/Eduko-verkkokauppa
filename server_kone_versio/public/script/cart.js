document.addEventListener('DOMContentLoaded', () => {
    const cartList = document.getElementById('cart-list');
    const totalElem = document.getElementById('cart-total');
    const showFormBtn = document.getElementById('show-form-btn');
    const formContainer = document.getElementById('checkout-form-container');
    const payBtn = document.getElementById('pay-button');

    if (!cartList || !totalElem || !showFormBtn || !formContainer || !payBtn) {
        console.error('Virhe: Ostoskorin DOM-elementit puuttuvat!');
        return;
    }

    function getCartImageSrc(image) {
        const fallback = '/verkkokauppa/images/edukosmall.png';
        if (!image) return fallback;

        let src = image.toString().trim();
        if (!src) return fallback;
        if (src.startsWith('data:image/')) return src;
        if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/verkkokauppa/')) return src;
        if (src.startsWith('/uploads/') || src.startsWith('/images/')) return '/verkkokauppa' + src;
        return '/verkkokauppa/uploads/' + src.replace(/^\/+/, '');
    }

    function renderCart() {
        const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        cartList.innerHTML = '';
        let total = 0;

        if (cart.length === 0) {
            cartList.innerHTML = `
                <div class="empty-cart" style="text-align: center; padding: 40px 20px; color: #666;">
                    <h3>${typeof t === 'function' ? t('cart_empty_message') : 'Ostoskorisi on tyhjä.'}</h3>
                    <p><a href="/verkkokauppa/" style="color: #b0a078; text-decoration: none;">${typeof t === 'function' ? t('continue_shopping') : 'Palaa ostoksille tästä.'}</a></p>
                </div>`;
            totalElem.innerText = '0.00';
            showFormBtn.style.display = 'none';
            formContainer.style.display = 'none';
            return;
        }

        showFormBtn.style.display = 'inline-block';

        cart.forEach((item, index) => {
            const price = parseFloat(item.price.toString().replace(',', '.'));
            const quantity = item.quantity || 1;
            const itemTotal = price * quantity;
            total += itemTotal;

            cartList.innerHTML += `
                <div class="cart-item" data-item-index="${index}">
                    <img src="${getCartImageSrc(item.image)}" alt="${item.name}">
                    <div class="cart-details">
                        <h4>${item.name}</h4>
                        <p>${price.toFixed(2)} €</p>
                        <div class="quantity-control">
                            <button class="quantity-btn decrease-btn" data-index="${index}">-</button>
                            <input type="number" class="quantity-input" data-index="${index}" value="${quantity}" min="1" max="${item.stock || 999}">
                            <button class="quantity-btn increase-btn" data-index="${index}">+</button>
                        </div>
                        <div class="quantity-error" data-error-index="${index}" style="display: none; color: red; font-size: 0.85rem; margin-top: 4px;"></div>
                    </div>
                    <div class="cart-item-price">
                        <p>${itemTotal.toFixed(2)} €</p>
                        <button class="remove-btn" type="button" data-remove-index="${index}" aria-label="Poista tuote">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        totalElem.innerText = total.toFixed(2);
        attachQuantityListeners();
    }

    function removeItem(index) {
        const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        if (index >= 0 && index < cart.length) {
            cart.splice(index, 1);
            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            renderCart();
            document.dispatchEvent(new Event('cartUpdated'));
        }
    }

    function clearCart() {
        localStorage.removeItem('eduko_cart');
        renderCart();
        document.dispatchEvent(new Event('cartUpdated'));
    }

    function attachQuantityListeners() {
        document.querySelectorAll('.increase-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                updateQuantity(parseInt(btn.dataset.index, 10), 1);
            });
        });

        document.querySelectorAll('.decrease-btn').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                updateQuantity(parseInt(btn.dataset.index, 10), -1);
            });
        });

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

        document.querySelectorAll('[data-remove-index]').forEach((btn) => {
            btn.addEventListener('click', () => {
                removeItem(parseInt(btn.dataset.removeIndex, 10));
            });
        });
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
            removeItem(index);
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
        document.dispatchEvent(new Event('cartUpdated'));
    }

    function openCheckoutForm() {
        formContainer.style.display = 'block';
        showFormBtn.style.display = 'none';
        requestAnimationFrame(() => {
            formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    showFormBtn.addEventListener('click', openCheckoutForm);

    const emptyCartBtn = document.getElementById('empty-cart-btn');
    if (emptyCartBtn) {
        emptyCartBtn.addEventListener('click', () => {
            if (confirm(typeof t === 'function' ? t('confirm_clear_cart') : 'Haluatko varmasti tyhjentää ostoskorin?')) {
                clearCart();
            }
        });
    }

    payBtn.addEventListener('click', async () => {
        const customerData = {
            fname: document.getElementById('fname').value.trim(),
            lname: document.getElementById('lname').value.trim(),
            email: document.getElementById('customer-email').value.trim(),
            phone: document.getElementById('phone').value.trim(),
            address: document.getElementById('address').value.trim(),
            postcode: document.getElementById('postcode').value.trim(),
            city: document.getElementById('city').value.trim()
        };

        const emptyFields = Object.entries(customerData).filter(([, val]) => val === '');
        if (emptyFields.length > 0) {
            alert(typeof t === 'function' ? t('fill_all_fields') : 'Täytä kaikki osoitetiedot jatkaaksesi.');
            return;
        }

        const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        if (cart.length === 0) {
            alert(typeof t === 'function' ? t('cart_is_empty') : 'Ostoskorisi on tyhjä!');
            return;
        }

        const totalAmount = cart.reduce((sum, item) => {
            const price = parseFloat(item.price.toString().replace(',', '.'));
            const quantity = item.quantity || 1;
            return sum + (price * quantity);
        }, 0);

        payBtn.innerText = typeof t === 'function' ? t('payment_preparing') : 'Valmistellaan maksua...';
        payBtn.disabled = true;

        try {
            sessionStorage.setItem('eduko_pending_order', JSON.stringify({
                items: cart,
                amount: totalAmount,
                customer: customerData,
                created_at: new Date().toISOString()
            }));

            const response = await fetch('/verkkokauppa/api/paytrail/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    amount: totalAmount,
                    customer: customerData
                })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Maksun luominen epäonnistui.');
            }

            if (data.href) {
                window.location.href = data.href;
                return;
            }

            throw new Error(data.error || 'Maksun luominen epäonnistui.');
        } catch (err) {
            console.error('Maksuvirhe:', err);
            alert(err.message || (typeof t === 'function' ? t('server_error_try_again') : 'Yhteysvirhe palvelimeen. Yritä uudelleen.'));
            payBtn.innerText = typeof t === 'function' ? t('proceed_to_payment') : 'Siirry maksamaan';
            payBtn.disabled = false;
        }
    });

    renderCart();

    if (sessionStorage.getItem('openCheckoutForm') === '1') {
        sessionStorage.removeItem('openCheckoutForm');
        const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        if (cart.length > 0) {
            openCheckoutForm();
        }
    }

    document.addEventListener('cartUpdated', () => {
        renderCart();
    });
});
