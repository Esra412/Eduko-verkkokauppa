document.addEventListener('DOMContentLoaded', () => {

    // --- 1. VASTUUHENKILÖIDEN TIEDOT ---
    // Pidetään nimet ja numerot vakiona, mutta otsikot tulevat JSON-tiedostoista
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

    // Kuunnellaan kielen vaihtumista (jos käyttäjä vaihtaa kieltä tuotesivulla)
    document.addEventListener('languageChanged', () => {
        if (currentProductData) paivitaUI(currentProductData);
    });

    // --- 3. HAE TUOTETIEDOT APISTA ---
    fetch(`/api/products/${productId}`)
        .then(res => {
            if (!res.ok) throw new Error("Tuotetta ei löytynyt");
            return res.json();
        })
        .then(product => {
            currentProductData = product;
            paivitaUI(product);
            setupGallery(product);
        })
        .catch(err => {
            console.error(err);
            const main = document.querySelector('.product-main');
            if (main) main.innerHTML = `<h2>${t('load_error')}</h2>`;
        });

    function paivitaUI(product) {
        // Perustiedot
        document.getElementById('product-name').innerText = product.name;
        document.getElementById('product-price').innerText = Number(product.price).toFixed(2) + " €";
        document.getElementById('product-desc').innerText = product.description || t('no_description');
        document.getElementById('display-img').src = product.image || "/images/placeholder.jpg";

        // Varastotiedot ja noutopiste (Käännettynä)
        const oldMeta = document.getElementById('product-meta');
        if (oldMeta) oldMeta.remove();

        const meta = document.createElement('div');
        meta.id = 'product-meta';
        meta.style.marginTop = "15px";
        
        // Huom: "stock_label" ja "pickup_label" pitää löytyä JSON-tiedostoista
        const stockLabel = t('stock_label') || "📦 Varastossa:";
        const pickupLabel = t('pickup_label') || "📍 Noutopiste:";

        meta.innerHTML = `<p><strong>${stockLabel}</strong> ${product.stock || 0} kpl</p>
                          <p><strong>${pickupLabel}</strong> ${product.pickup_point || "Eduko Kouvola"}</p>`;
        document.getElementById('product-desc').appendChild(meta);

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
        specsList.innerHTML = "";
        if (product.specs) {
            product.specs.split(',').forEach(item => {
                const li = document.createElement('li');
                li.innerText = item.trim();
                specsList.appendChild(li);
            });
        } else {
            specsList.innerHTML = `<li>${t('no_specs')}</li>`;
        }
    }

    // --- 4. OSTOSKORIIN LISÄÄMINEN ---
    const buyBtn = document.querySelector('.buy-now-btn');
    if (buyBtn) {
        buyBtn.addEventListener('click', async () => {
            if (!currentProductData) return;

            let maxStock = 1;
            try {
                const response = await fetch(`/api/products/${currentProductData.id}`);
                const productData = await response.json();
                maxStock = productData.stock;
            } catch (err) {
                console.error("Virhe varastosaldon haussa:", err);
            }

            let cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
            const existingItem = cart.find(item => item.id == currentProductData.id);

            if (existingItem) {
                if (existingItem.quantity < maxStock) {
                    existingItem.quantity += 1;
                } else {
                    alert(`${t('cart_max_limit')} (${maxStock})`);
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
            }

            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            
            // Päivitä lukema yläpalkissa
            const badge = document.getElementById('cart-count');
            if (badge) badge.innerText = cart.length;

            // Visuaalinen palaute
            const originalText = t('buy_btn');
            buyBtn.innerText = t('cart_added_short') || "LISÄTTY! ✓";
            buyBtn.style.background = "#28a745";
            buyBtn.disabled = true;

            setTimeout(() => {
                buyBtn.innerText = originalText;
                buyBtn.style.background = "";
                buyBtn.disabled = false;
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
            thumb.onclick = () => {
                mainImg.src = imgUrl;
                // Korostetaan valittu pikkukuva
                document.querySelectorAll('.thumbnail').forEach(t => t.style.borderColor = "#ddd");
                thumb.style.borderColor = "#0056b3";
            };
            thumbContainer.appendChild(thumb);
        });
    }

    // Välilehtien vaihto
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const pane = document.getElementById(target);
            if (pane) pane.classList.add('active');
        });
    });
});