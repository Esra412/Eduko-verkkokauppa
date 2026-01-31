const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const session = require('express-session');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewaret
app.use(express.json({ limit: '50mb' })); // Sallitaan suuret Base64-kuvat
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Istunnon hallinta
app.use(session({
    secret: 'eduko_salaisuus_2024',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 600000, // 10 minuuttia
        secure: false   // Aseta true, jos käytät HTTPS:ää
    }
}));

// ================= EMAIL CONFIG =================
const lahetin = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: 'kissakoira773@gmail.com',
        pass: 'utpmakzjcihjrvuf' // Huom: Käytä mieluummin ympäristömuuttujia (process.env)
    },
    tls: { rejectUnauthorized: false }
});

// ================= AUTH MIDDLEWARE =================
function vaadiKirjautuminen(req, res, next) {
    console.log("Tarkistetaan istunto:", req.session); // Lisää tämä
    if (req.session.isAdmin) {
        console.log("✅ Pääsy sallittu");
        next();
    } else {
        console.log("❌ Pääsy evätty: isAdmin puuttuu");
        res.status(401).json({ success: false, message: "Kirjaudu sisään" });
    }
}

// ================= SIVUJEN REITITYS =================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/pages/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views/pages/login.html')));
app.get('/admin', vaadiKirjautuminen, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/admin.html')));
app.get('/kategoria/:id', (req, res) => res.sendFile(path.join(__dirname, 'views/pages/category.html')));
app.get('/tuote/:id', (req, res) => res.sendFile(path.join(__dirname, 'views/pages/product-details.html')));

// ================= API REITIT =================

// 🔹 Hae 15 uusinta tuotetta (Etusivulle)
app.get('/api/products/latest', (req, res) => {
    db.query("SELECT * FROM products ORDER BY created_at DESC LIMIT 15", (err, results) => {
        if (err) return res.status(500).json({ error: "Tietokantavirhe" });
        res.json(results);
    });
});

// 🔹 Hae kaikki tuotteet (Admin-paneelin listaukseen)
app.get('/api/admin/products', vaadiKirjautuminen, (req, res) => {
    db.query("SELECT id, name, price, category_id FROM products ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).json({ error: "Tietokantavirhe" });
        res.json(results);
    });
});

// 🔹 Lisää uusi tuote
app.post('/api/products', vaadiKirjautuminen, (req, res) => {
    const { name, description, price, image, category_id } = req.body;
    const sql = `INSERT INTO products (name, description, price, image, category_id) VALUES (?, ?, ?, ?, ?)`;
    
    db.query(sql, [name, description, price, image, category_id], (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true, id: result.insertId });
    });
});

// 🔹 Poista tuote
app.delete('/api/products/:id', vaadiKirjautuminen, (req, res) => {
    db.query("DELETE FROM products WHERE id = ?", [req.params.id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true });
    });
});

// 🔹 Hae tuote ID:llä
app.get('/api/products/:id', (req, res) => {
    db.query("SELECT * FROM products WHERE id = ?", [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: "Tietokantavirhe" });
        if (results.length === 0) return res.status(404).json({ error: "Tuotetta ei löydy" });
        res.json(results[0]);
    });
});

// ================= KIRJAUTUMISLOGIIKKA =================

app.post('/api/login-step1', async (req, res) => {
    const { email, password } = req.body;

    if (email === "esra07bagdat@gmail.com" && password === "123456") {
        const vahvistuskoodi = Math.floor(100000 + Math.random() * 900000);
        req.session.pendingOtp = vahvistuskoodi;

        try {
            await lahetin.sendMail({
                from: '"Eduko Admin" <kissakoira773@gmail.com>',
                to: email,
                subject: "Vahvistuskoodi - Eduko Verkkokauppa",
                html: `
                <div style="font-family: Arial; border: 1px solid #ddd; padding: 20px; border-radius: 10px;">
                    <h2 style="color: #b0a078;">Eduko Admin - Vahvistuskoodi</h2>
                    <p>Käytä alla olevaa koodia kirjautuaksesi hallintapaneeliin:</p>
                    <div style="font-size: 32px; font-weight: bold; color: #b0a078; letter-spacing: 5px;">${vahvistuskoodi}</div>
                    <p style="color: #999;">Koodi vanhenee 10 minuutissa.</p>
                </div>`
            });
            res.json({ success: true });
        } catch (error) {
            console.error("Sähköpostivirhe:", error);
            res.status(500).json({ success: false, message: "Sähköpostin lähetys epäonnistui" });
        }
    } else {
        res.status(401).json({ success: false, message: "Väärä sähköposti tai salasana" });
    }
});

app.post('/api/verify-code', (req, res) => {
    if (req.body.code && req.body.code == req.session.pendingOtp) {
        req.session.isAdmin = true;
        delete req.session.pendingOtp; // Poistetaan koodi käytön jälkeen
        res.json({ success: true, redirect: '/admin' });
    } else {
        res.status(400).json({ success: false, message: "Väärä koodi" });
    }
});

// Käynnistys
app.listen(PORT, () => console.log(`✅ Server käynnissä: http://localhost:${PORT}`));