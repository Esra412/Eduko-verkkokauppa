document.addEventListener('DOMContentLoaded', () => {
    const cartList = document.getElementById('cart-list');
    const totalElem = document.getElementById('cart-total');
    const showFormBtn = document.getElementById('show-form-btn');
    const formContainer = document.getElementById('checkout-form-container');
    const payBtn = document.getElementById('pay-button');

    // Päivitetään näkymä aina kun kieli vaihtuu
    document.addEventListener('languageChanged', renderCart);

    function renderCart() {
        let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        cartList.innerHTML = "";
        let total = 0;

        if (cart.length === 0) {
            cartList.innerHTML = `
                <div class='empty-cart' style='text-align: center; padding: 40px;'>
                    <h3>${t('empty_cart')}</h3>
                    <p><a href='/' style='color: #b0a078;'>${t('continue_shopping')}</a></p>
                </div>`;
            totalElem.innerText = "0.00";
            if (showFormBtn) showFormBtn.style.display = 'none';
            if (formContainer) formContainer.style.display = 'none';
            return;
        }

        if (showFormBtn && formContainer.style.display !== 'block') {
            showFormBtn.style.display = 'inline-block';
        }

        cart.forEach((item, index) => {
            const price = parseFloat(item.price.toString().replace(',', '.'));
            const quantity = item.quantity || 1;
            const itemTotal = price * quantity;
            total += itemTotal;

            const cartItem = document.createElement('div');
            cartItem.className = 'cart-item';
            cartItem.dataset.itemIndex = index;
            cartItem.innerHTML = `
                <img src="${item.image || '/images/no-image.png'}" alt="${item.name}">
                <div class="cart-details">
                    <h4>${item.name}</h4>
                    <p>${price.toFixed(2)} €</p>
                    <div class="quantity-control">
                        <button class="quantity-btn decrease-btn" data-index="${index}">−</button>
                        <span class="quantity-display" data-index="${index}">${quantity}</span>
                        <button class="quantity-btn increase-btn" data-index="${index}">+</button>
                    </div>
                </div>
                <div class="cart-item-price">
                    <p style="font-weight: bold;">${itemTotal.toFixed(2)} €</p>
                    <button class="remove-btn" onclick="removeItem(${index})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            cartList.appendChild(cartItem);
        });

        totalElem.innerText = total.toFixed(2);
        attachQuantityListeners();
    }

    // Globaali funktio poistolle (koska onclick-attribuutti HTML:ssä)
    window.removeItem = function(index) {
        let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        cart.splice(index, 1);
        localStorage.setItem('eduko_cart', JSON.stringify(cart));
        renderCart();
        
        const countBadge = document.getElementById('cart-count');
        if (countBadge) countBadge.innerText = cart.length;
    };

    function attachQuantityListeners() {
        document.querySelectorAll('.increase-btn').forEach(btn => {
            btn.onclick = () => updateQuantity(parseInt(btn.dataset.index), 1);
        });

        document.querySelectorAll('.decrease-btn').forEach(btn => {
            btn.onclick = () => updateQuantity(parseInt(btn.dataset.index), -1);
        });
    }

    async function updateQuantity(index, change) {
        let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        const item = cart[index];
        if (!item) return;

        try {
            const response = await fetch(`/api/products/${item.id}`);
            const product = await response.json();
            const maxStock = product.stock;

            item.quantity = (item.quantity || 1) + change;

            if (item.quantity <= 0) {
                removeItem(index);
                return;
            }

            if (item.quantity > maxStock) {
                alert(`${t('cart_max_limit')} (${maxStock})`);
                item.quantity = maxStock;
            }

            cart[index] = item;
            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            renderCart();
        } catch (err) {
            console.error("Varastovirhe:", err);
        }
    }

    if (showFormBtn) {
        showFormBtn.addEventListener('click', () => {
            formContainer.style.display = 'block';
            showFormBtn.style.display = 'none';
            formContainer.scrollIntoView({ behavior: 'smooth' });
        });
    }

    if (payBtn) {
        payBtn.addEventListener('click', async () => {
            const customerData = {
                fname: document.getElementById('fname').value,
                lname: document.getElementById('lname').value,
                email: document.getElementById('customer-email').value,
                phone: document.getElementById('phone').value,
                address: document.getElementById('address').value,
                postcode: document.getElementById('postcode').value,
                city: document.getElementById('city').value
            };

            if (Object.values(customerData).some(val => val.trim() === "")) {
                alert(t('fill_all_fields') || "Täytä kaikki tiedot.");
                return;
            }

            let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
            const totalAmount = cart.reduce((sum, item) => {
                const price = parseFloat(item.price.toString().replace(',', '.'));
                return sum + (price * (item.quantity || 1));
            }, 0);

            payBtn.innerText = t('preparing_payment') || "Valmistellaan...";
            payBtn.disabled = true;

            try {
                const response = await fetch('/api/paytrail/create-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        items: cart,
                        amount: totalAmount,
                        customer: customerData,
                        lang: localStorage.getItem('eduko_lang') || 'fi' // Lähetetään kielitieto palvelimelle
                    })
                });

                const data = await response.json();
                if (data.href) {
                    window.location.href = data.href;
                } else {
                    alert(t('payment_error') || "Virhe maksussa.");
                    payBtn.innerText = t('proceed_to_payment');
                    payBtn.disabled = false;
                }
            } catch (err) {
                console.error("Yhteysvirhe:", err);
                payBtn.disabled = false;
            }
        });
    }

    renderCart();
});