// Tarkista mitä tuotteita on tietokannassa
const db = require('./db');

db.query('SELECT id, name, name_fi, name_en FROM products LIMIT 10', (err, results) => {
    if (err) {
        console.error("Virhe:", err.message);
    } else {
        console.log("Tuotteet:");
        console.table(results);
    }
    process.exit(0);
});
