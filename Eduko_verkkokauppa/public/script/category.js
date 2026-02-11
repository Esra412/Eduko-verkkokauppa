document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('product-grid');
    const categoryTitle = document.querySelector('.section-title');
    const searchInput = document.querySelector('.search-box input');
    const searchBtn = document.querySelector('.search-box button');

    // Tallennetaan tuotteet muistiin, jotta kielen vaihto ei vaadi uutta palvelinhakua
    let paikallisetTuotteet = [];

    // --- 1. Ostoskorin tilan päivitys (Yläpalkin numero) ---
    const paivitaOstoskorinLukumara = () => {
        const kori = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        const koriElementti = document.getElementById('cart-count');
        if (koriElementti) {
            koriElementti.innerText = kori.length;
        }
    };
    
    // Alustetaan lukumäärä
    paivitaOstoskorinLukumara();

    // Kuunnellaan kielen vaihtumista
    document.addEventListener('languageChanged', () => {
        paivitaKategorianNimi();
        renderöiTuotteet(paikallisetTuotteet);
    });

    // --- 2. Kategorian tunnistus ja nimen kääntäminen ---
    const polunOsat = window.location.pathname.split('/').filter(osa => osa !== "");
    const kategoriaId = polunOsat[polunOsat.length - 1];

    const paivitaKategorianNimi = () => {
        // Avaimet vastaavat JSON-tiedostojesi cat_ alkuisia avaimia
        const kategoriaAvaimet = {
            "1": "cat_auto", "2": "cat_beauty", "3": "cat_metal",
            "4": "cat_logistics", "5": "cat_lab", "6": "cat_security",
            "7": "cat_construction", "8": "cat_restaurant", "9": "cat_electric",
            "10": "cat_health", "11": "cat_ict"
        };
        
        const avain = kategoriaAvaimet[kategoriaId];
        if (avain && categoryTitle) {
            categoryTitle.innerText = t(avain);
        }
    };
    
    paivitaKategorianNimi();

    // --- 3. Tuotteiden piirtäminen sivulle ---
    function renderöiTuotteet(tuotteet) {
        if (!grid) return;
        grid.innerHTML = "";
        
        if (tuotteet.length === 0) {
            grid.innerHTML = `<p>${t('no_products')}</p>`;
            return;
        }

        tuotteet.forEach(tuote => {
            const kortti = document.createElement('div');
            kortti.className = 'product-card';
            
            const sijaintiTeksti = tuote.pickup_point || "Kouvola";
            const tyyppiTeksti = tuote.type || "Eduko";

            kortti.innerHTML = `
                <a href="/tuote/${tuote.id}" class="product-link">
                    <div class="image-wrapper">
                        <span class="product-badge">${tyyppiTeksti}</span>
                        <img src="${tuote.image || '/images/no-image.png'}" alt="${tuote.name}">
                    </div>
                    <div class="card-content">
                        <h3>${tuote.name}</h3>
                        <p class="location"><i class="fas fa-map-marker-alt"></i> ${sijaintiTeksti}</p>
                    </div>
                </a>
                <div class="card-footer">
                    <span class="price">${Number(tuote.price).toFixed(2)} €</span>
                    <button class="bid-btn" 
                        data-id="${tuote.id}" 
                        data-name="${tuote.name}" 
                        data-price="${tuote.price}" 
                        data-image="${tuote.image || '/images/no-image.png'}">
                        ${t('add_to_cart')}
                    </button>
                </div>
            `;
            grid.appendChild(kortti);
        });

        aktivoiOstoskoriPainikkeet();
    }

    // --- 4. Ostoskorimekaniikka ---
    function aktivoiOstoskoriPainikkeet() {
        document.querySelectorAll('.bid-btn').forEach(nappi => {
            nappi.onclick = async (e) => {
                e.preventDefault();

                const tuoteId = nappi.dataset.id;
                const tuote = {
                    id: tuoteId,
                    name: nappi.dataset.name,
                    price: nappi.dataset.price,
                    image: nappi.dataset.image,
                    quantity: 1
                };

                // Haetaan varastosaldo API:sta
                let maxVarasto = 5; 
                try {
                    const vastaus = await fetch(`/api/products/${tuoteId}`);
                    const tuoteData = await vastaus.json();
                    maxVarasto = Math.min(tuoteData.stock, 5);
                } catch (err) {
                    console.error("Virhe varastosaldon haussa:", err);
                }

                let kori = JSON.parse(localStorage.getItem('eduko_cart')) || [];
                const loytyvaTuote = kori.find(item => item.id == tuoteId);

                if (loytyvaTuote) {
                    if (loytyvaTuote.quantity < maxVarasto) {
                        loytyvaTuote.quantity += 1;
                        naytaPalaute(nappi, "✓");
                    } else {
                        alert(`${t('cart_max_limit')} (${maxVarasto})`);
                        return;
                    }
                } else {
                    kori.push(tuote);
                    naytaPalaute(nappi, "✓");
                }
                
                localStorage.setItem('eduko_cart', JSON.stringify(kori));
                paivitaOstoskorinLukumara();
            };
        });
    }

    // Apufunktio napin visuaaliseen palautteeseen
    function naytaPalaute(nappi, viesti) {
        const alkuperainenTeksti = nappi.innerText;
        nappi.innerText = viesti;
        nappi.style.background = "#28a745";
        nappi.disabled = true;

        setTimeout(() => {
            nappi.innerText = alkuperainenTeksti;
            nappi.style.background = "";
            nappi.disabled = false;
        }, 1000);
    }

    // --- 5. Datan haku palvelimelta ---
    fetch(`/api/products?category=${kategoriaId}`)
        .then(res => res.json())
        .then(tuotteet => {
            paikallisetTuotteet = tuotteet;
            renderöiTuotteet(tuotteet);
        })
        .catch(err => {
            console.error("Virhe:", err);
            if (grid) grid.innerHTML = `<p>${t('load_error')}</p>`;
        });

    // --- 6. Hakutoiminto ---
    const suoritaHaku = () => {
        const hakusana = searchInput.value.trim();
        if (hakusana.length > 0) {
            if (categoryTitle) categoryTitle.innerText = `${t('search_results')}: "${hakusana}"`;
            fetch(`/api/search?q=${encodeURIComponent(hakusana)}`)
                .then(res => res.json())
                .then(tuotteet => {
                    paikallisetTuotteet = tuotteet;
                    renderöiTuotteet(tuotteet);
                })
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