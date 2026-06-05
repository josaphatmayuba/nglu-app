-- Dev only - production logs over ~12 months so dashboard period filters show backend data.
-- Covers milk, eggs, growth, biomass and wool for demo FarmOS species.

DELETE FROM farmos_production_logs WHERE organization_id = 1;

-- Demo animal ids.
SET @cow1 = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'cow' ORDER BY id LIMIT 1);
SET @cow2 = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'cow' ORDER BY id LIMIT 1 OFFSET 1);
SET @chicken = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'chicken' ORDER BY id LIMIT 1);
SET @pig = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'pig' ORDER BY id LIMIT 1);
SET @fish = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'fish' ORDER BY id LIMIT 1);
SET @goat = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'goat' ORDER BY id LIMIT 1);
SET @sheep = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'sheep' ORDER BY id LIMIT 1);
SET @rabbit = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'rabbit' ORDER BY id LIMIT 1);
SET @duck = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'duck' ORDER BY id LIMIT 1);
SET @turkey = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'turkey' ORDER BY id LIMIT 1);

-- Generate production rows with recursive CTEs (MySQL 8+).
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
       'oeufs',
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
WITH RECURSIVE d (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 51)
SELECT 1, @fish, 'fish', 'biomass',
       DATE_SUB(CURDATE(), INTERVAL n * 7 DAY),
       'day',
       ROUND(2450 + (52 - n) * 18 + 120 * SIN(n / 8.0) + (RAND() * 80 - 40), 1),
       'kg',
       NOW(), NOW()
FROM d;

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
WITH RECURSIVE d (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 364)
SELECT 1, @goat, 'goat', 'milk',
       DATE_SUB(CURDATE(), INTERVAL n DAY),
       'AM',
       ROUND(7.5 + 1.2 * SIN(n / 16.0) + (RAND() * 0.8 - 0.4), 1),
       'L',
       NOW(), NOW()
FROM d;

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
WITH RECURSIVE d (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 364)
SELECT 1, @duck, 'duck', 'eggs',
       DATE_SUB(CURDATE(), INTERVAL n DAY),
       'day',
       ROUND(570 + 45 * SIN(n / 18.0) + (RAND() * 35 - 17)),
       'oeufs',
       NOW(), NOW()
FROM d;

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
WITH RECURSIVE d (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 51)
SELECT 1, @turkey, 'turkey', 'growth',
       DATE_SUB(CURDATE(), INTERVAL n * 7 DAY),
       'day',
       ROUND(8.8 + (52 - n) * 0.04 + (RAND() * 0.35 - 0.15), 1),
       'kg',
       NOW(), NOW()
FROM d;

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
WITH RECURSIVE d (n) AS (SELECT 0 UNION ALL SELECT n + 1 FROM d WHERE n < 51)
SELECT 1, @rabbit, 'rabbit', 'growth',
       DATE_SUB(CURDATE(), INTERVAL n * 7 DAY),
       'day',
       ROUND(34 + 4 * SIN(n / 7.0) + (RAND() * 2 - 1), 1),
       'g/j',
       NOW(), NOW()
FROM d;

INSERT INTO farmos_production_logs (organization_id, animal_id, species, product_type, log_date, period, quantity, unit, created_at, updated_at)
VALUES
  (1, @sheep, 'sheep', 'wool', DATE_SUB(CURDATE(), INTERVAL 30 DAY), 'day', 4.8, 'kg', NOW(), NOW()),
  (1, @sheep, 'sheep', 'wool', DATE_SUB(CURDATE(), INTERVAL 210 DAY), 'day', 5.1, 'kg', NOW(), NOW());
