const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const session = require('express-session');
const axios = require('axios');
const crypto = require('crypto');
const db = require('./db');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' }); // Määrittää minne kuvat tallennetaan väliaikaisesti

const app = express();
const PORT = process.env.PORT || 3000;

function ensureProductAltColumns() {
    const wantedColumns = ['image_alt_fi', 'image_alt_sv', 'image_alt_en'];

    // Joissain MySQL-ajureissa parametrisoitu IN (?) ei laajennu odotetusti
    // joten haetaan sarakkeet ilman WHERE-ehdoa ja suoritetaan vertailu Javassa.
    db.query("SHOW COLUMNS FROM products", (err, rows) => {
        if (err) {
            console.error('Alt-tekstikenttien tarkistus epäonnistui:', err);
            return;
        }

        const existing = new Set((rows || []).map((row) => row.Field));
        const missing = wantedColumns.filter((column) => !existing.has(column));
        if (missing.length === 0) return;

        const additions = missing.map((column) => `ADD COLUMN ${column} TEXT DEFAULT NULL`).join(', ');
        db.query(`ALTER TABLE products ${additions}`, (alterErr) => {
            if (alterErr) {
                console.error('Alt-tekstikenttien lisäys epäonnistui:', alterErr);
                return;
            }
            console.log(`Lisättiin tuotteiden alt-tekstikentät: ${missing.join(', ')}`);
        });
    });
}

ensureProductAltColumns();


// Vastuuhenkilöiden tiedot kategorioittain (ID on avain)
const vastuuhenkilot = {
    "3": { nimi: "Esra bagdat", email: "esra07bagdat@gmail.com", puh: "040 345 6789" },
    "4": { nimi: "Lauri Lastaus", email: "lauri.logistiikka@eduko.fi", puh: "040 456 7890" },
    "7": { nimi: "Risto Rakentaja", email: "risto.raksa@eduko.fi", puh: "040 789 0123" }
};
const oletusHenkilo = { nimi: "Eduko Asiakaspalvelu", email: "info@eduko.fi", puh: "020 61511" };

/**
 * TILAUSTEN HALLINTA
 * Huom: temporaryOrders säilyy vain palvelimen ollessa päällä.
 * Jos haluat pysyvän tallennuksen, ne tulisi kirjoittaa tietokantaan.
 */
let temporaryOrders = {};

// ================= MIDDLEWARET =================
// HUOM: JSON/URLencoded middlewaret POISTETTU koska ne rikkovat multipart/form-data
// Lisätään vain APIreiteille jotka tarvitsevat ne (POS T/PUT/GET JSON-dataa ilman kuvia)

// TÄRKEÄ: Jätä static middleware myöhemmäksi, jotta API-reitit käsitellään ensin!

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

function calculateHmac(secret, params, body) {
    const payloadLines = Object.keys(params)
        .sort()
        .map((key) => `${key}:${params[key]}`);

    if (body !== undefined && body !== null) {
        payloadLines.push(JSON.stringify(body));
    }

    return crypto.createHmac('sha256', secret).update(payloadLines.join('\n')).digest('hex');
}

async function verifyPaytrailPayment(stamp) {
    const headers = {
        'checkout-account': PAYTRAIL_CONFIG.merchantId,
        'checkout-algorithm': 'sha256',
        'checkout-method': 'GET',
        'checkout-nonce': crypto.randomBytes(16).toString('hex'),
        'checkout-timestamp': new Date().toISOString()
    };
    headers['checkout-signature'] = calculateHmac(PAYTRAIL_CONFIG.secret, headers);

    try {
        const response = await axios.get(`${PAYTRAIL_CONFIG.apiEndpoint}/payments/${encodeURIComponent(stamp)}`, {
            headers
        });
        return response.data;
    } catch (err) {
        if (err.response) {
            console.error('Paytrail verification response error:', err.response.status, err.response.data);
            const message = err.response.data?.message || err.response.data?.status || err.response.status;
            throw new Error(`Paytrail verify failed: ${message}`);
        }
        throw err;
    }
}

