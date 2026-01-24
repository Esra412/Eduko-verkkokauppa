const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Tarjoillaan staattiset tiedostot (CSS, kuvat, selain-JS)
app.use(express.static(path.join(__dirname, 'public')));

// Reitti pääsivulle
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pages', 'index.html'));
});

// Tuotelistaus-sivu (esim. Ajoneuvoala)
app.get('/kategoria/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pages', 'category.html'));
});

// Tuotteen lisätiedot (yksittäinen kohde)
// Tämä reitti nappaa kaikki /tuote/ -alkuiset pyynnöt
app.get('/tuote/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'pages', 'product-details.html'));
});

app.listen(PORT, () => {
    console.log(`Palvelin käynnissä: http://localhost:${PORT}`);
});