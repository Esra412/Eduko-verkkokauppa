document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('product-grid');
    const categoryTitle = document.querySelector('.section-title');
    const searchInput = document.querySelector('.search-box input');
    const searchBtn = document.querySelector('.search-box button');

    // --- 1. Ostoskorin tilan päivitys (Yläpalkin numero) ---
    const updateCartBadge = () => {
        const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        const cartCountElement = document.getElementById('cart-count');
        const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);

        if (cartCountElement) {
            cartCountElement.innerText = totalItems;
        }
    };

    // Päivitä luku heti sekä sivulle palatessa
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

        function getImageSrc(image) {
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

        products.forEach(product => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            const locationText = product.pickup_point || "Kouvola";
            const typeText = product.type || "Opiskelijatyö";

            // Huom: Käytetään data-attribuutteja tallennusta varten
            card.innerHTML = `
                <a href="/verkkokauppa/tuote/${product.id}" class="product-link">
                    <div class="image-wrapper">
                        <span class="product-badge">${typeText}</span>
                        <img src="${getImageSrc(product.image)}" alt="${product.name}" onerror="this.onerror=null; this.src='/verkkokauppa/images/edukosmall.png';">
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
                        data-image="${getImageSrc(product.image)}">
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
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                // Luetaan tiedot napin data-attribuuteista
                const productId = button.dataset.id;
                const name = button.dataset.name;
                const price = button.dataset.price;
                const image = button.dataset.image;

                // Haetaan tuotteen varastosaldo
                let stock = 1; // oletus
                try {
                    const response = await fetch(`/verkkokauppa/api/products/${productId}`);
                    const productData = await response.json();
                    stock = productData.stock || 0;
                } catch (err) {
                    console.error("Virhe varastosaldon haussa:", err);
                }

                // Käytä addToCart funktiota jos se on saatavilla, muuten oma logiikka
                if (typeof addToCart === 'function') {
                    addToCart(productId, name, price, image, stock);
                } else {
                    // Tallennus localStorageen
                    let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
                    
                    // Tarkista, onko tuote jo korissa
                    const existingItem = cart.find(item => item.id == productId);
                    const currentQuantity = existingItem ? (existingItem.quantity || 1) : 0;
                    
                    // Tarkista varastosaldo
                    if (currentQuantity >= stock) {
                        alert(`Tuote "${name}" on loppunut varastosta. Varastosaldo: ${stock} kpl`);
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
                    
                    // Visuaalinen palaute
                    const countSpan = document.getElementById('cart-count');
                    if (countSpan) {
                        countSpan.style.transform = "scale(1.5)";
                        setTimeout(() => { countSpan.style.transform = "scale(1)"; }, 200);
                    }
                }

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

    // --- Yhdistetty latausfunktio tuotteiden hakemiseksi ---
    function loadCategoryProducts() {
        const currentLang = getCurrentLanguage();
        fetch(`/verkkokauppa/api/products?category=${categoryId}&lang=${currentLang}`)
            .then(res => res.json())
            .then(products => {
                console.log("📦 Kategoriasta haetut tuotteet:", products);
                renderProducts(products);
            })
            .catch(err => {
                console.error("Virhe:", err);
                grid.innerHTML = "<p>Tuotteiden haku epäonnistui.</p>";
            });
    }

    // --- 5. Datan haku palvelimelta ---
    loadCategoryProducts();

    // --- 6. Hakutoiminto ---
    const suoritaHaku = () => {
        const term = searchInput.value.trim();
        if (term.length > 0) {
            categoryTitle.innerText = `Haun tulokset: "${term}"`;
            fetch(`/verkkokauppa/api/search?q=${encodeURIComponent(term)}`)
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

    // --- 7. Kuuntele kielen muutoksia - lataa tuotteet uudelleen ---
    document.addEventListener('languageChanged', () => {
        console.log("Kieli muuttui kategorian sivulla - ladataan tuotteet uudelleen");
        loadCategoryProducts();
    });
});