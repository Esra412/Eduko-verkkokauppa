    const cartList = document.getElementById('cart-list');
    const totalElem = document.getElementById('cart-total');
    const showFormBtn = document.getElementById('show-form-btn');
    const formContainer = document.getElementById('checkout-form-container');
    const payBtn = document.getElementById('pay-button');

    function renderCart() {
        let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        cartList.innerHTML = "";
        let total = 0;

        if (cart.length === 0) {
            cartList.innerHTML = `
                <div class='empty-cart'>
                    <h3>Ostoskorisi on tyhjä.</h3>
                    <p><a href='/' style='color: #b0a078;'>Palaa ostoksille tästä.</a></p>
                </div>`;
            totalElem.innerText = "0.00";
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
                    <img src="${item.image || '/images/no-image.png'}" alt="">
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
                </div>
            `;
        });
        totalElem.innerText = total.toFixed(2);
        
        // Liitä event listenerit quantity nappeihin
        attachQuantityListeners();
    }


    
    function removeItem(index) {
        let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        cart.splice(index, 1);
        localStorage.setItem('eduko_cart', JSON.stringify(cart));
        renderCart();
        
        const count = document.getElementById('cart-count');
        if (count) count.innerText = cart.length;
    }

    // Attach event listeners keille quantity nappeihin
    function attachQuantityListeners() {
        document.querySelectorAll('.increase-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const index = parseInt(btn.dataset.index);
                updateQuantity(index, 1);
            });
        });

        document.querySelectorAll('.decrease-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const index = parseInt(btn.dataset.index);
                updateQuantity(index, -1);
            });
        });
    }

    // Päivitä tuotteen määrä ostoskorissa
    async function updateQuantity(index, change) {
        let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        const item = cart[index];

        if (!item) return;

        // Ensin haetaan varastosaldo kannasta
        try {
            const response = await fetch(`/api/products/${item.id}`);
            const product = await response.json();
            const maxStock = product.stock; // Käytä varastosaldoa suoraan

            // Päivitä määrä
            item.quantity = (item.quantity || 1) + change;

            // Minimiä kontrolloi 1, jos 0 tai alle, poista tuote
            if (item.quantity <= 0) {
                removeItem(index);
                return;
            }

            // Maksimiä kontrolloi
            if (item.quantity > maxStock) {
                item.quantity = maxStock;
            }

            // Tallenna muutokset
            cart[index] = item;
            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            renderCart();
        } catch (err) {
            console.error("Virhe tuotteen varastosaldon haussa:", err);
            // Fallback: aseta määrä 1
            item.quantity = (item.quantity || 1) + change;
            if (item.quantity <= 0) {
                removeItem(index);
                return;
            }
            if (item.quantity > 1) {
                item.quantity = 1;
            }
            cart[index] = item;
            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            renderCart();
        }
    }

    // "Jatka tilaamaan" -painikkeen logiikka
    showFormBtn.addEventListener('click', () => {
        formContainer.style.display = 'block';
        showFormBtn.style.display = 'none';
        formContainer.scrollIntoView({ behavior: 'smooth' });
    });

    // Lopullinen maksun luonti
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

        // Validaatio
        if (Object.values(customerData).some(val => val.trim() === "")) {
            alert("Täytä kaikki osoitetiedot jatkaaksesi.");
            return;
        }

        let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        
        // Laske yhteissumma ottamalla huomioon määrät
        const totalAmount = cart.reduce((sum, item) => {
            const price = parseFloat(item.price.toString().replace(',', '.'));
            const quantity = item.quantity || 1;
            return sum + (price * quantity);
        }, 0);

        payBtn.innerText = "Valmistellaan maksua...";
        payBtn.disabled = true;

        try {
            const response = await fetch('/api/paytrail/create-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: cart,
                    amount: totalAmount,
                    customer: customerData
                })
            });

            const data = await response.json();

            if (data.href) {
                window.location.href = data.href;
            } else {
                alert("Maksun luominen epäonnistui. Yritä uudelleen.");
                payBtn.innerText = "Siirry maksamaan";
                payBtn.disabled = false;
            }
        } catch (err) {
            console.error("Yhteysvirhe:", err);
            alert("Yhteysvirhe palvelimeen.");
            payBtn.disabled = false;
        }
    });

    // Alustetaan kori heti
    renderCart();