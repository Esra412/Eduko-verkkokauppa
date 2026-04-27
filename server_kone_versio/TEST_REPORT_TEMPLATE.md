# Testiraportin malli - Verkkokauppa

## 1. Yhteenveto ja Metriikat

### Testauksen yleiskatsaus
- **Testauksen kohde:** [esim. verkkokaupan tuoterekisteri / ostoskori / kirjautuminen]
- **Testiryhmä:** [esim. QA-tiimi (5 henkilöä), kehittäjät, tuotetiimi]
- **Testausaika:** [alku - loppu, esim. 2026-04-01 - 2026-04-14]
- **Raportin laatu:** [esim. ensimmäinen läpikäynti, regressiotestaus, käyttöliittymätesti]
- **Tavoite:** [esim. varmistaa, että uusi julkaisu toimii odotetusti kaikilla päätelaitteilla ja kielillä]

### Testitulosten yhteenveto
| Metriikka | Arvo | Kommentti |
|-----------|------|-----------|
| Suoritettujen testien määrä | [esim. 150] | |
| Onnistuneet testit | [esim. 140] | [prosentti] |
| Epäonnistuneet testit | [esim. 10] | [prosentti] |
| Puuttuvat testit | [esim. 5] | [prosentti] |
| Löydettyjen vikojen määrä | [esim. 25] | |
| Vakavat viat (P1) | [esim. 3] | |
| Keskitasoiset viat (P2) | [esim. 12] | |
| Pienet viat (P3) | [esim. 10] | |
| Testikattavuus | [esim. 85%] | |

## 2. Testauksen laajuus ja kattavuus

### Testin tyyppi
- [ ] Manuaalinen testaus
- [ ] Automatisoitu testaus
- [ ] Hybridi (manuaalinen + automaattinen)
- [ ] Exploratory testing
- [ ] Regression testing

### Testatut toiminnallisuudet
| Moduuli | Testattu | Huomiot |
|---------|----------|---------|
| Etusivu | [x] | [esim. latausajat OK] |
| Tuotesivu | [x] | [esim. kuvat latautuvat] |
| Ostoskori | [x] | [esim. määräpäivitys toimii] |
| Kassaprosessi | [x] | [esim. maksutavat testattu] |
| Kirjautuminen / rekisteröinti | [x] | [esim. salasanan reset toimii] |
| Hallintapaneeli / admin | [x] | [esim. tuotteen lisäys OK] |
| Kieliversiot | [x] | [esim. fi, en, sv testattu] |
| Maksutavat | [x] | [esim. PayPal, kortti] |
| Tuotehaun toimivuus | [x] | [esim. hakusanat toimivat] |
| Kategoriat | [x] | [esim. suodatus toimii] |
| Käyttäjätili | [x] | [esim. profiilin päivitys] |
| Tilaushistoria | [x] | [esim. tilausten näyttö] |

### Ei testattu tai rajattu pois
- [ ] Kolmannen osapuolen API:t
- [ ] Suorituskyky kuormituksen alla
- [ ] Käyttökuormitus (load testing)
- [ ] Turvallisuustestaus (penetration testing)
- [ ] Esteettömyys (WCAG)
- [ ] Selainyhteensopivuus vanhoilla versioilla

## 3. Testiympäristö ja resurssit

### Tekninen ympäristö
- **Palvelin / URL:** [esim. localhost:3000, staging.verkkokauppa.fi, testipalvelin]
- **Tietokanta:** [esim. MySQL 8.0, testidata]
- **Backend:** [esim. Node.js 18.x, Express]
- **Frontend:** [esim. HTML/CSS/JS, responsive design]

### Testauslaitteet ja selaimet
| Selain | Versio | Windows | macOS | Android | iOS |
|--------|--------|---------|-------|---------|-----|
| Chrome | [esim. 123] | [x] | [x] | [x] | [x] |
| Firefox | [esim. 121] | [x] | [x] | [ ] | [ ] |
| Edge | [esim. 122] | [x] | [ ] | [ ] | [ ] |
| Safari | [esim. 17] | [ ] | [x] | [ ] | [x] |

