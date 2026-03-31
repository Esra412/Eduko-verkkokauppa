const cartList = document.getElementById('cart-list');
    const totalElem = document.getElementById('cart-total');
    const showFormBtn = document.getElementById('show-form-btn');
    const formContainer = document.getElementById('checkout-form-container');
    const payBtn = document.getElementById('pay-button');

    // Varmista että kaikki elementit on olemassa
    if (!cartList || !totalElem || !showFormBtn || !formContainer || !payBtn) {
        console.error('Virhe: Ostoskorin DOM-elementit puuttuvat!');
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
        let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        cartList.innerHTML = "";
        let total = 0;

        if (cart.length === 0) {
            cartList.innerHTML = `
                <div class='empty-cart' style="text-align: center; padding: 40px 20px; color: #666;">
                    <h3>Ostoskorisi on tyhjä.</h3>
                    <p><a href='/verkkokauppa/' style='color: #b0a078; text-decoration: none;'>Palaa ostoksille tästä.</a></p>
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
                    <img src="${getCartImageSrc(item.image)}" alt="" style="width: 80px; height: 80px; object-fit: cover; border-radius: 5px; margin-right: 10px;">
                    <div class="cart-details" style="flex: 1;">
                        <h4 style="margin: 0 0 5px 0;">${item.name}</h4>
                        <p style="margin: 0; color: #666;">${price.toFixed(2)} €</p>
                        <div class="quantity-control" style="display: flex; align-items: center; gap: 8px; margin-top: 8px;">
                            <button class="quantity-btn decrease-btn" data-index="${index}" style="background: #eee; border: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer; font-weight: bold;">−</button>
                            <span class="quantity-display" data-index="${index}" style="min-width: 30px; text-align: center; font-weight: bold;">${quantity}</span>
                            <button class="quantity-btn increase-btn" data-index="${index}" style="background: #eee; border: none; width: 30px; height: 30px; border-radius: 4px; cursor: pointer; font-weight: bold;">+</button>
                        </div>
                    </div>
                    <div class="cart-item-price" style="text-align: right; min-width: 100px;">
                        <p style="font-weight: bold; margin: 0;">${itemTotal.toFixed(2)} €</p>
                        <button class="remove-btn" onclick="removeItem(${index})" style="background: #ff4444; color: white; border: none; padding: 8px 12px; border-radius: 4px; cursor: pointer; margin-top: 8px; font-size: 0.9rem;">
                            Poista
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
        if (index >= 0 && index < cart.length) {
            const removedItem = cart[index];
            cart.splice(index, 1);
            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            renderCart();
            
            // Päivitä korin laskuri jos se on olemassa
            const count = document.getElementById('cart-count');
            if (count) count.innerText = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
            document.dispatchEvent(new Event('cartUpdated'));
        }
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
            const response = await fetch(`/verkkokauppa/api/products/${item.id}`);
            const product = await response.json();
            const maxStock = product.stock; // Käytä varastosaldoa suoraan

            // Päivitä määrä
            item.quantity = (item.quantity || 1) + change;

            // Jos määrä menee 0 tai alle, poista tuote automaattisesti
            if (item.quantity <= 0) {
                removeItem(index);
                alert("Tuote poistettu ostoskorista.");
                return;
            }

            // Tarkista maksimi varastosaldon perusteella
            if (item.quantity > maxStock) {
                alert(`Maksimissaan ${maxStock} kpl saatavilla.`);
                item.quantity = maxStock;
            }

            // Tallenna muutokset
            cart[index] = item;
            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            renderCart();
            document.dispatchEvent(new Event('cartUpdated'));
        } catch (err) {
            console.error("Virhe tuotteen varastosaldon haussa:", err);
            
            // Fallback jos API virheen tapahtuessa
            item.quantity = (item.quantity || 1) + change;
            if (item.quantity <= 0) {
                removeItem(index);
                alert("Tuote poistettu ostoskorista.");
                return;
            }
            
            // Fallback maksimiarvoksi 1
            if (item.quantity > 1) {
                item.quantity = Math.min(item.quantity, 10);
            }
            
            cart[index] = item;
            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            renderCart();
            document.dispatchEvent(new Event('cartUpdated'));
        }
    }

    function openCheckoutForm() {
        formContainer.style.display = 'block';
        showFormBtn.style.display = 'none';
        formContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // "Jatka tilaamaan" -painikkeen logiikka
    showFormBtn.addEventListener('click', () => {
        openCheckoutForm();
    });

    // Lopullinen maksun luonti
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

        // Validaatio
        const emptyFields = Object.entries(customerData).filter(([key, val]) => val === "");
        if (emptyFields.length > 0) {
            alert("Täytä kaikki osoitetiedot jatkaaksesi.");
            return;
        }

        let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        
        if (cart.length === 0) {
            alert("Ostoskorisi on tyhjä!");
            return;
        }
        
        // Laske yhteissumma ottamalla huomioon määrät
        const totalAmount = cart.reduce((sum, item) => {
            const price = parseFloat(item.price.toString().replace(',', '.'));
            const quantity = item.quantity || 1;
            return sum + (price * quantity);
        }, 0);

        payBtn.innerText = "Valmistellaan maksua...";
        payBtn.disabled = true;

        try {
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

            if (data.href) {
                window.location.href = data.href;
            } else {
                alert("Maksun luominen epäonnistui. Yritä uudelleen.");
                payBtn.innerText = "Siirry maksamaan";
                payBtn.disabled = false;
            }
        } catch (err) {
            console.error("Yhteysvirhe:", err);
            alert("Yhteysvirhe palvelimeen. Yritä uudelleen.");
            payBtn.innerText = "Siirry maksamaan";
            payBtn.disabled = false;
        }
    });

    // Alustetaan kori heti
    renderCart();

    if (sessionStorage.getItem('openCheckoutForm') === '1') {
        sessionStorage.removeItem('openCheckoutForm');
        const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        if (cart.length > 0) {
            openCheckoutForm();
        }
    }

    // Kuuntele ostoskori päivityksistä
    document.addEventListener('cartUpdated', () => {
        renderCart();
    });