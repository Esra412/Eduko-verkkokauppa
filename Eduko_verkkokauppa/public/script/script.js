document.addEventListener('DOMContentLoaded', () => {
    console.log("Eduko etusivu ladattu");

    const grid = document.getElementById('product-grid');

    // ===============================
    // 1️⃣ HAE 15 UUSINTA TUOTETTA
    // ===============================
    fetch('/api/products/latest')
        .then(res => res.json())
        .then(products => {
            grid.innerHTML = "";

            products.forEach(product => {
                const card = document.createElement('div');
                card.className = 'product-card';

                card.innerHTML = `
                    <a href="/tuote/${product.id}" class="product-link">
                        <div class="image-wrapper">
                            <img src="${product.image || '/images/no-image.png'}" alt="${product.name}">
                            <span class="badge">Uusi</span>
                        </div>
                        <div class="card-content">
                            <h3>${product.name}</h3>
                            <p class="location">
                                <i class="fas fa-map-marker-alt"></i> Kouvola
                            </p>
                        </div>
                    </a>
                    <div class="card-footer">
                        <span class="price">${product.price} €</span>
                        <button class="bid-btn">Lisää ostoskoriin</button>
                    </div>
                `;

                grid.appendChild(card);
            });

            ostoskoriLogiikka();
            liveHaku();
        })
        .catch(err => {
            console.error("Virhe tuotteiden haussa:", err);
            grid.innerHTML = "<p>Tuotteita ei voitu ladata.</p>";
        });

    // ===============================
    // 2️⃣ LIVE-HAKU
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
        let cartItems = 0;
        const cartCountElement = document.getElementById('cart-count');

        document.querySelectorAll('.bid-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                cartItems++;
                if (cartCountElement) cartCountElement.innerText = cartItems;

                const originalText = button.innerText;
                button.innerText = "Lisätty!";
                button.style.background = "#28a745";

                setTimeout(() => {
                    button.innerText = originalText;
                    button.style.background = "";
                }, 1000);
            });
        });
    }
});
