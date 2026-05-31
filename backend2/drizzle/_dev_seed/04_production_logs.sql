-- Dev only — production logs étalés sur ~12 mois pour que les boutons
-- 7 jours / 30 jours / Trimestre / Année du dashboard montrent du contenu.

DELETE FROM farmos_production_logs WHERE organization_id = 1;

-- Récup des id animaux de la démo (cow #1-3, pig #4-6, chicken #7-8 (lots), sheep #9, goat #10)
SET @cow1 = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'cow' ORDER BY id LIMIT 1);
SET @cow2 = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'cow' ORDER BY id LIMIT 1 OFFSET 1);
SET @chicken = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'chicken' ORDER BY id LIMIT 1);
SET @pig = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'pig' ORDER BY id LIMIT 1);
SET @sheep = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'sheep' ORDER BY id LIMIT 1);

-- Génère 365 jours de production via une CTE récursive (MySQL 8+).
INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
WITH RECURSIVE d (n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM d WHERE n < 364
)
SELECT 1, @cow1, 'cow', 'milk',
       DATE_SUB(CURDATE(), INTERVAL n DAY),
       'AM',
       ROUND(22 + 4 * SIN(n / 18.0) + (RAND() * 3 - 1.5), 1),
       'L',
       NOW(), NOW()
FROM d;

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
WITH RECURSIVE d (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 364)
SELECT 1, @cow2, 'cow', 'milk',
       DATE_SUB(CURDATE(), INTERVAL n DAY),
       'PM',
       ROUND(18 + 3 * SIN(n / 14.0) + (RAND() * 2.5 - 1.25), 1),
       'L',
       NOW(), NOW()
FROM d;

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
WITH RECURSIVE d (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 364)
SELECT 1, @chicken, 'chicken', 'eggs',
       DATE_SUB(CURDATE(), INTERVAL n DAY),
       'day',
       ROUND(3800 + 250 * SIN(n / 22.0) + (RAND() * 200 - 100)),
       'œufs',
       NOW(), NOW()
FROM d;

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
WITH RECURSIVE d (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 51)
SELECT 1, @pig, 'pig', 'growth',
       DATE_SUB(CURDATE(), INTERVAL n * 7 DAY),
       'day',
       ROUND(68 + (RAND() * 8 - 4), 1),
       'kg',
       NOW(), NOW()
FROM d;

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
VALUES
  (1, @sheep, 'sheep', 'wool', DATE_SUB(CURDATE(), INTERVAL 30 DAY), 'day', 4.8, 'kg', NOW(), NOW()),
  (1, @sheep, 'sheep', 'wool', DATE_SUB(CURDATE(), INTERVAL 210 DAY), 'day', 5.1, 'kg', NOW(), NOW());