### Testidata
- [x] Testituotteet (vähintään 20 tuotetta eri kategorioissa)
- [x] Käyttäjätilit (admin, normaali käyttäjä, vieras)
- [x] Maksutavat (testikortit, PayPal sandbox)
- [x] Tilaukset (eri tilat: odottaa, maksettu, toimitettu)
- [x] Kielikäännökset (fi, en, sv)

### Huomioitavaa ympäristössä
- Rajapinta ei ole käytettävissä testiympäristössä
- Testiympäristössä ei ole tuotantodataa
- Maksut ovat sandbox-moodissa
- Sähköpostit eivät lähetä oikeasti

## 4. Testiryhmä ja vastuut

### Tiimin jäsenet ja roolit
| Nimi | Rooli | Vastuu |
|------|-------|--------|
| [Nimi] | Testauskoordinaattori | Testien suunnittelu, aikataulutus, raportointi |
| [Nimi] | Manuaalinen testaaja | Käyttöliittymän testaus, exploratory testing |
| [Nimi] | Automaatiotestaaja | Skriptien ajaminen, CI/CD valvonta |
| [Nimi] | Tuotetiimin edustaja | Liiketoimintalogiikan validointi |
| [Nimi] | Kehittäjä | Tekninen tuki, bugien analysointi |

### Testausmenetelmät
- [x] Käyttötapaukset (User Stories)
- [x] Regressiotesti
- [x] Exploratory testing
- [x] Esteettömyystestaus (perustaso)
- [x] Kielitestit
- [x] Responsiivisuustestaus (mobiili, tabletti, desktop)
- [ ] Suorituskykytestaus
- [ ] Turvallisuustestaus

## 5. Testitapausten yksityiskohtainen yhteenveto

### Testitapaukset moduuleittain

#### 5.1 Etusivu
| Testitapaus ID | Kuvaus | Odotettu tulos | Tulos | Kommentit |
|---|---|---|---|---|
| UI-001 | Etusivu latautuu alle 3 sekunnissa | Sivu latautuu nopeasti | OK | Latausaika: 1.2s |
| UI-002 | Tuotteiden karuselli toimii | Tuotteet vaihtuvat automaattisesti | OK | |
| UI-003 | Hakupalkki toimii | Haku johtaa tuloksiin | OK | |

#### 5.2 Ostoskori
| Testitapaus ID | Kuvaus | Odotettu tulos | Tulos | Kommentit |
|---|---|---|---|---|
| CART-001 | Tuote lisätään ostoskoriin | Tuote näkyy korissa | OK | |
| CART-002 | Määrän päivitys toimii | Kokonaissumma päivittyy | OK | |
| CART-003 | Tyhjä ostoskori näyttää viestin | "Ostoskori on tyhjä" | OK | |

#### 5.3 Kassaprosessi
| Testitapaus ID | Kuvaus | Odotettu tulos | Tulos | Kommentit |
|---|---|---|---|---|
| CHECKOUT-001 | Maksutapa valitaan | Valittu maksutapa tallentuu | OK | |
| CHECKOUT-002 | Tilaus vahvistetaan | Kiitos-sivu näytetään | OK | |
| CHECKOUT-003 | Virheellinen kortti estää tilauksen | Virheilmoitus näytetään | FAIL | Bug #123 |

## 6. Havaitut löydökset ja viat

### 6.1 Vakavat viat (Priority 1 - Estävät julkaisun)
| # | Bug ID | Ongelma | Vaikutus | Toistettavuus | Status | Omistaja |
|---|---|--------|---------|-----------|--------|---------|
| 1 | BUG-001 | Kassaprosessi kaatuu virheellisellä kortilla | Estää ostoksen tekemisen | Aina | Avattu | Dev Team |
| 2 | BUG-002 | Admin-paneeli ei lataudu mobiilissa | Estää hallinnan | Mobiilissa aina | Avattu | Dev Team |
| 3 | BUG-003 | Kielikäännös puuttuu ruotsista | Huono UX | Kaikissa tuotteissa | Avattu | Content Team |

