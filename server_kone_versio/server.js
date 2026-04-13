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


// Vastuuhenkilöiden tiedot kategorioittain (ID on avain)
const vastuuhenkilot = {
    "1": { nimi: "Matti Meikäläinen", email: "matti.ajoneuvo@eduko.fi", puh: "040 123 4567" },
    "2": { nimi: "Sanni Suortuva", email: "sanni.hius@eduko.fi", puh: "040 234 5678" },
    "3": { nimi: "Kalle Koneistaja", email: "kalle.metalli@eduko.fi", puh: "040 345 6789" },
    "4": { nimi: "Lauri Lastaus", email: "lauri.logistiikka@eduko.fi", puh: "040 456 7890" },
    "5": { nimi: "Paula Putki", email: "paula.prosessi@eduko.fi", puh: "040 567 8901" },
    "6": { nimi: "Teemu Turva", email: "teemu.turva@eduko.fi", puh: "040 678 9012" },
    "7": { nimi: "Risto Rakentaja", email: "risto.raksa@eduko.fi", puh: "040 789 0123" },
    "8": { nimi: "Keijo Kokki", email: "keijo.kokki@eduko.fi", puh: "040 890 1234" },
    "9": { nimi: "Seppo Sähkö", email: "seppo.sahko@eduko.fi", puh: "040 901 2345" },
    "10": { nimi: "Sari Sote", email: "sari.sote@eduko.fi", puh: "040 012 3456" },
    "11": { nimi: "Iiro It", email: "iiro.it@eduko.fi", puh: "040 111 2222" }
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

function calculateHmac(secret, params, body = '') {
    const hmacPayload = Object.keys(params)
        .sort()
        .map((key) => `${key}:${params[key]}`)
        .concat(body ? JSON.stringify(body) : '')
        .join('\n');

    return crypto.createHmac('sha256', secret).update(hmacPayload).digest('hex');
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
        res.status(401).json({ success: false, message: "Kirjaudu sisään" });
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

app.get(`/admin`, vaadiKirjautuminen, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/admin.html')));
// Alias reitti /verkkokauppa/admin
app.get(`/verkkokauppa/admin`, vaadiKirjautuminen, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/admin.html')));
app.get(`/kategoria/:id`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/category.html')));
// Alias reitti /verkkokauppa/kategoria/:id
app.get(`/verkkokauppa/kategoria/:id`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/category.html')));
app.get(`/tuote/:id`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/product-details.html')));
// Alias reitti /verkkokauppa/tuote/:id
app.get(`/verkkokauppa/tuote/:id`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/product-details.html')));
app.get(`/tieto`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/Tietoa_meista.html')));
app.get(`/verkkokauppa/tieto`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/Tietoa_meista.html')));
app.get(`/kori`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/cart.html')));
// Alias reitti /verkkokauppa/kori
app.get(`/verkkokauppa/kori`, (req, res) => res.sendFile(path.join(__dirname, 'views/pages/cart.html')));

// ================= MAKSUN PALUUREITIT =================

async function handleSuccessPage(req, res) {
    const orderId = req.query.id;

    db.query(`UPDATE orders SET status = 'Maksettu' WHERE id = ?`, [orderId], (err) => {
        if (err) console.error("Tietokantavirhe (status):", err);
    });

    db.query(`SELECT * FROM orders WHERE id = ?`, [orderId], async (err, results) => {
        if (err || results.length === 0) return res.sendFile(path.join(__dirname, 'views/pages/success.html'));

        const order = results[0];
        const items = JSON.parse(order.items);
        const itemIds = items.map(i => i.id);

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

        headers.signature = calculateHmac(PAYTRAIL_CONFIG.secret, headers, body);

        console.log(`=== ${debugLabel} ===`);
        console.log('Asiakkaalta saatu amount:', amount);
        console.log('Items asiakkaalta:', JSON.stringify(items, null, 2));
        console.log('Items Paytrailille:', JSON.stringify(itemsForPaytrail, null, 2));
        console.log('Laskettu totalAmount:', totalAmount);
        console.log('Paytrail body:', JSON.stringify(body, null, 2));
        console.log('==================');

        const response = await axios.post(`${PAYTRAIL_CONFIG.apiEndpoint}/payments`, body, { headers });
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
        fi: { name: 'name_fi', description: 'description_fi', specs: 'specs_fi' },
        en: { name: 'name_en', description: 'description_en', specs: 'specs_en' },
        sv: { name: 'name_sv', description: 'description_sv', specs: 'specs_sv' }
    };
    
    const columns = langMap[lang] || langMap.fi; // Oletuksena suomi
    product.name = product[columns.name] || product.name_fi || product.name || 'Nimetön tuote';
    product.description = product[columns.description] || product.description_fi || product.description || '';
    product.specs = product[columns.specs] || product.specs_fi || product.specs || '';
    
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
                    product.images = images.map(img => normalizeImagePath(img));
                    product.images = JSON.stringify(product.images);
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
        ? "SELECT p.*, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.category_id = ? ORDER BY p.id DESC" 
        : "SELECT p.*, c.slug as category_slug FROM products p JOIN categories c ON p.category_id = c.id WHERE c.slug = ? ORDER BY p.id DESC";

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
        ? "SELECT p.*, c.slug as category_slug FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.category_id = ? ORDER BY p.id DESC" 
        : "SELECT p.*, c.slug as category_slug FROM products p JOIN categories c ON p.category_id = c.id WHERE c.slug = ? ORDER BY p.id DESC";

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
    if (!term) return res.json([]);

    const sql = "SELECT * FROM products WHERE name_fi LIKE ? OR description_fi LIKE ? ORDER BY created_at DESC";
    const values = [`%${term}%`, `%${term}%` || ''];

    db.query(sql, values, (err, results) => {
        if (err) {
            console.error("Hakuvirhe:", err);
            return res.status(500).json({ error: "Tietokantavirhe haussa" });
        }
        // Normalisoi kuvat kaikille hakutuloksille
        const normalizedResults = results.map(product => normalizeProductImages(product));
        res.json(normalizedResults);
    });
});

// Haku API: Etsii tuotteita - ALIAS REITTI /verkkokauppa/api/search
app.get(`/verkkokauppa/api/search`, (req, res) => {
    const term = req.query.q;
    if (!term) return res.json([]);

    const sql = "SELECT * FROM products WHERE name_fi LIKE ? OR description_fi LIKE ? ORDER BY created_at DESC";
    const values = [`%${term}%`, `%${term}%` || ''];

    db.query(sql, values, (err, results) => {
        if (err) {
            console.error("Hakuvirhe:", err);
            return res.status(500).json({ error: "Tietokantavirhe haussa" });
        }
        // Normalisoi kuvat kaikille hakutuloksille
        const normalizedResults = results.map(product => normalizeProductImages(product));
        res.json(normalizedResults);
    });
});
// ================= ADMIN KIRJAUTUMINEN (OTP) =================

// Päivitä nämä omiin tarpeisiisi
const adminKayttajat = {
    "esra07bagdat@gmail.com": { salasana: "123456" },
    "katike.kemppainen@gmail.com": { salasana: "123456" },
    "joni.finne@eduko.fi": { salasana: "123456" }
};

app.post(`/api/login-step1`, async (req, res) => {
    const { email, password } = req.body;
    
    // Tarkistetaan löytyykö sähköposti ja täsmääkö salasana
    if (adminKayttajat[email] && adminKayttajat[email].salasana === password) { 
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
        res.status(401).json({ success: false, message: "Väärät tunnukset" });
    }
});

app.post(`/api/verify-code`, (req, res) => {
    if (req.body.code && req.session.pendingOtp && req.body.code.toString() === req.session.pendingOtp.toString()) {
        req.session.isAdmin = true; 
        delete req.session.pendingOtp;
        
        req.session.save((err) => {
            if (err) return res.status(500).json({ success: false, message: "Sessiovirhe" });
            
            // PAKOTETAAN selaimelle oikea polku
            res.json({ success: true, redirect: `/verkkokauppa/admin` });
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

        // Kuvat
        const mainImage = (req.files && req.files.mainImage) ? req.files.mainImage[0].filename : null;
        const extraImages = (req.files && req.files.extraImages) 
            ? JSON.stringify(req.files.extraImages.map(f => f.filename)) 
            : null;

        let sql, params;

        if (isUpdate) {
            // PÄIVITYS (HUOM: Päivitetään kuva vain jos uusi on ladattu)
            sql = `UPDATE products SET 
                    name_fi=?, description_fi=?, specs_fi=?,
                    name_sv=?, description_sv=?, specs_sv=?,
                    name_en=?, description_en=?, specs_en=?,
                    price=?, category_id=?, stock=?, pickup_point=?, type=?`;
            
            params = [
                t.fi.name, t.fi.description, t.fi.specs,
                t.sv.name, t.sv.description, t.sv.specs,
                t.en.name, t.en.description, t.en.specs,
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
                    name_en, description_en, specs_en, price, image, category_id, images,
                    stock, pickup_point, type
                   ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`;
            params = [
                t.fi.name, t.fi.description, t.fi.specs,
                t.sv.name, t.sv.description, t.sv.specs,
                t.en.name, t.en.description, t.en.specs,
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

app.listen(PORT, () => {
    console.log(`✅ Serveri käynnissä: http://localhost:${PORT}`);
    console.log(path.join(__dirname, 'views/pages/index.html'));
});
