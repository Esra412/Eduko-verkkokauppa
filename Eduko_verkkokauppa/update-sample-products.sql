-- Päivitä olemassa olevat tuotteet kielillä testaamista varten
-- ID 3 on olemassa "hee" tuote

UPDATE products SET 
    name_fi = "Kissat", 
    name_en = "Cats", 
    name_sv = "Katter",
    description_fi = "Kauheet kissaa - opiskelijoiden tekemiä kissakuvauksia",
    description_en = "Beautiful cats - student-made cat descriptions",
    description_sv = "Vacker katter - studentgjorda kattbeskrivningar"
WHERE id = 3;
