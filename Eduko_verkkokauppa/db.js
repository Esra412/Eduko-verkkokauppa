// db.js
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',       // XAMPP oletus
    password: '',       // XAMPP oletus salasana
    database: 'eduko_kauppa'
});

db.connect(err => {
    if (err) {
        console.error('❌ Tietokantayhteys epäonnistui:', err);
        return;
    }
    console.log('✅ Yhdistetty tietokantaan!');
});

module.exports = db;
