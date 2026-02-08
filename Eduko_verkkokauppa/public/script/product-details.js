document.addEventListener('DOMContentLoaded', () => {

    // --- 1. VASTUUHENKILÖIDEN TIEDOT ---
    const vastuuhenkilot = {
        "ajoneuvoala": { nimi: "Matti Meikäläinen", email: "matti.ajoneuvo@eduko.fi", puh: "040 123 4567" },
        "hiusala": { nimi: "Sanni Suortuva", email: "sanni.hius@eduko.fi", puh: "040 234 5678" },
        "metalli": { nimi: "Kalle Koneistaja", email: "kalle.metalli@eduko.fi", puh: "040 345 6789" },
        "logistiikka": { nimi: "Lauri Lastaus", email: "lauri.logistiikka@eduko.fi", puh: "040 456 7890" },
        "prosessi": { nimi: "Paula Putki", email: "paula.prosessi@eduko.fi", puh: "040 567 8901" },
        "turvallisuus": { nimi: "Teemu Turva", email: "teemu.turva@eduko.fi", puh: "040 678 9012" },
        "rakennus": { nimi: "Risto Rakentaja", email: "risto.raksa@eduko.fi", puh: "040 789 0123" },
        "ravintola": { nimi: "Keijo Kokki", email: "keijo.kokki@eduko.fi", puh: "040 890 1234" },
        "sahko": { nimi: "Seppo Sähkö", email: "seppo.sahko@eduko.fi", puh: "040 901 2345" },
        "sote": { nimi: "Sari Sote", email: "sari.sote@eduko.fi", puh: "040 012 3456" },
        "it": { nimi: "Iiro It", email: "iiro.it@eduko.fi", puh: "040 111 2222" }
    };

    const oletusHenkilo = { nimi: "Eduko Asiakaspalvelu", email: "info@eduko.fi", puh: "020 61511" };

    // --- 2. OSTOSKORIN PÄIVITYS ---
    const updateCartBadge = () => {
        const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        const badge = document.getElementById('cart-count');
        if (badge) badge.innerText = cart.length;
    };
    updateCartBadge();

    // --- 3. VÄLILEHDET (TABS) ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            button.classList.add('active');
            const target = document.getElementById(targetId);
            if (target) target.classList.add('active');
        });
    });

    // --- 4. TUOTTEEN HAKU ---
    const pathParts = window.location.pathname.split('/');
    const productId = pathParts[pathParts.length - 1];

    if (!productId) return;

    let currentProductData = null;

    fetch(`/api/products/${productId}`)
        .then(res => res.json())
        .then(product => {
            currentProductData = product;

            // Perustiedot
            document.getElementById('product-name').innerText = product.name;
            document.getElementById('product-price').innerText = product.price + " €";
            document.getElementById('product-desc').innerText = product.description || "Ei kuvausta.";
            document.getElementById('display-img').src = product.image || "/images/placeholder.jpg";

            // Varastotiedot kuvauksen alle
            const meta = document.createElement('div');
            meta.style.marginTop = "15px";
            meta.innerHTML = `<p><strong>📦 Varastossa:</strong> ${product.stock || 0} kpl</p>
                              <p><strong>📍 Noutopiste:</strong> ${product.pickup_point || "Päärakennus"}</p>`;
            document.getElementById('product-desc').appendChild(meta);

            // Vastuuhenkilön valinta
            // Etsitään kategoriaa pienillä kirjaimilla
            const slug = (product.category_slug || "").toLowerCase().trim();
            const henkilo = vastuuhenkilot[slug] || oletusHenkilo;

            document.getElementById('contact-name').innerText = henkilo.nimi;
            document.getElementById('contact-email').innerText = henkilo.email;
            document.getElementById('contact-phone').innerText = henkilo.puh;
            document.getElementById('email-link').href = `mailto:${henkilo.email}`;
            document.getElementById('phone-link').href = `tel:${henkilo.puh}`;

            // Tekniset tiedot
            const specsList = document.getElementById('product-specs');
            if (product.specs) {
                product.specs.split(',').forEach(s => {
                    const li = document.createElement('li');
                    li.innerText = s.trim();
                    specsList.appendChild(li);
                });
            } else {
                specsList.innerHTML = "<li>Ei teknisiä tietoja.</li>";
            }

            // Galleria
            setupGallery(product);
        })
        .catch(err => console.error("Haku epäonnistui:", err));

    // --- 5. OSTA-NAPPI ---
    const buyBtn = document.querySelector('.buy-now-btn');
    if (buyBtn) {
        buyBtn.addEventListener('click', () => {
            if (!currentProductData) return;
            let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
            cart.push({
                id: currentProductData.id,
                name: currentProductData.name,
                price: currentProductData.price,
                image: currentProductData.image
            });
            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            updateCartBadge();
            
            buyBtn.innerText = "LISÄTTY!";
            buyBtn.style.backgroundColor = "#28a745";
            setTimeout(() => {
                buyBtn.innerText = "OSTA";
                buyBtn.style.backgroundColor = "";
            }, 2000);
        });
    }

    // --- 6. GALLERIA ---
    function setupGallery(product) {
        const container = document.getElementById('thumbnail-container');
        const mainImg = document.getElementById('display-img');
        let images = [product.image];
        
        if (product.images) {
            try {
                const extra = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                images = images.concat(extra);
            } catch(e) {}
        }document.addEventListener('DOMContentLoaded', () => {

    // --- 1. VASTUUHENKILÖIDEN TIEDOT (Tietokannan ID:n mukaan) ---
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

    // --- 2. HAE TUOTTEEN ID URLISTA ---
    const productId = window.location.pathname.split('/').pop();
    if (!productId || isNaN(productId)) return;

    let currentProductData = null;

    // --- 3. HAE TUOTETIEDOT APISTA ---
    fetch(`/api/products/${productId}`)
        .then(res => {
            if (!res.ok) throw new Error("Tuotetta ei löytynyt");
            return res.json();
        })
        .then(product => {
            currentProductData = product;

            // Täytetään perustiedot HTML-elementteihin
            document.getElementById('product-name').innerText = product.name;
            document.getElementById('product-price').innerText = Number(product.price).toFixed(2) + " €";
            document.getElementById('product-desc').innerText = product.description || "Ei kuvausta.";
            document.getElementById('display-img').src = product.image || "/images/placeholder.jpg";

            // VASTUUHENKILÖN PÄIVITYS (Käytetään tietokannan category_id:tä)
            const catId = String(product.category_id);
            const henkilo = vastuuhenkilot[catId] || oletusHenkilo;

            document.getElementById('contact-name').innerText = henkilo.nimi;
            document.getElementById('contact-email').innerText = henkilo.email;
            document.getElementById('contact-phone').innerText = henkilo.puh;
            document.getElementById('email-link').href = `mailto:${henkilo.email}`;
            document.getElementById('phone-link').href = `tel:${henkilo.puh}`;

            // Tekniset tiedot (specs)
            const specsList = document.getElementById('product-specs');
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

            setupGallery(product);
        })
        .catch(err => {
            console.error(err);
            document.querySelector('.product-main').innerHTML = "<h2>Tuotetta ei löytynyt.</h2>";
        });

    // --- 4. OSTOSKORIIN LISÄÄMINEN ---
    const buyBtn = document.querySelector('.buy-now-btn');
    if (buyBtn) {
        buyBtn.addEventListener('click', () => {
            if (!currentProductData) return;
            let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
            cart.push({
                id: currentProductData.id,
                name: currentProductData.name,
                price: currentProductData.price,
                image: currentProductData.image
            });
            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            
            // Päivitä korin lukema
            const badge = document.getElementById('cart-count');
            if (badge) badge.innerText = cart.length;

            buyBtn.innerText = "LISÄTTY!";
            buyBtn.style.background = "#28a745";
            setTimeout(() => {
                buyBtn.innerText = "OSTA";
                buyBtn.style.background = "";
            }, 2000);
        });
    }

    // --- 5. GALLERIA JA VÄLILEHDET ---
    function setupGallery(product) {
        const thumbContainer = document.getElementById('thumbnail-container');
        const mainImg = document.getElementById('display-img');
        if (!thumbContainer) return;
        thumbContainer.innerHTML = "";

        let allImages = [product.image];
        if (product.images) {
            try {
                const extra = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                allImages = allImages.concat(extra);
            } catch(e) {}
        }

        allImages.filter(img => img).forEach(imgUrl => {
            const thumb = document.createElement('img');
            thumb.src = imgUrl;
            thumb.className = "thumbnail";
            thumb.onclick = () => mainImg.src = imgUrl;
            thumbContainer.appendChild(thumb);
        });
    }

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
});

        images.filter(img => img).forEach(imgUrl => {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.className = "thumbnail";
            img.onclick = () => mainImg.src = imgUrl;
            container.appendChild(img);
        });
    }
});