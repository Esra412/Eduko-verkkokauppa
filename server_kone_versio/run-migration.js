const db = require('./db');
const util = require('util');
const query = util.promisify(db.query).bind(db);

async function runMigration() {
    try {
        // Poista tuotteet ensin (foreign key constraints)
        console.log('Poistetaan tuotteet kategorioista 1,2,5,6,8,9,10,11...');
        const deleteProducts = await query('DELETE FROM products WHERE category_id IN (1, 2, 5, 6, 8, 9, 10, 11)');
        console.log(`✓ ${deleteProducts.affectedRows} tuotetta poistettu`);

        // Poista kategoriat
        console.log('Poistetaan kategoriat...');
        const deleteCategories = await query('DELETE FROM categories WHERE id IN (1, 2, 5, 6, 8, 9, 10, 11)');
        console.log(`✓ ${deleteCategories.affectedRows} kategoriaa poistettu`);

        console.log('\n✓ Migraatio valmis! Jäljelle jäävät kategoriat:');
        const remaining = await query('SELECT id, name FROM categories ORDER BY id');
        remaining.forEach(cat => console.log(`  - ${cat.id}: ${cat.name}`));

        process.exit(0);
    } catch (err) {
        console.error('Virhe:', err.message);
        process.exit(1);
    }
}

runMigration();

