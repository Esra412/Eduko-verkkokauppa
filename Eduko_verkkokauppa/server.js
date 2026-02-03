const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const session = require('express-session');
const axios = require('axios');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * TILAUSTEN HALLINTA
 * Huom: temporaryOrders säilyy vain palvelimen ollessa päällä.
 * Jos haluat pysyvän tallennuksen, ne tulisi kirjoittaa tietokantaan.
 */
let temporaryOrders = {};

// ================= MIDDLEWARET =================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'eduko_salaisuus_2024',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 3600000, 
        secure: false 
    }
}));

// ================= PAYTRAIL CONFIG =================
const PAYTRAIL_CONFIG = {
    merchantId: '375917', 
    secret: 'SAIPPUAKAUPPIAS', 
    apiEndpoint: 'https://services.paytrail.com'
};

function calculateHmac(secret, params, body = '') {
    const hmacPayload = Object.keys(params)
        .sort()
        .map((key) => `${key}:${params[key]}`)
        .concat(body ? JSON.stringify(body) : '')
        .join('\n');

    return crypto.createHmac('sha256', secret).update(hmacPayload).digest('hex');
}

// ================= EMAIL CONFIG =================
const lahetin = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: 'kissakoira773@gmail.com',
        pass: 'utpmakzjcihjrvuf' 
    },
    tls: { rejectUnauthorized: false }
});

// ================= AUTH MIDDLEWARE =================
function vaadiKirjautuminen(req, res, next) {
    if (req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ success: false, message: "Kirjaudu sisään" });
    }
}

