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

app.get('/success', (req, res) => {
    const orderId = req.query.id;

    // Päivitä DB
    db.query(
        `UPDATE orders SET status = 'Maksettu' WHERE id = ?`,
        [orderId],
        (err) => {
            if (err) console.error(err);
        }
    );

    // Hae tilaus DB:stä sähköpostia varten
    db.query(
        `SELECT * FROM orders WHERE id = ?`,
        [orderId],
        async (err, results) => {
            if (!err && results.length > 0) {
                const order = results[0];
                const items = JSON.parse(order.items);

                const tuotteetHtml = items
                    .map(i => `<li>${i.name} - ${i.price} €</li>`)
                    .join('');

                try {
                    // 1. VIESTI ASIAKKAALLE

                await lahetin.sendMail({
                    from: '"Eduko Verkkokauppa" <kissakoira773@gmail.com>',
                    to: order.customer_email,
                    subject: `Tilausvahvistus - ${orderId}`,
                    html: `
                        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
                            <div style="background-color: #b0a078; padding: 20px; text-align: center;">
                                <h1 style="color: white; margin: 0; letter-spacing: 2px; text-transform: uppercase; font-size: 24px;">Eduko</h1>
                            </div>
                            
                            <div style="padding: 30px; line-height: 1.6; color: #333;">
                                <h2 style="color: #b0a078; border-bottom: 2px solid #f4f1ea; padding-bottom: 10px;">Kiitos tilauksestasi!</h2>
                                <p>Hei <strong>${order.customer_name}</strong>,</p>
                                <p>Olemme vastaanottaneet maksusi. Tilaus on nyt käsittelyssä ja postitetaan sinulle pian.</p>
                                
                                <div style="background-color: #fdfaf3; padding: 15px; border-radius: 5px; margin: 20px 0;">
                                    <p style="margin: 0;"><strong>Tilausnumero:</strong> #${orderId}</p>
                                    <p style="margin: 0;"><strong>Tilauspäivä:</strong> ${new Date().toLocaleDateString('fi-FI')}</p>
                                </div>

                                <h3 style="font-size: 16px; text-transform: uppercase; color: #777;">Tilatut tuotteet</h3>
                                <ul style="list-style: none; padding: 0;">
                                    ${items.map(i => `
                                        <li style="padding: 10px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between;">
                                            <span>${i.name}</span>
                                            <strong style="float: right;">${parseFloat(i.price).toFixed(2)} €</strong>
                                        </li>
                                    `).join('')}
                                </ul>

                                <div style="text-align: right; margin-top: 20px;">
                                    <p style="font-size: 18px;"><strong>Yhteensä: ${order.amount} €</strong></p>
                                </div>

                                <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;">
                                
                                <p style="font-size: 12px; color: #888; text-align: center;">
                                    Tämä on automaattinen viesti, johon ei voi vastata.<br>
                                    Eduko Verkkokauppa | Kouvola
                                </p>
                            </div>
                        </div>
                    `
                });

                    // 2. VIESTI ADMINILLE (Uusi lisäys)
                    await lahetin.sendMail({
                        from: '"Eduko Järjestelmä" <kissakoira773@gmail.com>',
                        to: 'esra07bagdat@gmail.com', // Sinun sähköpostisi
                        subject: `UUSI TILAUS: ${order.customer_name}`,
                        html: `
                            <div style="font-family: sans-serif; border: 2px solid #b0a078; padding: 20px;">
                                <h2 style="color: #b0a078;">Uusi tilaus vastaanotettu!</h2>
                                <p><strong>Tilausnumero:</strong> ${orderId}</p>
                                <p><strong>Asiakas:</strong> ${order.customer_name}</p>
                                <p><strong>Sähköposti:</strong> ${order.customer_email}</p>
                                <p><strong>Summa:</strong> ${order.amount} €</p>
                                <hr>
                                <h3>Tilatut tuotteet:</h3>
                                <ul>${tuotteetHtml}</ul>
                                <br>
                                <a href="http://localhost:${PORT}" style="background: #b0a078; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Hallitse tilauksia</a>
                            </div>
                        `
                    });

                } catch (e) {
                    console.error("Sähköpostivirhe:", e);
                }
            }
        }
    );

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
    const fullName = `${customer.fname} ${customer.lname}`.trim()

    // Tallennetaan tilaus muistiin odottamaan maksua
    temporaryOrders[mainStamp] = { 
        id: mainStamp,
        items, 
        amount, 
        customer, 
        status: 'Odottaa maksua',
        date: new Date().toLocaleString('fi-FI')
    };

db.query(
  `INSERT INTO orders 
   (id, customer_email, customer_name, customer_phone, customer_address, customer_postcode, customer_city, items, amount, status)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [
    mainStamp,
    customer.email,
    fullName,
    customer.phone || '',
    customer.address || '',
    customer.postcode || '',
    customer.city || '',
    JSON.stringify(items),
    amount,
    'Odottaa maksua'
  ],
  (err) => {
    if (err) console.error("DB tilaus virhe:", err);
  }
);


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
    db.query('SELECT * FROM orders ORDER BY created_at DESC', (err, results) => {
        if (err) return res.status(500).json({ error: 'DB error' });

        const orders = results.map(o => ({
            id: o.id,
            amount: o.amount,
            status: o.status,
            items: JSON.parse(o.items),
            customer: {
                fname: o.customer_name || 'Ei nimeä',
                email: o.customer_email,
                phone: o.customer_phone,
                // Yhdistetään osoitetiedot yhdeksi merkkijonoksi
                address: `${o.customer_address || ''}, ${o.customer_postcode || ''} ${o.customer_city || ''}`
            }
        }));
        res.json(orders);
    });
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
                subject: "Kirjautumisen vahvistuskoodi - Eduko",
                html: `
                    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 500px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden; text-align: center;">
                        <div style="background-color: #333; padding: 20px;">
                            <h1 style="color: #b0a078; margin: 0; letter-spacing: 2px; text-transform: uppercase; font-size: 20px;">Eduko Admin</h1>
                        </div>
                        
                        <div style="padding: 40px; background-color: #fff;">
                            <p style="color: #666; font-size: 16px;">Käytä alla olevaa koodia kirjautuaksesi hallintapaneeliin:</p>
                            
                            <div style="margin: 30px auto; padding: 15px; background-color: #fdfaf3; border: 2px dashed #b0a078; display: inline-block;">
                                <span style="font-size: 32px; font-weight: bold; letter-spacing: 10px; color: #333;">${vahvistuskoodi}</span>
                            </div>
                            
                            <p style="color: #999; font-size: 12px; margin-top: 30px;">
                                Jos et yrittänyt kirjautua, voit jättää tämän viestin huomioimatta.<br>
                                Koodi on voimassa vain kuluvan istunnon ajan.
                            </p>
                        </div>
                    </div>
                `
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