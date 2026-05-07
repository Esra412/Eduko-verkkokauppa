const db = require('./db');
db.query('SELECT id, name_fi, category_id FROM products WHERE id IN (40) LIMIT 10', (err, results) => {
  if (err) {
    console.error('ERR', err);
    process.exit(1);
  }
  console.log(JSON.stringify(results, null, 2));
  process.exit(0);
});
