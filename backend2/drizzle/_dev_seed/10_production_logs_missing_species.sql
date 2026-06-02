-- Dev only - supplement production logs without deleting existing user/dev rows.
-- Adds backend data for species that would otherwise show empty production cards.

UPDATE farmos_production_logs
SET unit = 'oeufs'
WHERE organization_id = 1 AND product_type = 'eggs' AND unit <> 'oeufs';

SET @fish = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'fish' ORDER BY id LIMIT 1);
SET @goat = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'goat' ORDER BY id LIMIT 1);
SET @rabbit = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'rabbit' ORDER BY id LIMIT 1);
SET @duck = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'duck' ORDER BY id LIMIT 1);
SET @turkey = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'turkey' ORDER BY id LIMIT 1);

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
WITH RECURSIVE d (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 51)
SELECT src.organization_id, src.animal_id, src.species, src.product_type, src.log_date, src.period, src.quantity, src.unit, NOW(), NOW()
FROM (
  SELECT 1 AS organization_id, @fish AS animal_id, 'fish' AS species, 'biomass' AS product_type,
         DATE_SUB(CURDATE(), INTERVAL n * 7 DAY) AS log_date, 'day' AS period,
         ROUND(2450 + (52 - n) * 18 + 120 * SIN(n / 8.0), 1) AS quantity, 'kg' AS unit
  FROM d
) src
LEFT JOIN farmos_production_logs existing
  ON existing.organization_id = src.organization_id
 AND existing.animal_id = src.animal_id
 AND existing.species = src.species
 AND existing.product_type = src.product_type
 AND existing.log_date = src.log_date
 AND existing.period = src.period
WHERE src.animal_id IS NOT NULL AND existing.id IS NULL;

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
WITH RECURSIVE d (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 364)
SELECT src.organization_id, src.animal_id, src.species, src.product_type, src.log_date, src.period, src.quantity, src.unit, NOW(), NOW()
FROM (
  SELECT 1 AS organization_id, @goat AS animal_id, 'goat' AS species, 'milk' AS product_type,
         DATE_SUB(CURDATE(), INTERVAL n DAY) AS log_date, 'AM' AS period,
         ROUND(7.5 + 1.2 * SIN(n / 16.0), 1) AS quantity, 'L' AS unit
  FROM d
) src
LEFT JOIN farmos_production_logs existing
  ON existing.organization_id = src.organization_id
 AND existing.animal_id = src.animal_id
 AND existing.species = src.species
 AND existing.product_type = src.product_type
 AND existing.log_date = src.log_date
 AND existing.period = src.period
WHERE src.animal_id IS NOT NULL AND existing.id IS NULL;

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
WITH RECURSIVE d (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 364)
SELECT src.organization_id, src.animal_id, src.species, src.product_type, src.log_date, src.period, src.quantity, src.unit, NOW(), NOW()
FROM (
  SELECT 1 AS organization_id, @duck AS animal_id, 'duck' AS species, 'eggs' AS product_type,
         DATE_SUB(CURDATE(), INTERVAL n DAY) AS log_date, 'day' AS period,
         ROUND(570 + 45 * SIN(n / 18.0)) AS quantity, 'oeufs' AS unit
  FROM d
) src
LEFT JOIN farmos_production_logs existing
  ON existing.organization_id = src.organization_id
 AND existing.animal_id = src.animal_id
 AND existing.species = src.species
 AND existing.product_type = src.product_type
 AND existing.log_date = src.log_date
 AND existing.period = src.period
WHERE src.animal_id IS NOT NULL AND existing.id IS NULL;

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
WITH RECURSIVE d (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 51)
SELECT src.organization_id, src.animal_id, src.species, src.product_type, src.log_date, src.period, src.quantity, src.unit, NOW(), NOW()
FROM (
  SELECT 1 AS organization_id, @turkey AS animal_id, 'turkey' AS species, 'growth' AS product_type,
         DATE_SUB(CURDATE(), INTERVAL n * 7 DAY) AS log_date, 'day' AS period,
         ROUND(8.8 + (52 - n) * 0.04, 1) AS quantity, 'kg' AS unit
  FROM d
) src
LEFT JOIN farmos_production_logs existing
  ON existing.organization_id = src.organization_id
 AND existing.animal_id = src.animal_id
 AND existing.species = src.species
 AND existing.product_type = src.product_type
 AND existing.log_date = src.log_date
 AND existing.period = src.period
WHERE src.animal_id IS NOT NULL AND existing.id IS NULL;

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
WITH RECURSIVE d (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 51)
SELECT src.organization_id, src.animal_id, src.species, src.product_type, src.log_date, src.period, src.quantity, src.unit, NOW(), NOW()
FROM (
  SELECT 1 AS organization_id, @rabbit AS animal_id, 'rabbit' AS species, 'growth' AS product_type,
         DATE_SUB(CURDATE(), INTERVAL n * 7 DAY) AS log_date, 'day' AS period,
         ROUND(34 + 4 * SIN(n / 7.0), 1) AS quantity, 'g/j' AS unit
  FROM d
) src
LEFT JOIN farmos_production_logs existing
  ON existing.organization_id = src.organization_id
 AND existing.animal_id = src.animal_id
 AND existing.species = src.species
 AND existing.product_type = src.product_type
 AND existing.log_date = src.log_date
 AND existing.period = src.period
WHERE src.animal_id IS NOT NULL AND existing.id IS NULL;
