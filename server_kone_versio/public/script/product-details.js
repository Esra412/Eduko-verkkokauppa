document.addEventListener('DOMContentLoaded', () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mainNav = document.getElementById('main-navigation');
    if (mobileMenuBtn && mainNav) {
        mobileMenuBtn.addEventListener('click', () => {
            const expanded = mainNav.classList.toggle('show');
            mobileMenuBtn.classList.toggle('open', expanded);
            mobileMenuBtn.setAttribute('aria-expanded', String(expanded));
        });
    }

    // ===============================
    // VASTUUHENKILÖT
    // ===============================
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

    const oletusHenkilo = {
        nimi: "Eduko Asiakaspalvelu",
        email: "info@eduko.fi",
        puh: "020 61511"
    };

    // ===============================
    // HAE PRODUCT ID
    // ===============================
    const productId = window.location.pathname.split('/').pop();
    if (!productId || isNaN(productId)) return;

    let currentProductData = null;

    // ===============================
    // KUVAN URL RATKAISU
    // ===============================
    function resolveImageUrl(image) {
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

    // ===============================
    // GALLERIA
    // ===============================
    function setupGallery(product) {
        const thumbContainer = document.getElementById('thumbnail-container');
        const mainImg = document.getElementById('display-img');
        if (!thumbContainer || !mainImg) return;

        thumbContainer.innerHTML = "";
        document.querySelector('.thumbnail-limit-note')?.remove();

        let allImages = [];

        if (product.image) {
            const u = resolveImageUrl(product.image);
            if (u) allImages.push(u);
        }

        if (product.images) {
            try {
                const extraImages =
                    typeof product.images === 'string'
                        ? JSON.parse(product.images)
                        : product.images;

                if (Array.isArray(extraImages)) {
                    const resolvedExtraImages = extraImages.map(img => resolveImageUrl(img));
                    allImages = allImages.concat(resolvedExtraImages);
                }
            } catch (e) {
                console.error("Kuvien parsinta epäonnistui", e);
            }
        }

        const uniqueImages = [...new Set(allImages.filter(Boolean))];
        const limitedImages = uniqueImages.slice(0, 8);

        mainImg.onerror = () => {
            mainImg.onerror = null;
            mainImg.src = '/verkkokauppa/images/edukosmall.png';
        };
        mainImg.src = limitedImages[0] || '/verkkokauppa/images/edukosmall.png';

        limitedImages.forEach((imgUrl, index) => {
            const thumb = document.createElement('img');
            thumb.src = imgUrl;
            thumb.className = index === 0 ? 'thumbnail active' : 'thumbnail';
            thumb.onerror = () => {
                thumb.onerror = null;
                thumb.src = '/verkkokauppa/images/edukosmall.png';
            };
            thumb.addEventListener('click', () => {
                mainImg.src = imgUrl;
                thumbContainer.querySelectorAll('.thumbnail').forEach(img => img.classList.remove('active'));
                thumb.classList.add('active');
            });
            thumbContainer.appendChild(thumb);
        });

        if (uniqueImages.length > limitedImages.length) {
            const note = document.createElement('p');
            note.className = 'thumbnail-limit-note';
            note.innerText = `Näytetään enintään ${limitedImages.length} kuvaa kerralla.`;
            thumbContainer.parentElement?.appendChild(note);
        }
    }

    // ===============================
    // LATAA JA NÄYTÄ TUOTE
    // ===============================
    function loadAndDisplayProduct() {
        const currentLang =
            (typeof getCurrentLanguage === 'function')
                ? getCurrentLanguage()
                : 'fi';

        fetch(`/verkkokauppa/api/products/${productId}?lang=${currentLang}`)
            .then(res => {
                if (!res.ok) throw new Error("Tuotetta ei löytynyt");
                return res.json();
            })
            .then(product => {
                currentProductData = product;

                document.getElementById('product-name').innerText = product.name;
                document.getElementById('product-price').innerText =
                    Number(product.price).toFixed(2) + " €";
                document.getElementById('product-desc').innerText =
                    product.description || "Ei kuvausta.";

                setupGallery(product);

                const metaDiv = document.getElementById('product-meta');
                if (metaDiv) {
                    metaDiv.innerHTML = `
                        <p><strong>📦 Varastossa:</strong> ${product.stock || 0} kpl</p>
                        <p><strong>📍 Noutopiste:</strong> ${product.pickup_point || "Päärakennus"}</p>
                    `;
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
                        specsList.innerHTML =
                            "<li>Ei teknisiä tietoja saatavilla</li>";
                    }
                }
            })
            .catch(err => {
                console.error(err);
                const main = document.querySelector('.product-main');
                if (main) {
                    main.innerHTML = "<h2>Tuotetta ei löytynyt.</h2>";
                }
            });
    }

    // ===============================
    // OSTOSKORI
    // ===============================
    function updateCartBadge() {
        const cart = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
        document.querySelectorAll('.cart-count, #cart-count').forEach((badge) => {
            badge.innerText = totalItems;
        });
    }

    updateCartBadge();
    document.addEventListener('cartUpdated', updateCartBadge);
    window.addEventListener('storage', updateCartBadge);
    window.addEventListener('pageshow', updateCartBadge);

    const buyBtn = document.querySelector('.buy-now-btn');

    if (buyBtn) {
        buyBtn.addEventListener('click', () => {

            if (!currentProductData) return;

            const maxStock = currentProductData.stock || 1;

            let cart =
                JSON.parse(localStorage.getItem('eduko_cart')) || [];

            const existingItem =
                cart.find(item => item.id == currentProductData.id);

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
                    image: (typeof resolveImageUrl === 'function') ? resolveImageUrl(currentProductData.image) : currentProductData.image,
                    stock: maxStock,
                    quantity: 1
                });
                alert("Tuote lisätty koriin!");
            }

            localStorage.setItem('eduko_cart', JSON.stringify(cart));

            updateCartBadge();

            // Läheta event että ostoskori päivitettiin
            document.dispatchEvent(new Event('cartUpdated'));

            buyBtn.innerText = "✓ LISÄTTY!";
            buyBtn.style.background = "#28a745";

            setTimeout(() => {
                buyBtn.innerText = "OSTA";
                buyBtn.style.background = "";
            }, 2000);
        });
    }

    // ===============================
    // MOBIILI OSO-PALKKI
    // ===============================
    const mobileBuyBtn = document.querySelector('.mobile-buy-btn');
    const mobilePrice = document.querySelector('.mobile-price');

    // Päivitä mobiili hinnan näyttö kun tuote ladataan
    const observer = new MutationObserver(() => {
        if (currentProductData && mobilePrice) {
            mobilePrice.innerText = Number(currentProductData.price).toFixed(2) + " €";
        }
    });

    // Observoi product-price elementin muutoksia
    const productPriceElem = document.getElementById('product-price');
    if (productPriceElem) {
        observer.observe(productPriceElem, { childList: true, subtree: true, characterData: true });
    }

    if (mobileBuyBtn) {
        mobileBuyBtn.addEventListener('click', () => {
            if (!currentProductData) return;

            const maxStock = currentProductData.stock || 1;

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
                if (maxStock <= 0) {
                    alert("Tuote ei ole saatavilla!");
                    return;
                }
                cart.push({
                    id: currentProductData.id,
                    name: currentProductData.name,
                    price: currentProductData.price,
                    image: (typeof resolveImageUrl === 'function') ? resolveImageUrl(currentProductData.image) : currentProductData.image,
                    stock: maxStock,
                    quantity: 1
                });
                alert("Tuote lisätty koriin!");
            }

            localStorage.setItem('eduko_cart', JSON.stringify(cart));
            updateCartBadge();
            document.dispatchEvent(new Event('cartUpdated'));

            mobileBuyBtn.innerText = "✓ LISÄTTY!";
            mobileBuyBtn.style.background = "#28a745";

            setTimeout(() => {
                mobileBuyBtn.innerText = "Lisää koriin";
                mobileBuyBtn.style.background = "";
            }, 2000);
        });
    }

    // ===============================
    // VÄLILEHDET
    // ===============================
    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;

            document.querySelectorAll('.tab-pane')
                .forEach(p => p.classList.remove('active'));

            document.querySelectorAll('.tab-btn')
                .forEach(b => b.classList.remove('active'));

            btn.classList.add('active');

            const targetPane = document.getElementById(target);
            if (targetPane) {
                targetPane.classList.add('active');
            }
        });
    });

    // ===============================
    // KIELEN VAIHTO
    // ===============================
    document.addEventListener('languageChanged', () => {
        loadAndDisplayProduct();
    });

    // ===============================
    // ENSIMMÄINEN LATAUS
    // ===============================
    loadAndDisplayProduct();

});
