document.addEventListener('DOMContentLoaded', () => {
    // Muuttuja, johon tallennetaan API:sta haetut tuotteet kielen vaihtoa varten
    let paikallisetTuotteet = [];

    // Päivitetään ostoskorin lukumäärä heti latauksessa
    const paivitaOstoskorinLukumara = () => {
        const ostoskori = JSON.parse(localStorage.getItem('eduko_cart')) || [];
        const ostoskoriElementti = document.getElementById('cart-count');
        if (ostoskoriElementti) ostoskoriElementti.innerText = ostoskori.length;
    };
    paivitaOstoskorinLukumara();

    // Kuunnellaan kielenvaihtoa, jotta tuotekorttien tekstit päivittyvät lennossa
    document.addEventListener('languageChanged', () => {
        tulostaTuotteet(paikallisetTuotteet);
    });

    console.log("Eduko etusivu ladattu");

    const grid = document.querySelector('.product-grid');

    // ==========================================
    // 1️⃣ TUOTTEIDEN TULOSTAMINEN (DYNAMIC RENDER)
    // ==========================================
    function tulostaTuotteet(tuotteet) {
        if (!grid) return;
        grid.innerHTML = "";

        if (tuotteet.length === 0) {
            grid.innerHTML = `<p>${t('no_products')}</p>`;
            return;
        }

        tuotteet.forEach(tuote => {
            const kortti = document.createElement('div');
            kortti.className = 'product-card';

            // Haetaan noutopiste ja tyyppi (oletusarvot jos puuttuu)
            const sijaintiTeksti = tuote.pickup_point || "Kouvola";
            const tyyppiBadge = tuote.type || "Uusi";

            kortti.innerHTML = `
                <a href="/tuote/${tuote.id}" class="product-link">
                    <div class="image-wrapper">
                        <span class="product-badge">${tyyppiBadge}</span>
                        <img src="${tuote.image || '/images/no-image.png'}" alt="${tuote.name}">
                    </div>
                    <div class="card-content">
                        <h3>${tuote.name}</h3>
                        <p class="location">
                            <i class="fas fa-map-marker-alt"></i> ${sijaintiTeksti}
                        </p>
                    </div>
                </a>
                <div class="card-footer">
                    <span class="price">${Number(tuote.price).toFixed(2)} €</span>
                    <button class="bid-btn" data-id="${tuote.id}">${t('add_to_cart')}</button>
                </div>
            `;

            grid.appendChild(kortti);
        });

        // Aktivoidaan napit uudelleen jokaisen tulostuksen jälkeen
        ostoskoriLogiikka();
    }

    // ==========================================
    // 2️⃣ HAE TUOTTEET API:STA
    // ==========================================
    fetch('/api/products/latest')
        .then(res => res.json())
        .then(tuotteet => {
            paikallisetTuotteet = tuotteet; // Tallennetaan muistiin
            tulostaTuotteet(tuotteet);
            liveHaku();
        })
        .catch(err => {
            console.error("Virhe tuotteiden haussa:", err);
            grid.innerHTML = `<p>${t('load_error')}</p>`;
        });

    // ==========================================
    // 3️⃣ LIVE-HAKU (Suodattaa näkyviä kortteja)
    // ==========================================
    function liveHaku() {
        const hakuKentta = document.querySelector('.search-box input');
        if (!hakuKentta) return;

        hakuKentta.addEventListener('input', (e) => {
            const hakusana = e.target.value.toLowerCase();
            document.querySelectorAll('.product-card').forEach(kortti => {
                const otsikko = kortti.querySelector('h3').innerText.toLowerCase();
                kortti.style.display = otsikko.includes(hakusana) ? 'block' : 'none';
            });
        });
    }

    // ==========================================
    // 4️⃣ OSTOSKORI
    // ==========================================
    function ostoskoriLogiikka() {
        document.querySelectorAll('.bid-btn').forEach(nappi => {
            // Käytetään onclick-uudelleenasetusta välttääksemme moninkertaiset tapahtumakuuntelijat
            nappi.onclick = async (e) => {
                e.preventDefault();
                const kortti = nappi.closest('.product-card');
                const tuoteId = nappi.getAttribute('data-id');
                
                // Haetaan tuotteen varastosaldo API:sta
                let maxVarasto = 5; 
                try {
                    const vastaus = await fetch(`/api/products/${tuoteId}`);
                    const tuoteTiedot = await vastaus.json();
                    maxVarasto = Math.min(tuoteTiedot.stock, 5); 
                } catch (err) {
                    console.error("Virhe varastosaldon haussa:", err);
                }

                const uusiTuote = {
                    id: tuoteId,
                    name: kortti.querySelector('h3').innerText,
                    price: kortti.querySelector('.price').innerText.replace(' €', ''),
                    image: kortti.querySelector('img').src,
                    quantity: 1
                };

                let kori = JSON.parse(localStorage.getItem('eduko_cart')) || [];
                const loytyvaTuote = kori.find(item => item.id == tuoteId);

                if (loytyvaTuote) {
                    if (loytyvaTuote.quantity < maxVarasto) {
                        loytyvaTuote.quantity += 1;
                        alert(`${t('cart_updated')}: ${loytyvaTuote.quantity} kpl`);
                    } else {
                        alert(`${t('cart_max_limit')} (${maxVarasto} kpl)`);
                        return;
                    }
                } else {
                    kori.push(uusiTuote);
                    alert(t('cart_added'));
                }

                localStorage.setItem('eduko_cart', JSON.stringify(kori));
                paivitaOstoskorinLukumara();
            };
        });
    }
});