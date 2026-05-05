// db.js
const mysql = require('mysql2');

const db = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'nakkikastike123',
    database: 'eduko_kauppa',
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