document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('product-grid');
    const categoryTitle = document.querySelector('.section-title');
    const searchInput = document.querySelector('.search-box input');
    const searchBtn = document.querySelector('.search-box button');

    // --- 1. Ostoskorin tilan päivitys (Yläpalkin numero) ---
    const updateCartBadge = () => {
        const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        const cartCountElement = document.getElementById('cart-count');
        if (cartCountElement) {
            cartCountElement.innerText = cart.length;
        }
    };
    
    // Ajetaan kerran heti latauksessa
    updateCartBadge();

    // --- 2. Kategorian tunnistus osoitepalkista ---
    const pathParts = window.location.pathname.split('/').filter(part => part !== "");
    const categoryId = pathParts[pathParts.length - 1];

    const kategoriat = {
        "1": "Ajoneuvoala", "2": "Hius- ja kauneudenhoito", "3": "Kone- ja metalliala",
        "4": "Logistiikka", "5": "Prosessi- ja laboratorio", "6": "Turvallisuusala",
        "7": "Rakennus", "8": "Ravintola", "9": "Sähkö ja automaatio",
        "10": "Sosiaali- ja terveysala", "11": "IT-ala"
    };
    
    if (kategoriat[categoryId]) {
        categoryTitle.innerText = kategoriat[categoryId];
    }

    // --- 3. Tuotteiden piirtäminen sivulle ---
    function renderProducts(products) {
        grid.innerHTML = "";
        if (products.length === 0) {
            grid.innerHTML = `<p>Kategoriassa ei ole vielä tuotteita.</p>`;
            return;
        }

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            const locationText = product.pickup_point || "Kouvola";
            const typeText = product.type || "Opiskelijatyö";

            // Huom: Käytetään data-attribuutteja tallennusta varten
            card.innerHTML = `
                <a href="/tuote/${product.id}" class="product-link">
                    <div class="image-wrapper">
                        <span class="product-badge">${typeText}</span>
                        <img src="${product.image || '/images/no-image.png'}" alt="${product.name}">
                    </div>
                    <div class="card-content">
                        <h3>${product.name}</h3>
                        <p class="location"><i class="fas fa-map-marker-alt"></i> ${locationText}</p>
                    </div>
                </a>
                <div class="card-footer">
                    <span class="price">${product.price} €</span>
                    <button class="bid-btn" 
                        data-id="${product.id}" 
                        data-name="${product.name}" 
                        data-price="${product.price}" 
                        data-image="${product.image || '/images/no-image.png'}">
                        Lisää ostoskoriin
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });

        // Aktivoidaan napit VASTA kun ne on luotu
        aktivoiOstoskoriPainikkeet();
    }

    // --- 4. Ostoskorimekaniikka (Se "juttu") ---
    function aktivoiOstoskoriPainikkeet() {
        document.querySelectorAll('.bid-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Luetaan tiedot napin data-attribuuteista
                const product = {
                    id: button.dataset.id,
                    name: button.dataset.name,
                    price: button.dataset.price,
                    image: button.dataset.image
                };

                // Tallennus localStorageen
                let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
                cart.push(product);
                localStorage.setItem('eduko_cart', JSON.stringify(cart));
                
                // Käyttöliittymän päivitys
                updateCartBadge();
                
                // Visuaalinen palaute napissa
                const alkuperainenTeksti = button.innerText;
                button.innerText = "Lisätty! ✓";
                button.style.background = "#28a745";
                button.disabled = true; // Estetään tuplaklikkaukset heti perään

                setTimeout(() => {
                    button.innerText = alkuperainenTeksti;
                    button.style.background = "";
                    button.disabled = false;
                }, 1500);
            });
        });
    }

    // --- 5. Datan haku palvelimelta ---
    fetch(`/api/products?category=${categoryId}`)
        .then(res => res.json())
        .then(products => renderProducts(products))
        .catch(err => {
            console.error("Virhe:", err);
            grid.innerHTML = "<p>Tuotteiden haku epäonnistui.</p>";
        });

    // --- 6. Hakutoiminto ---
    const suoritaHaku = () => {
        const term = searchInput.value.trim();
        if (term.length > 0) {
            categoryTitle.innerText = `Haun tulokset: "${term}"`;
            fetch(`/api/search?q=${encodeURIComponent(term)}`)
                .then(res => res.json())
                .then(products => renderProducts(products))
                .catch(err => console.error("Hakuvirhe:", err));
        }
    };

    if (searchBtn) searchBtn.addEventListener('click', suoritaHaku);
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') suoritaHaku();
        });
    }
});