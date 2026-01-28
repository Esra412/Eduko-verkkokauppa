const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware JSON-tietojen lukemiseen
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Istunnon (Session) asetukset
app.use(session({
    secret: 'eduko_salaisuus_2024',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 600000 } // Voimassa 10 minuuttia
}));

// --- SÄHKÖPOSTIN LÄHETTIMEN ASETUKSET ---
const lahetin = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
        user: 'kissakoira773@gmail.com',
        pass: 'utpmakzjcihjrvuf' 
    },
    tls: {
        rejectUnauthorized: false 
    }
});

// --- SIVUJEN REITIT ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views', 'pages', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'pages', 'login.html')));
app.get('/kategoria/:id', (req, res) => res.sendFile(path.join(__dirname, 'views', 'pages', 'category.html')));
app.get('/tuote/:id', (req, res) => res.sendFile(path.join(__dirname, 'views', 'pages', 'product-details.html')));

// --- API: KIRJAUTUMINEN JA KOODIN LÄHETYS ---
app.post('/api/login-step1', async (req, res) => {
    const { email, password } = req.body;
    
    // Admin-käyttäjän tarkistus
    if (email === "esra07bagdat@gmail.com" && password === "123456") {
        const vahvistuskoodi = Math.floor(100000 + Math.random() * 900000);
        req.session.pendingOtp = vahvistuskoodi;
        req.session.tempEmail = email;

const sahkopostiAsetukset = {
    from: '"Eduko Admin" <kissakoira773@gmail.com>',
    to: email,
    subject: "Vahvistuskoodi - Eduko Verkkokauppa",
    // Tekstiversio siltä varalta, että vastaanottajan laite ei näytä HTML:ää
    text: `Vahvistuskoodisi on: ${vahvistuskoodi}`, 
    html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 10px; overflow: hidden;">
        <div style="background-color: #b0a078; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Eduko Admin</h1>
        </div>
        <div style="padding: 30px; text-align: center; background-color: #ffffff;">
            <h2 style="color: #333;">Kirjautumisen vahvistus</h2>
            <p style="color: #666; font-size: 16px;">Olet kirjautumassa Eduko-verkkokaupan hallintapaneeliin. Käytä alla olevaa koodia vahvistaaksesi henkilöllisyytesi:</p>
            
            <div style="margin: 30px 0; padding: 20px; background-color: #f9f7f2; border-radius: 8px; display: inline-block;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #b0a078;">${vahvistuskoodi}</span>
            </div>
            
            <p style="color: #999; font-size: 12px; margin-top: 20px;">
                Tämä koodi on voimassa 10 minuuttia. Jos et ole yrittänyt kirjautua sisään, voit jättää tämän viestin huomiotta.
            </p>
        </div>
        <div style="background-color: #f4f4f4; padding: 15px; text-align: center; border-top: 1px solid #ddd;">
            <p style="color: #aaa; font-size: 12px; margin: 0;">&copy; 2026 Eduko Verkkokauppa - TIVI</p>
        </div>
    </div>
    `
};

        try {
            await lahetin.sendMail(sahkopostiAsetukset);
            console.log(`Koodi lähetetty onnistuneesti: ${vahvistuskoodi}`);
            res.json({ success: true, message: "Vahvistuskoodi lähetetty!" });
        } catch (error) {
            console.error("Sähköpostin lähetysvirhe:", error);
            res.status(500).json({ success: false, message: "Sähköpostia ei voitu lähettää: " + error.message });
        }
    } else {
        res.status(401).json({ success: false, message: "Väärä sähköpostiosoite tai salasana!" });
    }
});

// --- API: KOODIN VAHVISTUS ---
app.post('/api/verify-code', (req, res) => {
    const { code } = req.body;

    if (req.session.pendingOtp && code == req.session.pendingOtp) {
        req.session.isAdmin = true;
        delete req.session.pendingOtp; // Poistetaan koodi käytön jälkeen
        
        res.json({ 
            success: true, 
            message: "Kirjautuminen onnistui!", 
            redirect: '/' 
        });
    } else {
        res.status(400).json({ success: false, message: "Virheellinen tai vanhentunut koodi!" });
    }
});

app.listen(PORT, () => {
    console.log(`Palvelin käynnissä portissa:  http://localhost:${PORT}`);
});