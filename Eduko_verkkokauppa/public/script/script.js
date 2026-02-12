// ===============================
// 🔄 LATAA JA PÄIVITÄ TUOTTEET
// ===============================
function loadProducts() {
    // --- LISÄÄ TÄMÄ TÄHÄN ---
    const initialCart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
    const cartCountElement = document.getElementById('cart-count');
    if (cartCountElement) cartCountElement.innerText = initialCart.length;
    // ------------------------

    const grid = document.querySelector('.product-grid');
    if (!grid) return;

    // Haetaan käännös napille (oletuksena suomi jos ei ole saatavilla)
    const addToCartButtonText = t('add_to_cart') || 'Lisää ostoskoriin';

    // ===============================
    // 1️⃣ HAE 15 UUSINTA TUOTETTA
    // ===============================
    const currentLang = getCurrentLanguage();
    fetch(`/api/products/latest?lang=${currentLang}`)
        .then(res => res.json())
        .then(products => {
            grid.innerHTML = "";

            if (products.length === 0) {
                const noProductsMsg = t('no_products') || 'Ei uusia kohteita juuri nyt.';
                grid.innerHTML = `<p>${noProductsMsg}</p>`;
                return;
            }

            products.forEach(product => {
                const card = document.createElement('div');
                card.className = 'product-card';

                // Käytetään tietokannan noutopistettä ja tyyppiä
                const locationText = product.pickup_point || "Kouvola";
                const typeBadge = product.type || "Uusi";

                card.innerHTML = `
                    <a href="/tuote/${product.id}" class="product-link">
                        <div class="image-wrapper">
                            <span class="product-badge">${typeBadge}</span>
                            <img src="${product.image || '/images/no-image.png'}" alt="${product.name}">
                        </div>
                        <div class="card-content">
                            <h3>${product.name}</h3>
                            <p class="location">
                                <i class="fas fa-map-marker-alt"></i> ${locationText}
                            </p>
                        </div>
                    </a>
                    <div class="card-footer">
                        <span class="price">${Number(product.price).toFixed(2)} €</span>
                        <button class="bid-btn">${addToCartButtonText}</button>
                    </div>
                `;

                grid.appendChild(card);
            });

            // Aktivoidaan ostoskori ja haku, kun tuotteet on ladattu
            ostoskoriLogiikka();
            liveHaku();
        })
        .catch(err => {
            console.error("Virhe tuotteiden haussa:", err);
            const loadErrorMsg = t('load_error') || 'Tuotteita ei voitu ladata.';
            grid.innerHTML = `<p>${loadErrorMsg}</p>`;
        });
}

// ===============================
// 2️⃣ LIVE-HAKU (Suodattaa näkyviä kortteja)
// ===============================
function liveHaku() {
    const searchInput = document.querySelector('.search-box input');
    if (!searchInput) return;

    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll('.product-card').forEach(card => {
            const title = card.querySelector('h3').innerText.toLowerCase();
            card.style.display = title.includes(term) ? 'block' : 'none';
        });
    });
}

// ===============================
// 3️⃣ OSTOSKORI
// ===============================
function ostoskoriLogiikka() {
    document.querySelectorAll('.bid-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            const card = button.closest('.product-card');
            const productId = card.querySelector('a').href.split('/').pop();
            
            // Haetaan tuotteen varastosaldo
            let maxStock = 1; // oletus
            try {
                const response = await fetch(`/api/products/${productId}`);
                const product = await response.json();
                maxStock = product.stock; // Käytä varastosaldoa suoraan
            } catch (err) {
                console.error("Virhe varastosaldon haussa:", err);
            }

            // Luodaan objekti, jossa on kaikki tarvittava
            const product = {
                id: productId,
                name: card.querySelector('h3').innerText,
                price: card.querySelector('.price').innerText.replace(' €', ''), // Pelkkä numero
                image: card.querySelector('img').src,
                quantity: 1
            };

            // Haetaan vanhat tuotteet
            let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
            
            // Tarkista, onko tuote jo korissa
            const existingItem = cart.find(item => item.id == productId);
            if (existingItem) {
                // Jos tuote on jo korissa, kasvata määrää (max maxStock)
                if (existingItem.quantity < maxStock) {
                    existingItem.quantity += 1;
                    alert(`Tuotteen määrä päivitetty: ${existingItem.quantity} kpl`);
                } else {
                    alert(`Maksimimäärä (${maxStock} kpl) saavutettu!`);
                    return;
                }
            } else {
                // Lisää uusi tuote määrällä 1
                cart.push(product);
                alert("Tuote lisätty koriin!");
            }

            localStorage.setItem('eduko_cart', JSON.stringify(cart));

            // Päivitä lukema yläpalkkiin (laske uniikki tuotteiden määrä)
            const cartCountElement = document.getElementById('cart-count');
            if (cartCountElement) cartCountElement.innerText = cart.length;
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Eduko etusivu ladattu");
});

// ===============================
// 🌐 KUUNTELE KIELEN MUUTOKSIA JA LATAA TUOTTEET SILLOIN
// ===============================
document.addEventListener('languageChanged', () => {
    console.log("Kieli valmis - ladataan tuotteet");
    loadProducts();
});