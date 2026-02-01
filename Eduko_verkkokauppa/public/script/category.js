document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('product-grid');
    const categoryTitle = document.querySelector('.section-title');

    // 1. Haetaan kategorian ID osoitepalkista varmalla tavalla
    const pathParts = window.location.pathname.split('/').filter(part => part !== "");
    const categoryId = pathParts[pathParts.length - 1];

    console.log("Sivun lataus: Haetaan tuotteita kategorialle ID:", categoryId);

    // Päivitetään otsikko
    const kategoriat = {
        "1": "Ajoneuvoala", "2": "Hius- ja kauneudenhoito", "3": "Kone- ja metalliala",
        "4": "Logistiikka", "5": "Prosessi- ja laboratorio", "6": "Turvallisuusala",
        "7": "Rakennus", "8": "Ravintola", "9": "Sähkö ja automaatio",
        "10": "Sosiaali- ja terveysala", "11": "IT-ala"
    };
    
    if (kategoriat[categoryId]) {
        categoryTitle.innerText = kategoriat[categoryId];
    }

    // 2. Haetaan tuotteet API:sta
    fetch(`/api/products?category=${categoryId}`)
        .then(res => {
            if (!res.ok) throw new Error("Palvelinvirhe: " + res.status);
            return res.json();
        })
        .then(products => {
            console.log("Palvelin vastasi tuotteilla:", products);
            grid.innerHTML = "";

            if (products.length === 0) {
                grid.innerHTML = `<p>Kategoriassa "${kategoriat[categoryId] || categoryId}" ei ole vielä tuotteita.</p>`;
                return;
            }

products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    const locationText = product.pickup_point || "Kouvola";
    
    // Määritetään tyyppi (esim. Opiskelijatyö)
    const typeText = product.type || "Opiskelijatyö";

    card.innerHTML = `
        <a href="/tuote/${product.id}" class="product-link">
            <div class="image-wrapper">
                <span class="product-badge">${typeText}</span>
                <img src="${product.image || '/images/no-image.png'}" alt="${product.name}">
            </div>
            <div class="card-content">
                <h3>${product.name}</h3>
                <p class="location"><i class="fas fa-map-marker-alt"></i> ${locationText}</p>
            </div>
        </a>
        <div class="card-footer">
            <span class="price">${product.price} €</span>
            <button class="bid-btn">Lisää ostoskoriin</button>
        </div>
    `;
    grid.appendChild(card);
});

        })
        .catch(err => {
            console.error("Virhe haettaessa tuotteita:", err);
            grid.innerHTML = "<p>Tuotteiden haku epäonnistui. Tarkista tietokantayhteys.</p>";
        });
});