### 6.2 Keskitasoiset virheet (Priority 2 - Haittaavat käyttökokemusta)
| # | Bug ID | Ongelma | Vaikutus | Toistettavuus | Status | Omistaja |
|---|---|--------|---------|-----------|--------|---------|
| 4 | BUG-004 | Hakutulokset eivät järjestä hintaan | Huono löydettävyys | Firefoxissa | Avattu | Dev Team |
| 5 | BUG-005 | Sähköpostivahvistus ei lähetä | Käyttäjä ei saa vahvistusta | Sandboxissa | Hyväksytty | Dev Team |

### 6.3 Pienet puutteet ja parannukset (Priority 3 - Kosmeettiset)
| # | Bug ID | Ongelma | Vaikutus | Toistettavuus | Status | Omistaja |
|---|---|--------|---------|-----------|--------|---------|
| 6 | BUG-006 | CSS-tyylit hajovat tabletissa | Visuaalinen ongelma | Satunnainen | Avattu | Design Team |
| 7 | BUG-007 | Linkki avautuu uuteen välilehteen | Odottamaton käyttäytyminen | Kaikissa linkeissä | Ehdotettu | UX Team |

## 7. Riskiarviointi ja prioriteetit

### Riskitasot
- **Kriittinen:** Estää perustoiminnallisuuden (P1-viat)
- **Korkea:** Haittaa käyttökokemusta merkittävästi (P2-viat)
- **Keskitaso:** Pienet ongelmat, jotka voidaan hyväksyä (P3-viat)

### Jatkotoimenpiteet
1. **Välitön korjaus:** P1-viat korjataan ennen julkaisua
2. **Seuraava sprintti:** P2-viat korjataan seuraavassa iteraatiossa
3. **Jatkokehitys:** P3-parannukset seuraavissa versioissa

### Suositellut jatkotestit
- [ ] Uudelleentestaus korjausten jälkeen (regression)
- [ ] Käyttäjätestaus / hyväksymistestaus (UAT)
- [ ] Monikielisyystestaus jokaisella kielellä perusteellisesti
- [ ] Suorituskykytestaus (latausajat, responsiivisuus)
- [ ] Turvallisuustestaus (OWASP top 10)
- [ ] Esteettömyystestaus (WCAG 2.1 AA)

## 8. Testin päätös ja hyväksyntä

### Julkaisusuositus
- [ ] **Julkaisuvalmis** - Kaikki P1-viat korjattu
- [ ] **Ehdollisesti julkaisukelpoinen** - P1-viat korjattu, P2-viat dokumentoitu
- [ ] **Ei julkaistava** - Kriittisiä vikoja jäljellä

### Hyväksyjät
| Nimi | Rooli | Hyväksyntä | Päivämäärä |
|------|-------|------------|------------|
| [Nimi] | Testauskoordinaattori | [allekirjoitus] | [päivämäärä] |
| [Nimi] | Tuotepäällikkö | [allekirjoitus] | [päivämäärä] |
| [Nimi] | Tekninen johtaja | [allekirjoitus] | [päivämäärä] |

---

## 9. Liitteet ja lisätiedot

### Dokumentaatio
- Testisuunnitelma: [linkki]
- Testitapaukset: [linkki]
- Bugiraportit: [linkki JIRA/trello]
- Kuvankaappaukset: [linkki kansio]

### Kommunikaatio ja seuranta
- Testiryhmän kokoukset: [esim. päivittäin klo 9:00 Teamsissa]
- Bugien päivitykset: [esim. JIRA:ssa reaaliajassa]
- Raportit: [esim. viikoittain sähköpostilla]
- Ongelmien eskalaatio: [esim. P1-viat välittömästi Slackissa]

### Huomioita suurista ryhmistä
- Kommunikointi tapahtuu pääasiassa Teams-kanavalla #qa-testing
- Vastuuhenkilöt on määritelty kullekin moduulille
- Aikataulut noudattavat sprintin rajautumista (perjantai klo 17:00)
- Dokumentaatio päivitetään reaaliajassa Google Docsissa

### Versiohistoria
- v1.0 - Alkuperäinen malli (2026-04-14)
- [v1.1 - Päivitykset...]