// ================= SIVUJEN REITITYS =================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/pages/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views/pages/login.html')));
app.get('/admin', vaadiKirjautuminen, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/admin.html')));
app.get('/kategoria/:id', (req, res) => res.sendFile(path.join(__dirname, 'views/pages/category.html')));
app.get('/tuote/:id', (req, res) => res.sendFile(path.join(__dirname, 'views/pages/product-details.html')));
app.get('/tieto', (req, res) => res.sendFile(path.join(__dirname, 'views/pages/Tietoa_meista.html')));
app.get('/kori', (req, res) => res.sendFile(path.join(__dirname, 'views/pages/cart.html')));

// ================= MAKSUN PALUUREITIT =================

app.get('/success', async (req, res) => {
    const orderId = req.query.id;
    const order = temporaryOrders[orderId];

    if (order) {
        order.status = 'Maksettu'; // Päivitetään tila
        order.paymentDate = new Date().toLocaleString('fi-FI');

        const { customer, items, amount } = order;
        
        // Sähköpostien lähetys (kuten aiemmin)
        const tuotteetHtml = items.map(item => `<li>${item.name} - ${item.price} €</li>`).join('');
        const mailOptions = {
            from: '"Eduko" <kissakoira773@gmail.com>',
            to: customer.email,
            subject: `Tilausvahvistus ${orderId}`,
            html: `<h1>Kiitos!</h1><p>Tilaus ${orderId} maksettu.</p><ul>${tuotteetHtml}</ul>`
        };

        try {
            await lahetin.sendMail(mailOptions);
        } catch (e) { console.error("Email error", e); }
    }
    res.sendFile(path.join(__dirname, 'views/pages/success.html'));
});

app.get('/cancel', (req, res) => {
    res.send(`<h1>Maksu keskeytyi</h1><p>Voit yrittää uudelleen ostoskorista.</p><a href="/kori">Palaa ostoskoriin</a>`);
});

// ================= API REITIT =================

// PAYTRAIL: Maksun luominen
app.post('/api/paytrail/create-payment', async (req, res) => {
    const { items, amount, customer } = req.body;
    const mainStamp = `eduko-${Date.now()}`;

    // Tallennetaan tilaus muistiin odottamaan maksua
    temporaryOrders[mainStamp] = { 
        id: mainStamp,
        items, 
        amount, 
        customer, 
        status: 'Odottaa maksua',
        date: new Date().toLocaleString('fi-FI')
    };

    const body = {
        stamp: mainStamp,
        reference: mainStamp,
        amount: Math.round(amount * 100),
        currency: 'EUR',
        language: 'FI',
        items: items.map((item, index) => ({
            unitPrice: Math.round(parseFloat(item.price) * 100),
            units: 1,
            vatPercentage: 24,
            productCode: item.id ? item.id.toString() : `prod-${index}`,
            description: item.name.substring(0, 100)
        })),
        customer: { email: customer.email },
        redirectUrls: {
            success: `http://localhost:${PORT}/success?id=${mainStamp}`,
            cancel: `http://localhost:${PORT}/cancel`
        }
    };

    const headers = {
        'checkout-account': PAYTRAIL_CONFIG.merchantId,
        'checkout-algorithm': 'sha256',
        'checkout-method': 'POST',
        'checkout-nonce': crypto.randomBytes(16).toString('hex'),
        'checkout-timestamp': new Date().toISOString()
    };

    headers['signature'] = calculateHmac(PAYTRAIL_CONFIG.secret, headers, body);

    try {
        const response = await axios.post(`${PAYTRAIL_CONFIG.apiEndpoint}/payments`, body, { headers });
        res.json({ href: response.data.href });
    } catch (error) {
        console.error("Paytrail API virhe:", error.response?.data || error.message);
        res.status(500).json({ error: "Maksun luominen epäonnistui" });
    }
});

// ADMIN: Hae tilaukset
app.get('/api/admin/orders', vaadiKirjautuminen, (req, res) => {
    const ordersArray = Object.values(temporaryOrders).map(order => ({
        id: order.id,
        amount: order.amount,
        customer: order.customer, // Varmistetaan että customer-objekti on mukana
        items: order.items,
        status: order.status,
        date: order.date
    })).reverse();
    res.json(ordersArray);
});

// ADMIN: Hae tuotteet hallintaa varten
app.get('/api/admin/products', vaadiKirjautuminen, (req, res) => {
    db.query("SELECT id, name, price FROM products ORDER BY id DESC", (err, results) => {
        if (err) return res.status(500).json({ error: "Tietokantavirhe" });
        res.json(results);
    });
});

// TUOTTEET: Julkiset reitit
app.get('/api/products', (req, res) => {
    const categoryParam = req.query.category;
    let sql = !isNaN(categoryParam) 
        ? "SELECT * FROM products WHERE category_id = ? ORDER BY id DESC" 
        : "SELECT p.* FROM products p JOIN categories c ON p.category_id = c.id WHERE c.slug = ? ORDER BY p.id DESC";

    db.query(sql, [categoryParam], (err, results) => {
        if (err) return res.status(500).json({ error: "Tietokantavirhe" });
        res.json(results);
    });
});

app.get('/api/products/latest', (req, res) => {
    db.query("SELECT * FROM products ORDER BY created_at DESC LIMIT 15", (err, results) => {
        if (err) return res.status(500).json({ error: "Tietokantavirhe" });
        res.json(results);
    });
});

app.get('/api/products/:id', (req, res) => {
    db.query("SELECT * FROM products WHERE id = ?", [req.params.id], (err, results) => {
        if (err || results.length === 0) return res.status(404).json({ error: "Ei löydy" });
        res.json(results[0]);
    });
});

// ADMIN: Tuotteen lisäys
app.post('/api/products', vaadiKirjautuminen, (req, res) => {
    const { name, description, price, image, category_id, specs, images, stock, pickup_point, type } = req.body;
    const sql = `INSERT INTO products (name, description, price, image, category_id, specs, images, stock, pickup_point, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [name, description, price, image, category_id, specs, images, stock, pickup_point, type], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, id: result.insertId });
    });
});

// ADMIN: Tuotteen poisto
app.delete('/api/products/:id', vaadiKirjautuminen, (req, res) => {
    db.query("DELETE FROM products WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

// ================= ADMIN KIRJAUTUMINEN (OTP) =================

app.post('/api/login-step1', async (req, res) => {
    const { email, password } = req.body;
    if (email === "esra07bagdat@gmail.com" && password === "123456") {
        const vahvistuskoodi = Math.floor(100000 + Math.random() * 900000);
        req.session.pendingOtp = vahvistuskoodi;
        try {
            await lahetin.sendMail({
                from: '"Eduko Admin" <kissakoira773@gmail.com>',
                to: email,
                subject: "Vahvistuskoodi - Eduko",
                html: `<div style="padding:20px; border:1px solid #ddd;"><h1>Vahvistuskoodisi: ${vahvistuskoodi}</h1></div>`
            });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, message: "Email virhe" });
        }
    } else {
        res.status(401).json({ success: false, message: "Väärät tunnukset" });
    }
});

app.post('/api/verify-code', (req, res) => {
    if (req.body.code && req.body.code == req.session.pendingOtp) {
        req.session.isAdmin = true; 
        delete req.session.pendingOtp;
        req.session.save(() => res.json({ success: true, redirect: '/admin' }));
    } else {
        res.status(400).json({ success: false, message: "Väärä koodi" });
    }
});

app.listen(PORT, () => console.log(`✅ Serveri käynnissä: http://localhost:${PORT}`));