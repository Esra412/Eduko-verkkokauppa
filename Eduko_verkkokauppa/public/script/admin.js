let products = JSON.parse(localStorage.getItem("products")) || [];

const addProductForm = document.getElementById("addProductForm");
const productList = document.getElementById("productList");
const searchBtn = document.getElementById("searchBtn");

function saveProducts() {
  localStorage.setItem("products", JSON.stringify(products));
}

function renderProducts(filter = "") {
  productList.innerHTML = "";
  products
    .filter(p => p.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `
        ${p.name} (${p.price} €)
        <button class="delete-btn" onclick="deleteProduct(${i})">🗑</button>
      `;
      productList.appendChild(li);
    });
}

function deleteProduct(index) {
  if (!confirm("Poistetaanko?")) return;
  products.splice(index, 1);
  saveProducts();
  renderProducts();
}

addProductForm.addEventListener("submit", e => {
  e.preventDefault();
  const fd = new FormData(addProductForm);

  products.push({
    name: fd.get("name"),
    description: fd.get("description"),
    price: fd.get("price"),
    specs: fd.get("specs"),
    category: fd.get("category"),
    type: fd.get("type")
  });

  saveProducts();
  renderProducts();
  addProductForm.reset();
});

searchBtn.addEventListener("click", () => {
  const val = document.getElementById("searchProduct").value;
  renderProducts(val);
});

// mock tilaus
const orders = [
  {
    orderNumber: 1001,
    name: "Matti Meikäläinen",
    phone: "0401234567",
    email: "matti@testi.fi",
    date: "2026-01-15 14:32",
    items: [{ name: "Arduino Uno", qty: 1, price: 25 }]
  }
];

const orderList = document.getElementById("orderList");

orders.forEach((o) => {
  const li = document.createElement("li");
  li.textContent = `${o.name} – #${o.orderNumber}`;
  li.onclick = () => {
    document.getElementById("orderNumber").textContent = o.orderNumber;
    document.getElementById("orderName").textContent = o.name;
    document.getElementById("orderPhone").textContent = o.phone;
    document.getElementById("orderEmail").textContent = o.email;
    document.getElementById("orderDate").textContent = o.date;

    const tbody = document.getElementById("orderItems");
    tbody.innerHTML = "";
    o.items.forEach(it => {
      tbody.innerHTML += `<tr><td>${it.name}</td><td>${it.qty}</td><td>${it.price}€</td></tr>`;
    });

    document.getElementById("orderDetails").classList.remove("hidden");
  };
  orderList.appendChild(li);
});

renderProducts();
