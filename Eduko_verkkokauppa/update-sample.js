// Päivitä tuotteet kielillä testaamista varten
const db = require('./db');

const products = [
    {
        id: 4,
        name_fi: "Auto",
        name_en: "Car",
        name_sv: "Bil",
        description_fi: "Kaunista autoja opiskelijoiden tekemiä",
        description_en: "Beautiful cars made by students",
        description_sv: "Vackra bilar gjorda av studenter"
    },
    {
        id: 24,
        name_fi: "Kissa",
        name_en: "Cat",
        name_sv: "Katt",
        description_fi: "Söpö kissa opiskelijoiden tekemä",
        description_en: "Cute cat made by student",
        description_sv: "Söt katt gjord av student"
    }
];

let updated = 0;

products.forEach((product) => {
    const sql = `UPDATE products SET 
        name_fi = ?, 
        name_en = ?, 
        name_sv = ?,
        description_fi = ?,
        description_en = ?,
        description_sv = ?
    WHERE id = ?`;
    
    db.query(sql, [
        product.name_fi,
        product.name_en,
        product.name_sv,
        product.description_fi,
        product.description_en,
        product.description_sv,
        product.id
    ], (err, result) => {
        if (err) {
            console.error(`Virhe tuotteelle ${product.id}:`, err.message);
        } else {
            updated++;
            console.log(`✅ Tuote ${product.id} päivitetty:`, product.name_en);
        }
        
        if (updated === products.length) {
            console.log(`\n✅ Kaikki ${updated} tuotetta päivitetty kielillä!`);
            process.exit(0);
        }
    });
});

