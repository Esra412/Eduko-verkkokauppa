-- Lisää kielen spesifiiset nimet products-tauluun
ALTER TABLE products 
ADD COLUMN name_fi VARCHAR(255) DEFAULT NULL,
ADD COLUMN name_en VARCHAR(255) DEFAULT NULL,
ADD COLUMN name_sv VARCHAR(255) DEFAULT NULL;

-- Kopioi nykyiset nimet name_fi-sarakkeeseen (väliaikaiset tai testituotteet)
UPDATE products 
SET name_fi = name 
WHERE name_fi IS NULL;