// === JSON/URLencoded middlewaret VAIN tälle reitille ===
app.use('/api/paytrail', express.json({ limit: '50mb' }));
app.use('/api/paytrail', express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/verkkokauppa/api/paytrail', express.json({ limit: '50mb' }));
app.use('/verkkokauppa/api/paytrail', express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/login-step1', express.json({ limit: '50mb' }));
app.use('/api/login-step1', express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/verkkokauppa/api/login-step1', express.json({ limit: '50mb' }));
app.use('/verkkokauppa/api/login-step1', express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/api/verify-code', express.json({ limit: '50mb' }));
app.use('/api/verify-code', express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/verkkokauppa/api/verify-code', express.json({ limit: '50mb' }));
app.use('/verkkokauppa/api/verify-code', express.urlencoded({ extended: true, limit: '50mb' }));

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
        res.status(401).json({ success: false, message: "Admin sisään" });
    }
}

// ================= SIVUJEN REITITYS =================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'views/pages/index.html')));
app.get(``, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/index.html')));

// Korjattu login-ohjaus
/*app.get('/login', (req,res)=>{
    res.redirect(`/login`);
});*/

app.get(`/login`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/login.html')));
// Alias reitti /verkkokauppa/login
app.get(`/verkkokauppa/login`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/login.html')));

// Alias reitti /verkkokauppa juureen
app.get(`/verkkokauppa`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/index.html')));

app.get(`/kaupan-takahuone`, vaadiKirjautuminen, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/admin.html')));
// Alias reitti /verkkokauppa/kaupan-takahuone
app.get(`/verkkokauppa/kaupan-takahuone`, vaadiKirjautuminen, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/admin.html')));
app.get(`/kategoria/:id`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/category.html')));
// Alias reitti /verkkokauppa/kategoria/:id
app.get(`/verkkokauppa/kategoria/:id`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/category.html')));
app.get(`/tuote/:id`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/product-details.html')));
// Alias reitti /verkkokauppa/tuote/:id
app.get(`/verkkokauppa/tuote/:id`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/product-details.html')));
app.get(`/tieto`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/Tietoa_meista.html')));
app.get(`/verkkokauppa/tieto`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/Tietoa_meista.html')));
app.get(`/miten-ostat`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/how-to-buy.html')));
app.get(`/verkkokauppa/miten-ostat`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/how-to-buy.html')));
app.get(`/myyntipalvelut`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/sales-services.html')));
app.get(`/verkkokauppa/myyntipalvelut`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/sales-services.html')));
app.get(`/kori`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/cart.html')));
// Alias reitti /verkkokauppa/kori
app.get(`/verkkokauppa/kori`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/cart.html')));

app.all('/error', (req, res) => {
    res.status(500).sendFile(path.join(__dirname, 'views/pages/error.html'));
});
app.all('/error/', (req, res) => {
    res.status(500).sendFile(path.join(__dirname, 'views/pages/error.html'));
});
app.all('/verkkokauppa/error', (req, res) => {
    res.status(500).sendFile(path.join(__dirname, 'views/pages/error.html'));
});
app.all('/verkkokauppa/error/', (req, res) => {
    res.status(500).sendFile(path.join(__dirname, 'views/pages/error.html'));
});

// ================= MAKSUN PALUUREITIT =================

async function handleSuccessPage(req, res) {
    const orderId = req.query.id;

    db.query(`SELECT * FROM orders WHERE id = ?`, [orderId], async (err, results) => {
        if (err || results.length === 0) return res.sendFile(path.join(__dirname, 'views/pages/success.html'));

        const order = results[0];
        const items = JSON.parse(order.items);
        const itemIds = items.map(i => i.id);

        let paymentConfirmed = false;
        let paymentVerifyFallback = false;
        try {
            const paymentData = await verifyPaytrailPayment(orderId);
            const paytrailStatus = paymentData?.status || paymentData?.payment?.status;
            paymentConfirmed = paytrailStatus === 'PAID';
            if (!paymentConfirmed) {
                console.warn(`Paytrail-maksua ei vahvistettu tilaukselle ${orderId}. Status:`, paytrailStatus, paymentData);
            }
        } catch (verifyErr) {
            const invalidTransaction = verifyErr.message?.includes('Invalid transaction ID') ||
                verifyErr.message?.includes('400');
            if (invalidTransaction) {
                console.warn(`Paytrail-maksun vahvistus epäonnistui tilaukselle ${orderId} invalid transaction ID -virheestä. Käytetään fallback-päivitystä success-reitillä.`);
                paymentVerifyFallback = true;
            } else {
                console.error(`Paytrail-maksun vahvistus epäonnistui tilaukselle ${orderId}:`, verifyErr?.message || verifyErr);
            }
        }

        const shouldUpdateStock = (paymentConfirmed || paymentVerifyFallback) && order.status !== 'Maksettu';
        if (shouldUpdateStock) {
            db.query(`UPDATE orders SET status = 'Maksettu' WHERE id = ?`, [orderId], (updateErr) => {
                if (updateErr) console.error("Tietokantavirhe (status):", updateErr);
            });

            // Vähennä stock määrät ja tarkista loppuminen
            for (const item of items) {
                const quantity = item.quantity || 1;
                db.query(`UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?`, 
                    [quantity, item.id, quantity], (stockErr, stockResult) => {
                    if (stockErr) {
                        console.error(`Virhe tuotteen ${item.id} stock päivityksessä:`, stockErr);
                        return;
                    }

                    if (stockResult.affectedRows === 0) {
                        console.warn(`Tuotteen ${item.id} stockia ei päivitetty, mahdollisesti varastoa ei riitä.`);
                        return;
                    }

                    // Tarkista uusi stock määrä
                    db.query(`SELECT stock, name_fi, category_id FROM products WHERE id = ?`, [item.id], async (stockCheckErr, stockResults) => {
                        if (stockCheckErr || stockResults.length === 0) return;

                        const newStock = stockResults[0].stock;
                        const productName = stockResults[0].name_fi;
                        const categoryId = stockResults[0].category_id;

                        // Jos stock on 1 tai vähemmän, lähetä sähköposti vastuuhenkilölle
                        if (newStock <= 1) {
                            const v = vastuuhenkilot[String(categoryId)] || oletusHenkilo;
                            try {
                                await lahetin.sendMail({
                                    from: '"Eduko Varastojärjestelmä" <kissakoira773@gmail.com>',
                                    to: v.email,
                                    subject: `TUOTE LOPPUMASSA - ${productName}`,
                                    html: `
                                        <div style="font-family: sans-serif; border: 2px solid #ff4444; padding: 20px;">
                                            <h2 style="color: #ff4444;">⚠️ TUOTE LOPPUMASSA</h2>
                                            <p><strong>Tuote:</strong> ${productName}</p>
                                            <p><strong>Jäljellä oleva määrä:</strong> ${newStock} kpl</p>
                                            <p>Tuote on loppumassa varastosta. Harkitse uuden erän tilaamista.</p>
                                            <hr>
                                            <p style="font-size: 12px; color: #666;">
                                                Tämä on automaattinen ilmoitus Eduko-järjestelmästä.
                                            </p>
                                        </div>`
                                });
                                console.log(`Sähköposti lähetetty vastuuhenkilölle ${v.email} tuotteen ${productName} loppumisesta`);
                            } catch (mailError) {
                                console.error(`Sähköpostin lähetys epäonnistui tuotteen ${productName} loppumisesta:`, mailError);
                            }
                        }
                    });
                });
            }
        }

        if (!shouldUpdateStock) {
            if (!paymentConfirmed) {
                console.log(`Order ${orderId} ei ole vielä vahvistetusti maksettu, stockia ei jätettiin muuttamatta.`);
            } else {
                console.log(`Order ${orderId} on jo maksettu, stockia ei päivitetty uudelleen.`);
            }
        }

        db.query(`SELECT id, category_id, name_fi FROM products WHERE id IN (?)`, [itemIds], async (pErr, pRes) => {
            let vastuuhenkiloBlokitHtml = "";
            let vastuuhenkiloEmailit = new Set();

            if (!pErr && pRes.length > 0) {
                pRes.forEach(tuote => {
                    const catId = String(tuote.category_id);
                    const v = vastuuhenkilot[catId] || oletusHenkilo;
                    vastuuhenkiloEmailit.add(v.email);

                    vastuuhenkiloBlokitHtml += `
                        <div style="margin-bottom: 15px; padding: 10px; border-left: 4px solid #b0a078; background: #fafafa;">
                            <p style="margin: 0; font-weight: bold;">${tuote.name_fi} - vastuuhenkilö:</p>
                            <p style="margin: 5px 0 0 0;">${v.nimi} | ${v.email} | ${v.puh}</p>
                        </div>`;
                });
            }

            try {
                await lahetin.sendMail({
                    from: '"Eduko Verkkokauppa" <kissakoira773@gmail.com>',
                    to: order.customer_email,
                    subject: `Tilausvahvistus - Tilausnumero: ${orderId}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                            <div style="background-color: #b0a078; padding: 20px; text-align: center; color: white;">
                                <h1 style="margin: 0;">EDUKO</h1>
                                <p style="margin: 5px 0 0 0;">TILAUSNUMERO: ${orderId}</p>
                            </div>
                            <div style="padding: 25px; color: #333;">
                                <h2>Kiitos tilauksestasi, ${order.customer_name}!</h2>
                                <p>Olemme vastaanottaneet maksun ja tilauksesi on nyt käsittelyssä.</p>
                                <h3 style="border-bottom: 2px solid #f4f1ea; padding-bottom: 8px;">Tilatut tuotteet:</h3>
                                <table style="width: 100%; border-collapse: collapse;">
                                    ${items.map(i => `
                                        <tr>
                                            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">${i.name}</td>
                                            <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;"><strong>${parseFloat(i.price).toFixed(2)} €</strong></td>
                                        </tr>
                                    `).join('')}
                                </table>
                                <p style="text-align: right; font-size: 18px;"><strong>Yhteensä: ${order.amount} €</strong></p>
                                <div style="margin-top: 40px; padding: 20px; border: 1px solid #b0a078; border-radius: 5px;">
                                    <h3 style="margin-top: 0; color: #b0a078;">Nouto-ohjeet ja yhteystiedot</h3>
                                    <p>Ota yhteyttä alla oleviin vastuuhenkilöihin sopiaksesi tuotteiden noudosta:</p>
                                    ${vastuuhenkiloBlokitHtml}
                                    <p style="font-size: 12px; color: #666; margin-top: 15px;">
                                        Huom: Tuotteet noudetaan Edukon toimipisteistä vastuuhenkilön kanssa sovittuna ajankohtana.
                                    </p>
                                </div>
                                <div style="text-align: center; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; color: #888; font-size: 12px;">
                                    <p>Eduko Verkkokauppa | Kouvola</p>
                                    <p>Tämä on automaattinen vahvistusviesti.</p>
                                </div>
                            </div>
                        </div>`
                });

                if (vastuuhenkiloEmailit.size > 0) {
                    await lahetin.sendMail({
                        from: '"Eduko Tilausjärjestelmä" <kissakoira773@gmail.com>',
                        to: Array.from(vastuuhenkiloEmailit).join(', '),
                        subject: `UUSI TILAUS #${orderId} - Toimenpiteitä vaaditaan`,
                        html: `
                            <div style="font-family: sans-serif; border: 2px solid #b0a078; padding: 20px;">
                                <h2>Hei, osastoltasi on tilattu tuote!</h2>
                                <p><strong>Tilausnumero:</strong> #${orderId}</p>
                                <p><strong>Asiakas:</strong> ${order.customer_name} (${order.customer_email})</p>
                                <hr>
                                <h3>Tilauksen sisältö:</h3>
                                ${vastuuhenkiloBlokitHtml}
                                <p>Olkaa yhteydessä asiakkaaseen noudon sopimiseksi.</p>
                            </div>`
                    });
                }

                console.log("Sähköpostit lähetetty vastuuhenkilöille:", Array.from(vastuuhenkiloEmailit));
            } catch (mailError) {
                console.error("Sähköpostin lähetys epäonnistui:", mailError);
            }

            res.sendFile(path.join(__dirname, 'views/pages/success.html'));
        });
    });
}

app.get(`/success`, handleSuccessPage);
app.get(`/verkkokauppa/success`, handleSuccessPage);

function handleCancelPage(req, res) {
    const backUrl = req.path.startsWith('/verkkokauppa') ? '/verkkokauppa/kori' : '/kori';
    res.send(`<h1>Maksu keskeytyi</h1><p>Voit yrittää uudelleen ostoskorista.</p><a href="${backUrl}">Palaa ostoskoriin</a>`);
}

app.get(`/cancel`, handleCancelPage);
app.get(`/verkkokauppa/cancel`, handleCancelPage);

function handleOrderDetails(req, res) {
    const orderId = req.query.id;
    if (!orderId) return res.status(400).json({ error: 'Tilauksen tunnus puuttuu.' });

    db.query('SELECT * FROM orders WHERE id = ? LIMIT 1', [orderId], (err, results) => {
        if (err) {
            console.error('Order details hakuvirhe:', err);
            return res.status(500).json({ error: 'Tietokantavirhe' });
        }
        if (!results || results.length === 0) {
            return res.status(404).json({ error: 'Tilausta ei löytynyt.' });
        }

        const order = results[0];
        let items = [];
        try {
            items = JSON.parse(order.items || '[]');
        } catch (parseError) {
            items = [];
        }

        const itemIds = items.filter(item => item.id).map(item => item.id);
        if (itemIds.length === 0) {
            return res.json({
                id: order.id,
                amount: Number(order.amount) || 0,
                customer_email: order.customer_email,
                customer_name: order.customer_name,
                customer_phone: order.customer_phone || '',
                customer_address: order.customer_address || '',
                customer_postcode: order.customer_postcode || '',
                customer_city: order.customer_city || '',
                created_at: order.created_at || null,
                items
            });
        }

        db.query(
            `SELECT id, category_id, name_fi FROM products WHERE id IN (?)`,
            [itemIds],
            (productErr, productResults) => {
                const productMap = (productResults || []).reduce((map, prod) => {
                    map[String(prod.id)] = prod;
                    return map;
                }, {});

                const enrichedItems = items.map(item => {
                    const product = item.id ? productMap[String(item.id)] : null;
                    const categoryId = product ? String(product.category_id) : null;
                    const vastuuhenkilo = (categoryId && vastuuhenkilot[categoryId]) ? vastuuhenkilot[categoryId] : oletusHenkilo;

                    return {
                        ...item,
                        category_id: categoryId,
                        responsible: {
                            nimi: vastuuhenkilo.nimi,
                            email: vastuuhenkilo.email,
                            puh: vastuuhenkilo.puh
                        }
                    };
                });

                res.json({
                    id: order.id,
                    amount: Number(order.amount) || 0,
                    customer_email: order.customer_email,
                    customer_name: order.customer_name,
                    customer_phone: order.customer_phone || '',
                    customer_address: order.customer_address || '',
                    customer_postcode: order.customer_postcode || '',
                    customer_city: order.customer_city || '',
                    created_at: order.created_at || null,
                    items: enrichedItems
                });
            }
        );
    });
}

app.get(`/api/order-details`, handleOrderDetails);
app.get(`/verkkokauppa/api/order-details`, handleOrderDetails);

// ================= API REITIT =================

// PAYTRAIL: Maksun luominen
async function createPaytrailPayment(req, res, debugLabel = 'PAYTRAIL DEBUG') {
    try {
        const { items = [], amount = 0, customer = {} } = req.body || {};

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Ostoskorisi on tyhjä.' });
        }

        if (!customer.email) {
            return res.status(400).json({ error: 'Asiakkaan sähköposti puuttuu.' });
        }

        // Tarkista stock määrät ennen tilauksen luomista
        for (const item of items) {
            const quantity = item.quantity || 1;
            const stockCheck = await new Promise((resolve) => {
                db.query(`SELECT stock, name_fi FROM products WHERE id = ?`, [item.id], (err, results) => {
                    if (err || results.length === 0) {
                        resolve({ available: false, stock: 0, name: item.name });
                    } else {
                        const product = results[0];
                        resolve({ 
                            available: product.stock >= quantity, 
                            stock: product.stock, 
                            name: product.name_fi || item.name 
                        });
                    }
                });
            });

            if (!stockCheck.available) {
                return res.status(400).json({ 
                    error: `Tuote "${stockCheck.name}" on loppunut varastosta. Saatavilla: ${stockCheck.stock} kpl, pyydetty: ${quantity} kpl.` 
                });
            }
        }

        const mainStamp = `eduko-${Date.now()}`;
        const numericReference = `${Date.now()}`;
        const fullName = `${customer.fname || ''} ${customer.lname || ''}`.trim();

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
                Number(amount) || 0,
                'Odottaa maksua'
            ],
            (err) => {
                if (err) console.error('DB tilaus virhe:', err);
            }
        );

        const itemsForPaytrail = items.map((item, index) => {
            const parsedPrice = parseFloat((item.price ?? 0).toString().replace(',', '.'));
            const unitPrice = Math.max(0, Math.round(parsedPrice * 100));
            const units = Math.max(1, Number(item.quantity) || 1);

            return {
                unitPrice,
                units,
                vatPercentage: 24,
                productCode: item.id ? item.id.toString() : `prod-${index}`,
                description: (item.name || `Tuote ${index + 1}`).toString().substring(0, 100)
            };
        });

        const totalAmount = itemsForPaytrail.reduce((sum, item) => sum + (item.unitPrice * item.units), 0);

        const body = {
            stamp: mainStamp,
            reference: numericReference,
            amount: totalAmount,
            currency: 'EUR',
            language: 'FI',
            items: itemsForPaytrail,
            customer: { email: customer.email },
            redirectUrls: {
                success: `https://mc.koudata.fi/verkkokauppa/success?id=${mainStamp}`,
                cancel: `https://mc.koudata.fi/verkkokauppa/cancel`
            }
        };

        const headers = {
            'checkout-account': PAYTRAIL_CONFIG.merchantId,
            'checkout-algorithm': 'sha256',
            'checkout-method': 'POST',
            'checkout-nonce': crypto.randomBytes(16).toString('hex'),
            'checkout-timestamp': new Date().toISOString()
        };

        headers['checkout-signature'] = calculateHmac(PAYTRAIL_CONFIG.secret, headers, body);

        console.log(`=== ${debugLabel} ===`);
        console.log('Asiakkaalta saatu amount:', amount);
        console.log('Items asiakkaalta:', JSON.stringify(items, null, 2));
        console.log('Items Paytrailille:', JSON.stringify(itemsForPaytrail, null, 2));
        console.log('Laskettu totalAmount:', totalAmount);
        console.log('Paytrail body:', JSON.stringify(body, null, 2));
        console.log('==================');

        const response = await axios.post(`${PAYTRAIL_CONFIG.apiEndpoint}/payments`, body, { headers });
        console.log('Paytrail creation response data:', JSON.stringify(response.data, null, 2));
        return res.json({ href: response.data.href });
    } catch (error) {
        const paytrailError = error.response?.data || {};
        const message = paytrailError.message || error.message || 'Maksun luominen epäonnistui';
        console.error('Paytrail API virhe:', paytrailError || error.message);
        return res.status(500).json({ error: message });
    }
}

app.post(`/api/paytrail/create-payment`, (req, res) => createPaytrailPayment(req, res, 'PAYTRAIL DEBUG'));

// PAYTRAIL: Maksun luominen - ALIAS REITTI /verkkokauppa/api/paytrail/create-payment
app.post(`/verkkokauppa/api/paytrail/create-payment`, (req, res) => createPaytrailPayment(req, res, 'PAYTRAIL DEBUG (VERKKOKAUPPA ALIAS)'));

// ADMIN: Hae tilaukset
function mapOrderForAdmin(orderRow) {
    const fullName = (orderRow.customer_name || '').trim();
    const nameParts = fullName ? fullName.split(/\s+/) : [];
    const fname = nameParts.shift() || 'Ei nimeä';
    const lname = nameParts.join(' ');

    let items = [];
    try {
        items = JSON.parse(orderRow.items || '[]');
    } catch (error) {
        items = [];
    }

    const cityLine = [orderRow.customer_postcode || '', orderRow.customer_city || '']
        .join(' ')
        .trim();
    const address = [orderRow.customer_address || '', cityLine]
        .filter(Boolean)
        .join(', ');

    return {
        id: orderRow.id,
        amount: Number(orderRow.amount) || 0,
        total_price: Number(orderRow.amount) || 0,
        status: orderRow.status,
        created_at: orderRow.created_at,
        items,
        customer: {
            fname,
            lname,
            fullName: fullName || 'Ei nimeä',
            email: orderRow.customer_email || '',
            phone: orderRow.customer_phone || '',
            address: address || 'Ei osoitetta'
        }
    };
}

function fetchAdminOrders(req, res, singleOrder = false) {
    const sql = singleOrder
        ? 'SELECT * FROM orders WHERE id = ? LIMIT 1'
        : 'SELECT * FROM orders ORDER BY created_at DESC';
    const params = singleOrder ? [req.params.id] : [];

    db.query(sql, params, (err, results) => {
        if (err) {
            console.error('Tilausten hakuvirhe:', err);
            return res.status(500).json({ error: 'DB error' });
        }

        if (singleOrder) {
            if (!results || results.length === 0) {
                return res.status(404).json({ error: 'Tilausta ei löytynyt.' });
            }
            return res.json(mapOrderForAdmin(results[0]));
        }

        return res.json((results || []).map(mapOrderForAdmin));
    });
}

app.get(`/api/admin/orders`, vaadiKirjautuminen, (req, res) => fetchAdminOrders(req, res));
app.get(`/verkkokauppa/api/admin/orders`, vaadiKirjautuminen, (req, res) => fetchAdminOrders(req, res));
app.get(`/api/admin/orders/:id`, vaadiKirjautuminen, (req, res) => fetchAdminOrders(req, res, true));
app.get(`/verkkokauppa/api/admin/orders/:id`, vaadiKirjautuminen, (req, res) => fetchAdminOrders(req, res, true));


// ADMIN: Hae tuotteet hallintaa varten
app.get(`/api/admin/products`, vaadiKirjautuminen, (req, res) => {
    // Haetaan name_fi ja nimetään se 'name', jotta admin.js ymmärtää sen - LISÄTTY stock ja image
    db.query("SELECT id, name_fi AS name, price, stock, image FROM products ORDER BY id DESC", (err, results) => {
        if (err) {
            console.error("Tietokantavirhe admin-haussa:", err);
            return res.status(500).json({ error: "Tietokantavirhe" });
        }
        // Normalisoi kuvat
        const normalizedResults = results.map(product => normalizeProductImages(product));
        res.json(normalizedResults);
    });
});

// ADMIN: Hae tuotteet hallintaa varten - ALIAS REITTI /verkkokauppa/api/admin/products
app.get(`/verkkokauppa/api/admin/products`, vaadiKirjautuminen, (req, res) => {
    // Haetaan name_fi ja nimetään se 'name', jotta admin.js ymmärtää sen - LISÄTTY stock ja image
    db.query("SELECT id, name_fi AS name, price, stock, image FROM products ORDER BY id DESC", (err, results) => {
        if (err) {
            console.error("Tietokantavirhe admin-haussa:", err);
            return res.status(500).json({ error: "Tietokantavirhe" });
        }
        // Normalisoi kuvat
        const normalizedResults = results.map(product => normalizeProductImages(product));
        res.json(normalizedResults);
    });
});

// ================= APUFUNKTIO: KIELEN VALINTA =================
/**
 * Valitsee oikean kielisen nimen tuotteelle
 * @param {Object} product - Tuoteobjekti
 * @param {String} lang - Kieli (fi, en, sv)
 * @returns {Object} - Päivitetty tuoteobjekti
 */
function applyProductLanguage(product, lang) {
    if (!product) return product;
    
    const langMap = {
        fi: { name: 'name_fi', description: 'description_fi', specs: 'specs_fi', imageAlt: 'image_alt_fi' },
        en: { name: 'name_en', description: 'description_en', specs: 'specs_en', imageAlt: 'image_alt_en' },
        sv: { name: 'name_sv', description: 'description_sv', specs: 'specs_sv', imageAlt: 'image_alt_sv' }
    };
    
    const columns = langMap[lang] || langMap.fi; // Oletuksena suomi
    product.name = product[columns.name] || product.name_fi || product.name || 'Nimetön tuote';
    product.description = product[columns.description] || product.description_fi || product.description || '';
    product.specs = product[columns.specs] || product.specs_fi || product.specs || '';
    product.image_alt = product[columns.imageAlt] || product.image_alt_fi || product.name;
    
    return product;
}

/**
 * Normalize kuvan polun siten että se toimii webbissa
 * Käsittelee: Windows-polut, uploads/ etuliitteet, pelkkiä filenamet ym.
 */
function normalizeImagePath(image) {
    const fallback = '/verkkokauppa/images/edukosmall.png';
    if (!image) return fallback;

    let normalizedPath = image.toString().trim();
    if (!normalizedPath) return fallback;

    if (normalizedPath.startsWith('data:image/')) return normalizedPath;

    normalizedPath = normalizedPath.replace(/\\/g, '/');

    if (normalizedPath.startsWith('/verkkokauppa/')) return normalizedPath;
    if (normalizedPath.startsWith('http://') || normalizedPath.startsWith('https://')) return normalizedPath;

    if (normalizedPath.startsWith('/uploads/') || normalizedPath.startsWith('/images/')) {
        return `/verkkokauppa${normalizedPath}`;
    }

    if (normalizedPath.includes('/uploads/')) {
        return `/verkkokauppa${normalizedPath.slice(normalizedPath.indexOf('/uploads/'))}`;
    }
    if (normalizedPath.includes('/images/')) {
        return `/verkkokauppa${normalizedPath.slice(normalizedPath.indexOf('/images/'))}`;
    }

    if (normalizedPath.startsWith('uploads/') || normalizedPath.startsWith('images/')) {
        return `/verkkokauppa/${normalizedPath}`;
    }

    return `/verkkokauppa/uploads/${normalizedPath}`;
}

/**
 * Käsittele tuotteen kuvat ennen lähettämistä
 */
function normalizeProductImages(product) {
    if (product) {
        product.image = normalizeImagePath(product.image);

        if (product.images && typeof product.images === 'string') {
            try {
                let images = JSON.parse(product.images);
                if (Array.isArray(images)) {
                    const normalized = images.map(img => {
                        if (img && typeof img === 'object' && img.src) {
                            return {
                                ...img,
                                src: normalizeImagePath(img.src)
                            };
                        }
                        return normalizeImagePath(img);
                    });
                    product.images = JSON.stringify(normalized);
                }
            } catch (e) {
                // Jos parse epäonnistuu, jätä alkuperäinen
            }
        }
    }
    return product;
}

function detectImageMime(filePath) {
    let fileHandle;
    try {
        fileHandle = fs.openSync(filePath, 'r');
        const buffer = Buffer.alloc(12);
        fs.readSync(fileHandle, buffer, 0, 12, 0);

        if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
            return 'image/png';
        }
        if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
            return 'image/jpeg';
        }
        if (buffer.toString('ascii', 0, 4) === 'GIF8') {
            return 'image/gif';
        }
        if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') {
            return 'image/webp';
        }
        if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
            return 'image/bmp';
        }
    } catch (error) {
        return 'application/octet-stream';
    } finally {
        if (fileHandle) {
            fs.closeSync(fileHandle);
        }
    }

    return 'application/octet-stream';
}

// TUOTTEET: Julkiset reitit
app.get(`/api/products`, (req, res) => {
    const categoryParam = req.query.category;
    const lang = req.query.lang || 'fi'; // Oletuksena suomi
    
    let sql = !isNaN(categoryParam) 
        ? "SELECT p.*, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.category_id = ? AND p.stock > 0 ORDER BY p.id DESC" 
        : "SELECT p.*, c.slug as category_slug FROM products p JOIN categories c ON p.category_id = c.id WHERE c.slug = ? AND p.stock > 0 ORDER BY p.id DESC";

    db.query(sql, [categoryParam], (err, results) => {
        if (err) return res.status(500).json({ error: "Tietokantavirhe" });
        
        // Sovella kielivalinta ja normalisoi kuvat kaikille tuotteille
        const localizedResults = results.map(product => {
            product = applyProductLanguage(product, lang);
            product = normalizeProductImages(product);
            return product;
        });
        res.json(localizedResults);
    });
});

// Alias reitti /verkkokauppa/api/products
app.get(`/verkkokauppa/api/products`, (req, res) => {
    const categoryParam = req.query.category;
    const lang = req.query.lang || 'fi'; // Oletuksena suomi
    
    let sql = !isNaN(categoryParam) 
        ? "SELECT p.*, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.category_id = ? AND p.stock > 0 ORDER BY p.id DESC" 
        : "SELECT p.*, c.slug as category_slug FROM products p JOIN categories c ON p.category_id = c.id WHERE c.slug = ? AND p.stock > 0 ORDER BY p.id DESC";

    db.query(sql, [categoryParam], (err, results) => {
        if (err) return res.status(500).json({ error: "Tietokantavirhe" });
        
        // Sovella kielivalinta ja normalisoi kuvat kaikille tuotteille
        const localizedResults = results.map(product => {
            product = applyProductLanguage(product, lang);
            product = normalizeProductImages(product);
            return product;
        });
        res.json(localizedResults);
    });
});

app.get(`/api/products/latest`, (req, res) => {
    const lang = req.query.lang || 'fi'; // Oletuksena suomi
    
    db.query(
        `SELECT p.*, c.slug as category_slug 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.stock > 0 
         ORDER BY p.created_at DESC LIMIT 15`, 
        (err, results) => {
            if (err) return res.status(500).json({ error: "Tietokantavirhe" });
            
            // Sovella kielivalinta ja normalisoi kuvat kaikille tuotteille
            const localizedResults = results.map(product => {
                product = applyProductLanguage(product, lang);
                product = normalizeProductImages(product);
                return product;
            });
            res.json(localizedResults);
        }
    );
});

// Alias reitti /verkkokauppa/api/products/latest
app.get(`/verkkokauppa/api/products/latest`, (req, res) => {
    const lang = req.query.lang || 'fi'; // Oletuksena suomi
    
    db.query(
        `SELECT p.*, c.slug as category_slug 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.stock > 0 
         ORDER BY p.created_at DESC LIMIT 15`, 
        (err, results) => {
            if (err) return res.status(500).json({ error: "Tietokantavirhe" });
            
            // Sovella kielivalinta ja normalisoi kuvat kaikille tuotteille
            const localizedResults = results.map(product => {
                product = applyProductLanguage(product, lang);
                product = normalizeProductImages(product);
                return product;
            });
            res.json(localizedResults);
        }
    );
});

app.get(`/api/products/:id`, (req, res) => {
    const lang = req.query.lang || 'fi'; // Oletuksena suomi
    
    db.query(
        `SELECT p.*, c.slug as category_slug 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.id = ?`, 
        [req.params.id], 
        (err, results) => {
            if (err || results.length === 0) return res.status(404).json({ error: "Ei löydy" });
            
            // Sovella kielivalinta ja normalisoi kuvat
            let product = applyProductLanguage(results[0], lang);
            product = normalizeProductImages(product);
            res.json(product);
        }
    );
});

// Alias reitti /verkkokauppa/api/products/:id
app.get(`/verkkokauppa/api/products/:id`, (req, res) => {
    const lang = req.query.lang || 'fi'; // Oletuksena suomi
    
    db.query(
        `SELECT p.*, c.slug as category_slug 
         FROM products p 
         LEFT JOIN categories c ON p.category_id = c.id 
         WHERE p.id = ?`, 
        [req.params.id], 
        (err, results) => {
            if (err || results.length === 0) return res.status(404).json({ error: "Ei löydy" });
            
            // Sovella kielivalinta ja normalisoi kuvat
            let product = applyProductLanguage(results[0], lang);
            product = normalizeProductImages(product);
            res.json(product);
        }
    );
});

// --- TUOTTEEN POISTO (DELETE) ---
app.delete(`/api/products/:id`, vaadiKirjautuminen, (req, res) => {
    const productId = req.params.id;

    db.query("DELETE FROM products WHERE id = ?", [productId], (err, result) => {
        if (err) {
            console.error("Poistovirhe:", err);
            return res.status(500).json({ success: false, error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: "Tuotetta ei löytynyt tai se on jo poistettu." });
        }

        res.json({ success: true, message: "Tuote poistettu onnistuneesti" });
    });
});

// Alias for DELETE: /verkkokauppa/api/products/:id
app.delete(`/verkkokauppa/api/products/:id`, vaadiKirjautuminen, (req, res) => {
    const productId = req.params.id;

    db.query("DELETE FROM products WHERE id = ?", [productId], (err, result) => {
        if (err) {
            console.error("Poistovirhe:", err);
            return res.status(500).json({ success: false, error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: "Tuotetta ei löytynyt tai se on jo poistettu." });
        }

        res.json({ success: true, message: "Tuote poistettu onnistuneesti" });
    });
});

// Haku API: Etsii tuotteita nimen tai kuvauksen perusteella
app.get(`/api/search`, (req, res) => {
    const term = req.query.q;
    const lang = req.query.lang || 'fi';
    if (!term) return res.json([]);

    const langMap = {
        fi: { name: 'name_fi', description: 'description_fi' },
        en: { name: 'name_en', description: 'description_en' },
        sv: { name: 'name_sv', description: 'description_sv' }
    };
    
    const columns = langMap[lang] || langMap.fi;
    const sql = `SELECT * FROM products WHERE (${columns.name} LIKE ? OR ${columns.description} LIKE ?) AND stock > 0 ORDER BY created_at DESC`;
    const values = [`%${term}%`, `%${term}%` || ''];

    db.query(sql, values, (err, results) => {
        if (err) {
            console.error("Hakuvirhe:", err);
            return res.status(500).json({ error: "Tietokantavirhe haussa" });
        }
        // Sovella kielivalinta ja normalisoi kuvat
        const normalizedResults = results.map(product => {
            let p = applyProductLanguage(product, lang);
            return normalizeProductImages(p);
        });
        res.json(normalizedResults);
    });
});

// Haku API: Etsii tuotteita - ALIAS REITTI /verkkokauppa/api/search
app.get(`/verkkokauppa/api/search`, (req, res) => {
    const term = req.query.q;
    const lang = req.query.lang || 'fi';
    if (!term) return res.json([]);

    const langMap = {
        fi: { name: 'name_fi', description: 'description_fi' },
        en: { name: 'name_en', description: 'description_en' },
        sv: { name: 'name_sv', description: 'description_sv' }
    };
    
    const columns = langMap[lang] || langMap.fi;
    const sql = `SELECT * FROM products WHERE (${columns.name} LIKE ? OR ${columns.description} LIKE ?) AND stock > 0 ORDER BY created_at DESC`;
    const values = [`%${term}%`, `%${term}%` || ''];

    db.query(sql, values, (err, results) => {
        if (err) {
            console.error("Hakuvirhe:", err);
            return res.status(500).json({ error: "Tietokantavirhe haussa" });
        }
        // Sovella kielivalinta ja normalisoi kuvat
        const normalizedResults = results.map(product => {
            let p = applyProductLanguage(product, lang);
            return normalizeProductImages(p);
        });
        res.json(normalizedResults);
    });
});
// ================= ADMIN KIRJAUTUMINEN (OTP) =================

const MAX_LOGIN_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 min. // vaihda 15 min
const loginFailures = new Map();

function getClientIp(req) {
    return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection?.remoteAddress || 'unknown';
}

function getLockStatus(ip) {
    const entry = loginFailures.get(ip);
    if (!entry) return null;
    if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
        return entry;
    }
    return null;
}

function recordLoginFailure(ip) {
    const now = Date.now();
    const entry = loginFailures.get(ip) || { count: 0, lockedUntil: null };
    entry.count += 1;

    if (entry.count >= MAX_LOGIN_ATTEMPTS) {
        entry.lockedUntil = now + LOCKOUT_DURATION_MS;
    }

    loginFailures.set(ip, entry);
    return entry;
}

function resetLoginFailures(ip) {
    loginFailures.delete(ip);
}

// Päivitä nämä omiin tarpeisiisi
const adminKayttajat = {
    "esra07bagdat@gmail.com": { salasana: "123456" },
    "katike.kemppainen@gmail.com": { salasana: "123456" },
    "joni.finne@eduko.fi": { salasana: "123456" },
    
    "jonne.autere@student.eduko.fi": { salasana: "123456" },
    "kristian.turtiainen@student.eduko.fi": { salasana: "123456" },
    "miko.heikkinen@student.eduko.fi": { salasana: "123456" },

    "matias.ovasko@student.eduko.fi": { salasana: "123456" },
    "ilmari.heinola@student.eduko.fi": { salasana: "123456" },
    "joni.kunnaskari@student.eduko.fi": { salasana: "123456" } 
};

async function handleLoginStep1(req, res) {
    const { email, password } = req.body;
    const ip = getClientIp(req);
    const lockStatus = getLockStatus(ip);

    if (lockStatus) {
        const remainingMs = lockStatus.lockedUntil - Date.now();
        const remainingSeconds = Math.ceil(remainingMs / 1000);
        return res.status(429).json({
            success: false,
            message: `Liian monta väärää kirjautumisyritystä. Yritä uudelleen ${remainingSeconds} sekunnin kuluttua.`,
            retryAfter: remainingSeconds
        });
    }

    // Tarkistetaan löytyykö sähköposti ja täsmääkö salasana
    if (adminKayttajat[email] && adminKayttajat[email].salasana === password) {
        resetLoginFailures(ip);
        const vahvistuskoodi = Math.floor(100000 + Math.random() * 900000);
        req.session.pendingOtp = vahvistuskoodi;
        req.session.pendingEmail = email; // Tallennetaan kuka yrittää kirjautua

        try {
            await lahetin.sendMail({
                from: '"Eduko Admin" <kissakoira773@gmail.com>',
                to: email, // Koodi lähtee VAIN sille, joka syötti oikeat tunnukset
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
                    </div>`
            });
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ success: false, message: "Email virhe" });
        }
    } else {
        const entry = recordLoginFailure(ip);
        if (entry.lockedUntil) {
            return res.status(429).json({
                success: false,
                message: `Liian monta väärää kirjautumisyritystä. Yritä uudelleen ${LOCKOUT_DURATION_MS / 1000} sekunnin jälkeen.`,
                retryAfter: LOCKOUT_DURATION_MS / 1000
            });
        }
        res.status(401).json({ success: false, message: "Väärät tunnukset" });
    }
}

app.post(`/api/login-step1`, handleLoginStep1);
app.post(`/verkkokauppa/api/login-step1`, handleLoginStep1);

app.post(`/api/verify-code`, (req, res) => {
    if (req.body.code && req.session.pendingOtp && req.body.code.toString() === req.session.pendingOtp.toString()) {
        req.session.isAdmin = true; 
        delete req.session.pendingOtp;
        
        req.session.save((err) => {
            if (err) return res.status(500).json({ success: false, message: "Sessiovirhe" });
            
            // PAKOTETAAN selaimelle oikea polku
            res.json({ success: true, redirect: `/verkkokauppa/kaupan-takahuone` });
        });
    } else {
        res.status(400).json({ success: false, message: "Väärä koodi" });
    }
});


// ================= TUOTTEIDEN HALLINTA (CRUD) =================

// 1. LISÄÄ UUSI TUOTE (POST) - /api/products
app.post('/api/products', vaadiKirjautuminen, upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'extraImages', maxCount: 5 }
]), (req, res) => {
    handleProductSave(req, res, false);
});

// 1b. LISÄÄ UUSI TUOTE (POST) - /verkkokauppa/api/products (alias)
app.post('/verkkokauppa/api/products', vaadiKirjautuminen, upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'extraImages', maxCount: 5 }
]), (req, res) => {
    handleProductSave(req, res, false);
});

// 2. PÄIVITÄ OLEMASSA OLEVAA TUOTETTA (PUT) - /api/products/:id
app.put('/api/products/:id', vaadiKirjautuminen, upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'extraImages', maxCount: 5 }
]), (req, res) => {
    handleProductSave(req, res, true);
});

// 2b. PÄIVITÄ OLEMASSA OLEVAA TUOTETTA (PUT) - /verkkokauppa/api/products/:id (alias)
app.put('/verkkokauppa/api/products/:id', vaadiKirjautuminen, upload.fields([
    { name: 'mainImage', maxCount: 1 },
    { name: 'extraImages', maxCount: 5 }
]), (req, res) => {
    console.log("PUT /verkkokauppa/api/products/:id - Handling product save");
    handleProductSave(req, res, true);
});

// YHTEINEN FUNKTIO TALLENNUKSELLE (Vähentää koodin toistoa ja virheitä)
function handleProductSave(req, res, isUpdate) {
    try {
        const productId = req.params.id;
        
        // Hae tekstikentät req.body:stä (Multer laittaa teksti-kentät sinne)
        const price = req.body.price;
        const stock = req.body.stock;
        const category = req.body.category;
        const pickup_point = req.body.pickup_point;
        const type = req.body.type;
        const translations = req.body.translations;

        if (!translations) return res.status(400).send("Käännöstiedot puuttuvat.");
        const parsedTranslations = JSON.parse(translations);

        // Kieliversiot
        const t = {
            fi: parsedTranslations.fi || {},
            sv: parsedTranslations.sv || {},
            en: parsedTranslations.en || {}
        };
        const imageAlt = {
            fi: (t.fi.imageAlt || t.fi.name || '').trim(),
            sv: (t.sv.imageAlt || t.sv.name || '').trim(),
            en: (t.en.imageAlt || t.en.name || '').trim()
        };

        const parsedExtraImageAlts = (() => {
            try {
                return req.body.extraImageAlts ? JSON.parse(req.body.extraImageAlts) : { fi: [], sv: [], en: [] };
            } catch (err) {
                return { fi: [], sv: [], en: [] };
            }
        })();

        // Kuvat
        const mainImage = (req.files && req.files.mainImage) ? req.files.mainImage[0].filename : null;
        const extraImages = (req.files && req.files.extraImages) ? JSON.stringify(req.files.extraImages.map((f, index) => ({
            src: f.filename,
            alts: {
                fi: parsedExtraImageAlts.fi?.[index] || '',
                sv: parsedExtraImageAlts.sv?.[index] || '',
                en: parsedExtraImageAlts.en?.[index] || ''
            }
        }))) : null;

        let sql, params;

        if (isUpdate) {
            // PÄIVITYS (HUOM: Päivitetään kuva vain jos uusi on ladattu)
            sql = `UPDATE products SET 
                    name_fi=?, description_fi=?, specs_fi=?,
                    name_sv=?, description_sv=?, specs_sv=?,
                    name_en=?, description_en=?, specs_en=?,
                    image_alt_fi=?, image_alt_sv=?, image_alt_en=?,
                    price=?, category_id=?, stock=?, pickup_point=?, type=?`;
            
            params = [
                t.fi.name, t.fi.description, t.fi.specs,
                t.sv.name, t.sv.description, t.sv.specs,
                t.en.name, t.en.description, t.en.specs,
                imageAlt.fi, imageAlt.sv, imageAlt.en,
                price, category, stock, pickup_point, type
            ];

            if (mainImage) { sql += `, image=?`; params.push(mainImage); }
            if (extraImages) { sql += `, images=?`; params.push(extraImages); }

            sql += ` WHERE id=?`;
            params.push(productId);
        } else {
            // LISÄYS
            sql = `INSERT INTO products (
                    name_fi, description_fi, specs_fi, name_sv, description_sv, specs_sv,
                    name_en, description_en, specs_en, image_alt_fi, image_alt_sv, image_alt_en, price, image, category_id, images,
                    stock, pickup_point, type
                   ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
            params = [
                t.fi.name, t.fi.description, t.fi.specs,
                t.sv.name, t.sv.description, t.sv.specs,
                t.en.name, t.en.description, t.en.specs,
                imageAlt.fi, imageAlt.sv, imageAlt.en,
                price, mainImage, category, extraImages || '[]', stock, pickup_point, type
            ];
        }

        db.query(sql, params, (err, result) => {
            if (err) return res.status(500).json({ success: false, error: err.message });
            res.json({ success: true, id: isUpdate ? productId : result.insertId });
        });

    } catch (err) {
        res.status(500).send("Palvelinvirhe: " + err.message);
    }
}

// ================= STATIC MIDDLEWARE =================
const uploadsStaticMiddleware = express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
        res.type(detectImageMime(filePath));
    }
});

app.use('/uploads', uploadsStaticMiddleware);
app.use('/verkkokauppa/uploads', uploadsStaticMiddleware);
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));
app.use('/verkkokauppa/images', express.static(path.join(__dirname, 'public', 'images')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/verkkokauppa', express.static(path.join(__dirname, 'public')));

// Catch all unmatched routes and show the friendly error page
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'views/pages/error.html'));
});

// Global error handler for internal server errors
app.use((err, req, res, next) => {
    console.error('Palvelinvirhe:', err);
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).sendFile(path.join(__dirname, 'views/pages/error.html'));
});

app.listen(PORT, () => {
    console.log(`✅ Serveri käynnissä: http://localhost:${PORT}`);
    console.log(path.join(__dirname, 'views/pages/index.html'));
});
