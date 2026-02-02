document.addEventListener('DOMContentLoaded', () => {

    // ===============================
    // 1️⃣ TABS LOGIIKKA
    // ===============================
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.target;

            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));

            button.classList.add('active');
            const targetPane = document.getElementById(targetId);
            if (targetPane) {
                targetPane.classList.add('active');
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
            // Perustiedot
            document.getElementById('product-name').innerText = product.name;
            document.getElementById('product-price').innerText = product.price + " €";
            document.getElementById('product-desc').innerText = product.description || "Ei kuvausta.";

            // Pääkuva
            const mainImg = document.getElementById('display-img');
            mainImg.src = product.image || "/images/placeholder.jpg";

            // ===============================
            // 4️⃣ VARASTO JA NOUTOPISTE (Dynaaminen)
            // ===============================
            // Luodaan meta-tiedot ja lisätään ne kuvauksen perään
            const noutopiste = product.pickup_point || "Ei määritelty";
            const varastossa = product.stock !== undefined ? product.stock : "0";

            const metaDiv = document.createElement('div');
            metaDiv.className = "product-meta";
            metaDiv.style.marginTop = "20px";
            metaDiv.style.borderTop = "1px solid #ddd";
            metaDiv.style.paddingTop = "10px";
            metaDiv.innerHTML = `
                <p><strong>📦 Varastossa:</strong> ${varastossa} kpl</p>
                <p><strong>📍 Noutopiste:</strong> ${noutopiste}</p>
            `;
            document.getElementById('product-desc').appendChild(metaDiv);

            // ===============================
            // 5️⃣ TEKNISET TIEDOT
            // ===============================
            const specsList = document.getElementById('product-specs');
            specsList.innerHTML = "";

            if (product.specs && typeof product.specs === 'string' && product.specs.trim() !== "") {
                const specsArray = product.specs.split(',');
                specsArray.forEach(item => {
                    const li = document.createElement('li');
                    li.innerText = item.trim();
                    specsList.appendChild(li);
                });
            } else {
                specsList.innerHTML = "<li>Ei teknisiä tietoja saatavilla</li>";
            }

            // ===============================
            // 6️⃣ KUVAT-VÄLILEHTI (Galleria)
            // ===============================
            const thumbContainer = document.getElementById('thumbnail-container');
            thumbContainer.innerHTML = "";

            let allImages = [];

            // Lisätään pääkuva pikkukuvien joukkoon ensimmäiseksi
            if (product.image) allImages.push(product.image);

            // Lisätään lisäkuvat JSON-kentästä
            if (product.images) {
                try {
                    const extraImages = typeof product.images === 'string' ? JSON.parse(product.images) : product.images;
                    if (Array.isArray(extraImages)) {
                        allImages = allImages.concat(extraImages);
                    }
                } catch (e) {
                    console.error("Virhe lisäkuvien käsittelyssä:", e);
                }
            }

            // Luodaan pikkukuvat
            allImages.forEach(imgUrl => {
                const thumb = document.createElement('img');
                thumb.src = imgUrl;
                thumb.className = "thumbnail";
                
                thumb.addEventListener('click', () => {
                    // Tarkistetaan nykyinen kuva (käytetään URL-polkua vertailuun)
                    const currentPath = new URL(mainImg.src, window.location.origin).pathname;
                    const newPath = new URL(imgUrl, window.location.origin).pathname;

                    if (currentPath === newPath) return;

                    // Vaihtoanimaatio
                    mainImg.style.opacity = "0";
                    setTimeout(() => {
                        mainImg.src = imgUrl;
                        mainImg.style.opacity = "1";
                    }, 150);
                });

                thumbContainer.appendChild(thumb);
            });

        })
        .catch(err => {
            console.error(err);
            const mainContainer = document.querySelector('.product-main');
            if (mainContainer) {
                mainContainer.innerHTML = "<p>Tuotetietojen haku epäonnistui.</p>";
            }
        });
});