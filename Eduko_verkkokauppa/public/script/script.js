document.addEventListener('DOMContentLoaded', () => {
    console.log("Eduko etusivu ladattu");

    const grid = document.querySelector('.product-grid');

    // ===============================
    // 1️⃣ HAE 15 UUSINTA TUOTETTA
    // ===============================
    fetch('/api/products/latest')
        .then(res => res.json())
        .then(products => {
            grid.innerHTML = "";

            if (products.length === 0) {
                grid.innerHTML = "<p>Ei uusia kohteita juuri nyt.</p>";
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
                        <button class="bid-btn">Lisää ostoskoriin</button>
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
            grid.innerHTML = "<p>Tuotteita ei voitu ladata.</p>";
        });

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
    // script.js sisällä
function ostoskoriLogiikka() {
    document.querySelectorAll('.bid-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const card = button.closest('.product-card');
            
            // Luodaan objekti, jossa on kaikki tarvittava
            const product = {
                id: card.querySelector('a').href.split('/').pop(),
                name: card.querySelector('h3').innerText,
                price: card.querySelector('.price').innerText.replace(' €', ''), // Pelkkä numero
                image: card.querySelector('img').src
            };

            // Haetaan vanhat, lisätään uusi ja tallennetaan
            let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
            cart.push(product);
            localStorage.setItem('eduko_cart', JSON.stringify(cart));

            // Päivitä lukema yläpalkkiin
            document.getElementById('cart-count').innerText = cart.length;
            
            alert("Tuote lisätty koriin!");
        });
    });
}
});