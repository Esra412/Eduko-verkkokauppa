-- Poistaa kaikki kategoriat paitsi metalli (3), raksa (7) ja logistiikka (4)
-- Poistaa tuotteet näiden kategorioiden alta

DELETE FROM products WHERE category_id IN (1, 2, 5, 6, 8, 9, 10, 11);
DELETE FROM categories WHERE id IN (1, 2, 5, 6, 8, 9, 10, 11);
