// db.js
require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'eduko_kauppa',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Testaa yhteys käynnistyksessä
db.query('SELECT 1', (err) => {
    if (err) {
        console.error('Tietokantayhteys epaonnistui:', err);
        return;
    }
    console.log('Tietokantapooli valmis!');
});

// Pidä yhteys aktiivisena pingaamalla joka 5 minuutti
setInterval(() => {
    db.query('SELECT 1', (err) => {
        if (err) {
            console.error('Yhteyden ylläpitopingu epäonnistui:', err);
        } else {
            console.log('Tietokantayhteys aktiivinen');
        }
    });
}, 5 * 60 * 1000); // 5 minuuttia

module.exports = db;