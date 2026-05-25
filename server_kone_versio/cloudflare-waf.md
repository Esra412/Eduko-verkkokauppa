# Cloudflare WAF - ohjeet verkkokaupalle

Tämä dokumentti selittää, miten kaupan eteen voidaan ottaa WAF-palvelu, kuten Cloudflare, sekä mitä toimintoja sen kautta kannattaa käyttää.

## Mikä on WAF?

Web Application Firewall (WAF) on palvelu, joka suodattaa haitallisen HTTP-liikenteen ennen kuin se saavuttaa verkkokaupan palvelimen. WAF tunnistaa ja estää yleisimpiä hyökkäyksiä, kuten:

- SQL-injektiot
- Cross-site scripting (XSS)
- Bottiliikenteen ja automatisoidut hyökkäykset
- HTTP-pyyntöjen vääristelyn ja haitalliset käyttöliittymärakenteet

## Cloudflaren rooli

Cloudflare toimii välityspalvelimena (reverse proxy). Kun käytät Cloudflarea:

1. Domainisi DNS osoittaa Cloudflarelle.
2. Cloudflare proxyttää liikenteen ja piilottaa varsinaisen palvelimesi IP-osoitteen.
3. Pyyntöjä tarkistetaan ja suodatetaan ennen kuin ne toimitetaan palvelimelle.

## Miten se toimii käytännössä

1. Rekisteröidy Cloudflareen ja lisää verkkotunnuksesi.
2. Päivitä domainin nimipalvelimet Cloudflaren antamiin nameservereihin.
3. Lisää Cloudflareen DNS-tietueet palvelimelle (`A`, `CNAME`), ja aseta ne proxy-tilaan (oranssi pilvi).
4. Ota Cloudflaren WAF käyttöön.
5. Aktivoi tarvittavat sääntöjoukot:
   - SQL Injection -säännöt
   - Cross-site scripting (XSS) -säännöt
   - OWASP Core Rule Set
   - Bot Fight Mode
   - Browser Integrity Check
6. Lisää tarvittaessa lisäsäännöt Cloudflaren Firewall Rules -osioon, esimerkiksi:
   - estä epäilyttävät user-agentit
   - rajoita tuntemattomien IP-osoitteiden pääsyä admin-polkuun
   - salli vain Cloudflaren IP-osoitteet palvelimen palomuurissa

## Suositellut asetukset

- WAF: Päällä
- SSL/TLS: Full tai Full (strict) käyttämällä Cloudflaren ja origin-palvelimen välillä TLS-salausta
- Always Use HTTPS: Päällä
- HTTP Strict Transport Security (HSTS): tarvittaessa
- Bot Fight Mode: Päällä
- Browser Integrity Check: Päällä
- Rate Limiting: asetettuna rajattuihin kritisiin reitteihin, kuten `/verkkokauppa/kaupan-takahuone` ja kirjautumissivuille
- Page Rules: tarvittaessa kirkastamaan https- ja välimuistiasetuksia

## Tärkeät huomautukset

- Cloudflare suojaa vain siihen laskevaa liikennettä. Jos palvelimelle pääsee suoraan alkuperäisen IP-osoitteen kautta, suojauksesta tulee vajaata.
- Palvelimen palomuurissa kannattaa sallia vain Cloudflaren IP-osoitteet ja estää suora julkinen pääsy muilta IP-osoitteilta.
- Origin-palvelimen osoitetta ei tulisi näyttää julkisesti.

## Mitä sinun pitää tehdä tässä projektissa

- Tarpeen mukaan lisätä mukana oleviin validointeihin ja suodattimiin:
  - palvelinpuolen SQL-injektionestot
  - syötteen puhdistus XSS-tilanteissa
- Konfiguroi Cloudflare siten, että liikenne kulkee sen läpi ennen palvelinta.
- Pidä `server.js` ja mahdolliset proxy-asetukset ajan tasalla, jos käytät Cloudflaren `X-Forwarded-For` -päätettä.

## Miksi tämä on hyvä käytäntö

Cloudflare WAF tarjoaa toisen suojakerroksen koodin ja palvelimen päälle. Se vähentää riskiä, että hyökkäykset kuten SQL-injektiot ja XSS ehtivät aiheuttaa vahinkoa ennen kuin pyynnöt saavuttavat sovelluksen.

## Lisätieto

Jos haluat käyttää yhtä luotettavaa vaihtoehtoa Cloudflaren sijaan, voit valita myös muita WAF-palveluja, kuten:

- AWS WAF
- Azure Front Door
- Fastly
- Imperva
- Sucuri

Cloudflare on kuitenkin usein käytetyin ja helppokäyttöisin juuri tämän tyyppiseen verkkokauppaan.
