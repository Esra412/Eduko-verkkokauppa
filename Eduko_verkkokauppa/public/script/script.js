document.addEventListener('DOMContentLoaded', () => {
    console.log("Kiertonet demo ladattu - Reititys aktiivinen");

    // --- 1. LIVE-HAKU ---
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const productCards = document.querySelectorAll('.product-card');
            productCards.forEach(card => {
                const title = card.querySelector('h3').innerText.toLowerCase();
                card.style.display = title.includes(term) ? 'block' : 'none';
            });
        });
    }

    // --- 2. OSTOSKORI-LOGIIKKA ---
    let cartItems = 0;
    const cartCountElement = document.getElementById('cart-count');
    const addButtons = document.querySelectorAll('.bid-btn');

    addButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault(); // Estetään sivun vaihtuminen, jos nappi on linkin sisällä
            e.stopPropagation(); // Estetään kortin klikkaus-eventti
            
            cartItems++;
            if (cartCountElement) cartCountElement.innerText = cartItems;

            const cartIcon = document.querySelector('.cart-container');
            if (cartIcon) {
                cartIcon.style.transform = 'scale(1.3)';
                setTimeout(() => { cartIcon.style.transform = 'scale(1)'; }, 200);
            }

            const originalText = button.innerText;
            button.innerText = "Lisätty!";
            button.style.background = "#28a745"; 
            setTimeout(() => {
                button.innerText = originalText;
                button.style.background = ""; 
            }, 1000);
        });
    });

    // --- 3. REITTIVALVONTA (Tämä täyttää pohjan) ---
    const path = window.location.pathname;

    if (path.includes('/tuote/')) {
        const productId = path.split('/').pop();
        console.log("Haetaan tuotteen " + productId + " tiedot...");
        
        // TÄSSÄ TÄYTETÄÄN POHJA (Placeholderit)
        const titleElement = document.getElementById('product-name');
        if (titleElement) {
            titleElement.innerText = "Tuote ID: " + productId;
            // Myöhemmin tässä kohtaa fetch hakee PHP:lta oikeat tiedot
        }
    }
});