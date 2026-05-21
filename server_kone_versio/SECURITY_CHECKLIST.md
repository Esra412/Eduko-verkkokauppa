# Verkkokaupan kyberturvallisuus

## Toteutettu koodissa

- Liialliset kirjautumisyritykset lukitaan IP-osoitteen perusteella: 5 virhettä 15 minuutin sisällä lukitsee kirjautumisen 15 minuutiksi.
- Vanha `/login`, `/verkkokauppa/login`, `/admin` ja `/verkkokauppa/admin` palauttavat nyt 404-sivun. Uusi kirjautumisosoite on `/verkkokauppa/kaupan-takahuone`.
- Admin-salasanat eivät ole enää selkokielisinä. Ne tarkistetaan suolattuina PBKDF2-SHA256-tiivisteinä ja vertailu tehdään `timingSafeEqual`-funktiolla.
- OTP-koodi vanhenee 10 minuutissa.
- Sessioeväste on `httpOnly`, `sameSite: lax` ja tuotannossa `secure`.
- Perustason turvaotsakkeet on lisätty: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` ja `Permissions-Policy`.
- Evästesuostumus on lisätty kaikkiin HTML-sivuihin. Analytiikka- ja markkinointitoimintoja saa käynnistää vasta, jos `window.edukoCookieConsent.canUseAnalytics()` tai `canUseMarketing()` palauttaa `true`.

## Palvelin- ja ylläpitotoimet

- Vaihda tuotannossa `SESSION_SECRET` ympäristömuuttujaan, jotta sessiot pysyvät voimassa palvelimen uudelleenkäynnistyksissä.
- Siirrä tietokannan, Paytrailin ja SMTP:n salaisuudet pois koodista ympäristömuuttujiin.
- Vaihda nykyiset harjoitussalasanat vahvoihin yksilöllisiin salasanoihin ja päivitä niiden tiivisteet.
- Ota kaupan eteen WAF, esimerkiksi Cloudflare, ja laita päälle SQL-injektioiden, XSS-hyökkäysten ja bottiliikenteen suodatus.
- Ajasta tietokannan ja `uploads`-kansion varmuuskopio kerran päivässä. Säilytä kopiot vähintään 30 päivää eri palvelimella tai pilvitallennuksessa.
- Testaa varmuuskopion palautus säännöllisesti. Varmuuskopio on hyödyllinen vasta, kun palautus on todettu toimivaksi.
