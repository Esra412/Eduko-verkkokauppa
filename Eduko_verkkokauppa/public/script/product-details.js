document.addEventListener('DOMContentLoaded', () => {

    // ===============================
    // 1️⃣ TABS
    // ===============================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
                pane.style.display = 'none';
            });

            button.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
                targetPane.style.display = 'block';
            }
        });
    });

    // ===============================
    // 2️⃣ HAE TUOTTEEN ID URLISTA
    // ===============================
    const pathParts = window.location.pathname.split('/');
    const productId = pathParts[pathParts.length - 1];

    if (!productId) return;

    // ===============================
    // 3️⃣ HAE TUOTETIEDOT
    // ===============================
    fetch(`/api/products/${productId}`)
        .then(res => {
            if (!res.ok) throw new Error("Tuotetta ei löytynyt");
            return res.json();
        })
        .then(product => {

            // Nimi & hinta
            document.getElementById('product-name').innerText = product.name;
            document.getElementById('product-price').innerText = product.price + " €";

            // Kuva
            const mainImg = document.getElementById('display-img');
            mainImg.src = product.image || "/images/placeholder.jpg";
            mainImg.alt = product.name;

            // Kuvaus
            document.getElementById('product-desc').innerText =
                product.description || "Ei kuvausta saatavilla.";

            // ===============================
            // 4️⃣ TEKNISET TIEDOT
            // ===============================
            const specsList = document.getElementById('product-specs');
            specsList.innerHTML = "";

            if (product.specs && product.specs.length > 0) {
                product.specs.forEach(spec => {
                    const li = document.createElement('li');
                    li.innerText = spec;
                    specsList.appendChild(li);
                });
            } else {
                specsList.innerHTML = "<li>Ei teknisiä tietoja</li>";
            }

            // ===============================
            // 5️⃣ LISÄKUVAT
            // ===============================
            const thumbContainer = document.getElementById('thumbnail-container');
            thumbContainer.innerHTML = "";

            if (product.images && product.images.length > 0) {
                product.images.forEach(img => {
                    const thumb = document.createElement('img');
                    thumb.src = img;
                    thumb.className = "thumbnail";
                    thumb.addEventListener('click', () => {
                        mainImg.src = img;
                    });
                    thumbContainer.appendChild(thumb);
                });
            }

        })
        .catch(err => {
            console.error(err);
            document.querySelector('.product-main').innerHTML =
                "<p>Tuotetta ei löytynyt tai tapahtui virhe.</p>";
        });
});
