document.addEventListener('DOMContentLoaded', () => {

    // --- 1. OSTOSKORIN TILAN PÄIVITYS ---
    const updateCartBadge = () => {
        const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        const cartCountElement = document.getElementById('cart-count');
        if (cartCountElement) {
            cartCountElement.innerText = cart.length;
        }
    };
    updateCartBadge(); // Päivitetään heti latauksessa

    // --- 2. TABS LOGIIKKA ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            button.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) targetPane.classList.add('active');
        });
    });

    // --- 3. HAE TUOTTEEN ID ---
    const pathParts = window.location.pathname.split('/');
    const productId = pathParts[pathParts.length - 1];

    if (!productId) return;

    let currentProductData = null; // Tallennetaan tähän tuotteen tiedot myöhempää käyttöä varten

    // --- 4. HAE TUOTETIEDOT PALVELIMELTA ---
    fetch(`/api/products/${productId}`)
        .then(res => {
            if (!res.ok) throw new Error("Tuotetta ei löytynyt");
            return res.json();
        })
        .then(product => {
            currentProductData = product; // Tallennetaan globaalisti koritoimintoa varten

            // Täytetään tiedot sivulle
            document.getElementById('product-name').innerText = product.name;
            document.getElementById('product-price').innerText = product.price + " €";
            document.getElementById('product-desc').innerText = product.description || "Ei kuvausta.";

            const mainImg = document.getElementById('display-img');
            mainImg.src = product.image || "/images/placeholder.jpg";

            // Varasto ja noutopiste
            const metaDiv = document.createElement('div');
            metaDiv.className = "product-meta";
            metaDiv.style.marginTop = "20px";
            metaDiv.style.borderTop = "1px solid #ddd";
            metaDiv.style.paddingTop = "10px";
            metaDiv.innerHTML = `
                <p><strong>📦 Varastossa:</strong> ${product.stock || 0} kpl</p>
                <p><strong>📍 Noutopiste:</strong> ${product.pickup_point || "Ei määritelty"}</p>
            `;
            document.getElementById('product-desc').appendChild(metaDiv);

            // Tekniset tiedot
            const specsList = document.getElementById('product-specs');
            specsList.innerHTML = "";
            if (product.specs) {
                const specsArray = product.specs.split(',');
                specsArray.forEach(item => {
                    const li = document.createElement('li');
                    li.innerText = item.trim();
                    specsList.appendChild(li);
                });
            } else {
                specsList.innerHTML = "<li>Ei teknisiä tietoja saatavilla</li>";
            }

            // Galleria (Kuvat-välilehti)
            setupGallery(product);
        })
        .catch(err => {
            console.error(err);
            const mainContainer = document.querySelector('.product-main');
            if (mainContainer) mainContainer.innerHTML = "<p>Tuotetietojen haku epäonnistui.</p>";
        });

    // --- 5. OSTOSKORIIN LISÄÄMINEN (OSTA-NAPPI) ---
    const buyBtn = document.querySelector('.buy-now-btn');
    if (buyBtn) {
        buyBtn.addEventListener('click', () => {
            if (!currentProductData) return;

            // Luodaan objekti tallennusta varten
            const productToCart = {
                id: currentProductData.id,
                name: currentProductData.name,
                price: currentProductData.price,
                image: currentProductData.image || "/images/placeholder.jpg"
            };

            // Lisätään koriin
            let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
            cart.push(productToCart);
            localStorage.setItem('eduko_cart', JSON.stringify(cart));

            // Päivitetään käyttöliittymä
            updateCartBadge();

            // Palaute käyttäjälle
            const originalText = buyBtn.innerText;
            buyBtn.innerText = "LISÄTTY!";
            buyBtn.style.background = "#28a745";
            buyBtn.disabled = true;

            setTimeout(() => {
                buyBtn.innerText = originalText;
                buyBtn.style.background = "";
                buyBtn.disabled = false;
            }, 2000);
        });
    }

    // --- 6. GALLERIAN TOIMINTA ---
    function setupGallery(product) {
        const thumbContainer = document.getElementById('thumbnail-container');
        const mainImg = document.getElementById('display-img');
        if (!thumbContainer) return;

        let allImages = [];
        if (product.image) allImages.push(product.image);
        if (product.images) {
            try {
                const extra = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                if (Array.isArray(extra)) allImages = allImages.concat(extra);
            } catch (e) { console.error("Kuvavirhe:", e); }
        }

        allImages.forEach(imgUrl => {
            const thumb = document.createElement('img');
            thumb.src = imgUrl;
            thumb.className = "thumbnail";
            thumb.addEventListener('click', () => {
                mainImg.style.opacity = "0";
                setTimeout(() => {
                    mainImg.src = imgUrl;
                    mainImg.style.opacity = "1";
                }, 150);
            });
            thumbContainer.appendChild(thumb);
        });
    }
});