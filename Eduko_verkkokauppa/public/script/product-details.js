document.addEventListener('DOMContentLoaded', () => {

    // --- VASTUUHENKILÖIDEN TIEDOT ---
    const vastuuhenkilot = {
        "1": { nimi: "Matti Meikäläinen", email: "matti.ajoneuvo@eduko.fi", puh: "040 123 4567" },
        "2": { nimi: "Sanni Suortuva", email: "sanni.hius@eduko.fi", puh: "040 234 5678" },
        "3": { nimi: "Kalle Koneistaja", email: "kalle.metalli@eduko.fi", puh: "040 345 6789" },
        "4": { nimi: "Lauri Lastaus", email: "lauri.logistiikka@eduko.fi", puh: "040 456 7890" },
        "5": { nimi: "Paula Putki", email: "paula.prosessi@eduko.fi", puh: "040 567 8901" },
        "6": { nimi: "Teemu Turva", email: "teemu.turva@eduko.fi", puh: "040 678 9012" },
        "7": { nimi: "Risto Rakentaja", email: "risto.raksa@eduko.fi", puh: "040 789 0123" },
        "8": { nimi: "Keijo Kokki", email: "keijo.kokki@eduko.fi", puh: "040 890 1234" },
        "9": { nimi: "Seppo Sähkö", email: "seppo.sahko@eduko.fi", puh: "040 901 2345" },
        "10": { nimi: "Sari Sote", email: "sari.sote@eduko.fi", puh: "040 012 3456" },
        "11": { nimi: "Iiro It", email: "iiro.it@eduko.fi", puh: "040 111 2222" }
    };
    const oletusHenkilo = { nimi: "Eduko Asiakaspalvelu", email: "info@eduko.fi", puh: "020 61511" };

    // --- HAE TUOTTEEN ID ---
    const productId = window.location.pathname.split('/').pop();
    if (!productId || isNaN(productId)) return;

    let currentProductData = null;

    // --- GALLERIA ---
    function setupGallery(product) {
        const thumbContainer = document.getElementById('thumbnail-container');
        const mainImg = document.getElementById('display-img');
        if (!thumbContainer) return;
        thumbContainer.innerHTML = "";

        let allImages = [];
        if (product.image) allImages.push(product.image);
        if (product.images) {
            try {
                const extra = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                allImages = allImages.concat(extra);
            } catch(e) {}
        }

        // Näytä pääkuva
        if (allImages.length > 0) {
            mainImg.src = allImages[0];
        }

        // Näytä pienoiskuvat
        allImages.filter(img => img).forEach(imgUrl => {
            const thumb = document.createElement('img');
            thumb.src = imgUrl;
            thumb.className = "thumbnail";
            thumb.onclick = () => mainImg.src = imgUrl;
            thumbContainer.appendChild(thumb);
        });
    }

    // --- LATAA JA NÄYTÄ TUOTE ---
    function loadAndDisplayProduct() {
const currentLang = (typeof getCurrentLanguage === 'function') ? getCurrentLanguage() : 'fi';
    
    console.log("Ladataan tuote kielellä:", currentLang); // Debuggausta varten

    fetch(`/api/products/${productId}?lang=${currentLang}`)
        .then(res => {
            if (!res.ok) throw new Error("Tuotetta ei löytynyt");
            return res.json();
        })
        .then(product => {
                currentProductData = product;

                // Näytä perustiedot
                document.getElementById('product-name').innerText = product.name;
                document.getElementById('product-price').innerText = Number(product.price).toFixed(2) + " €";
                document.getElementById('product-desc').innerText = product.description || "Ei kuvausta.";

                // Galleria
                setupGallery(product);

                // Varastotiedot
                const metaDiv = document.getElementById('product-meta');
                if (metaDiv) {
                    metaDiv.innerHTML = `<p><strong>📦 Varastossa:</strong> ${product.stock || 0} kpl</p>
                                         <p><strong>📍 Noutopiste:</strong> ${product.pickup_point || "Päärakennus"}</p>`;
                }

                // Vastuuhenkilö
                const catId = String(product.category_id);
                const henkilo = vastuuhenkilot[catId] || oletusHenkilo;
                document.getElementById('contact-name').innerText = henkilo.nimi;
                document.getElementById('contact-email').innerText = henkilo.email;
                document.getElementById('contact-phone').innerText = henkilo.puh;
                document.getElementById('email-link').href = `mailto:${henkilo.email}`;
                document.getElementById('phone-link').href = `tel:${henkilo.puh}`;

                // Tekniset tiedot
                const specsList = document.getElementById('product-specs');
                if (specsList) {
                    specsList.innerHTML = "";
                    if (product.specs) {
                        product.specs.split(',').forEach(item => {
                            const li = document.createElement('li');
                            li.innerText = item.trim();
                            specsList.appendChild(li);
                        });
                    } else {
                        specsList.innerHTML = "<li>Ei teknisiä tietoja saatavilla</li>";
                    }
                }
            })
            .catch(err => {
                console.error(err);
                document.querySelector('.product-main').innerHTML = "<h2>Tuotetta ei löytynyt.</h2>";
            });
    }

    // --- LATAA ENSIMMÄISTÄ KERTAA ---
    loadAndDisplayProduct();

    // --- OSTOSKORIIN LISÄÄMINEN ---
    const buyBtn = document.querySelector('.buy-now-btn');
    if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
            if (!currentProductData) return;

            let maxStock = currentProductData.stock || 1;

            let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
            const existingItem = cart.find(item => item.id == currentProductData.id);
            
            if (existingItem) {
                if (existingItem.quantity < maxStock) {
                    existingItem.quantity += 1;
                    alert(`Määrä päivitetty: ${existingItem.quantity} kpl`);
                } else {
                    alert(`Maksimimäärä (${maxStock} kpl) saavutettu!`);
                    return;
                }
            } else {
                cart.push({
                    id: currentProductData.id,
                    name: currentProductData.name,
                    price: currentProductData.price,
                    image: currentProductData.image,
                    quantity: 1
                });
                alert("Tuote lisätty koriin!");
            }

            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            const badge = document.getElementById('cart-count');
            if (badge) badge.innerText = cart.length;

            buyBtn.innerText = "✓ LISÄTTY!";
            buyBtn.style.background = "#28a745";
            setTimeout(() => {
                buyBtn.innerText = "OSTA";
                buyBtn.style.background = "";
            }, 2000);
        });
    }

    // --- VÄLILEHDET ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(target).classList.add('active');
        });
    });

    // --- KUUNTELE KIELEN MUUTOKSIA JA LATAA TUOTE UUDELLEEN ---
    document.addEventListener('languageChanged', () => {
        console.log("Kieli muuttui - näyttö päivittyy");
        loadAndDisplayProduct();
    });

});