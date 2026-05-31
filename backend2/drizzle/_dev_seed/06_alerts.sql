-- Dev only — déclenche des alertes variées dans le dashboard / écran Alertes.
-- Trois sources d'alertes (cf. deriveAlerts dans screens.jsx) :
--   1. Stock faible        → médicaments avec quantity < min_quantity (critical si < min/2)
--   2. Délai de retrait    → traitements running avec end_date future + withdrawal
--   3. Mises bas imminentes → events repro entre J92 % et J107 % de gestation
-- + on marque quelques animaux "sick" pour les KPI dashboard.

-- 1) Stock faible (4 alertes : 2 critical + 2 high)
UPDATE farmos_medicines
SET quantity = CASE name
                 WHEN 'Pénicilline'   THEN 1     -- critical (< min/2)
                 WHEN 'Maïs concassé' THEN 15    -- critical
                 WHEN 'Ivermectine'   THEN 4     -- high (between min/2 et min)
                 WHEN 'Granulés ponte' THEN 18  -- high
                 ELSE quantity END,
    min_quantity = CASE name
                     WHEN 'Pénicilline'    THEN 5
                     WHEN 'Maïs concassé'  THEN 50
                     WHEN 'Ivermectine'    THEN 6
                     WHEN 'Granulés ponte' THEN 25
                     ELSE min_quantity END
WHERE organization_id = 1 AND name IN ('Pénicilline','Maïs concassé','Ivermectine','Granulés ponte');

-- 2) Traitements avec délai de retrait actif (3 alertes critical)
SET @cow_with_milk = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'cow' ORDER BY id LIMIT 1);
SET @cow2 = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'cow' ORDER BY id LIMIT 1 OFFSET 1);
SET @chick = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'chicken' ORDER BY id LIMIT 1);
SET @pig_with_meat = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'pig' ORDER BY id LIMIT 1);
SET @disease_mammite = (SELECT id FROM farmos_diseases WHERE organization_id IS NULL AND species = 'cow' ORDER BY id LIMIT 1);
SET @disease_chick   = (SELECT id FROM farmos_diseases WHERE organization_id IS NULL AND species = 'chicken' ORDER BY id LIMIT 1);
SET @disease_pig     = (SELECT id FROM farmos_diseases WHERE organization_id IS NULL AND species = 'pig' ORDER BY id LIMIT 1);

INSERT INTO farmos_treatments (organization_id, animal_id, medicine_id, disease_id, medicine_name, dosage, route, start_date, end_date, vet, withdrawal_meat_days, withdrawal_milk_hours, withdrawal_eggs_days, status, notes, created_at, updated_at)
VALUES
  (1, @cow_with_milk, NULL, @disease_mammite, 'Pénicilline G',  '15 mg/kg', 'Injection',     DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 4 DAY),  'Dr. Boucher', 28, 96, NULL, 'running', 'Mammite traitée', NOW(), NOW()),
  (1, @cow2,          NULL, @disease_mammite, 'Oxytétracycline', '20 mg/kg', 'Injection',    DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 6 DAY),  'Dr. Lavoie',  21, 72, NULL, 'running', 'Retrait lait actif', NOW(), NOW()),
  (1, @chick,         NULL, @disease_chick,   'Amoxicilline',    '10 mg/kg', 'Eau de boisson', DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 3 DAY),  'Dr. Boucher', NULL, NULL, 7, 'running', 'Coryza', NOW(), NOW()),
  (1, @pig_with_meat, NULL, @disease_pig,     'Tulathromycine',  '2.5 mg/kg', 'Injection',    DATE_SUB(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 7 DAY),  'Dr. Lavoie',  35, NULL, NULL, 'running', 'Pneumonie porcine', NOW(), NOW());

-- 3) Mises bas imminentes (cow 283 j, pig 114 j, goat 152 j, sheep 152 j)
SET @cow_repro    = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'cow'   AND (sex = 'F' OR sex IS NULL) ORDER BY id LIMIT 1);
SET @pig_repro    = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'pig'   AND (sex = 'F' OR sex IS NULL) ORDER BY id LIMIT 1);
SET @goat_repro   = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'goat'  AND (sex = 'F' OR sex IS NULL) ORDER BY id LIMIT 1);
SET @sheep_repro  = (SELECT id FROM farmos_animals WHERE organization_id = 1 AND species = 'sheep' AND (sex = 'F' OR sex IS NULL) ORDER BY id LIMIT 1);

INSERT INTO farmos_reproduction_events (organization_id, animal_id, event_type, event_date, expected_due_date, outcome, partner_external_id, notes, created_at, updated_at)
SELECT * FROM (
  SELECT 1 AS o, @cow_repro AS a,    'insemination' AS t, DATE_SUB(CURDATE(), INTERVAL 273 DAY) AS d, DATE_ADD(CURDATE(), INTERVAL 10 DAY) AS due, 'pending' AS oc, 'Holstein #2042' AS p, 'Gestation J273 sur 283' AS n, NOW() AS c, NOW() AS u WHERE @cow_repro   IS NOT NULL UNION ALL
  SELECT 1, @pig_repro,   'insemination',                  DATE_SUB(CURDATE(), INTERVAL 110 DAY),       DATE_ADD(CURDATE(), INTERVAL 4 DAY),  'pending', 'Verrat L-12',     'Gestation J110 sur 114',         NOW(), NOW() WHERE @pig_repro   IS NOT NULL UNION ALL
  SELECT 1, @goat_repro,  'insemination',                  DATE_SUB(CURDATE(), INTERVAL 145 DAY),       DATE_ADD(CURDATE(), INTERVAL 7 DAY),  'pending', 'Bouc Saanen 04',  'Gestation J145 sur 152',         NOW(), NOW() WHERE @goat_repro  IS NOT NULL UNION ALL
  SELECT 1, @sheep_repro, 'insemination',                  DATE_SUB(CURDATE(), INTERVAL 148 DAY),       DATE_ADD(CURDATE(), INTERVAL 4 DAY),  'pending', 'Bélier Suffolk',  'Gestation J148 sur 152',         NOW(), NOW() WHERE @sheep_repro IS NOT NULL
) src;

-- 4) Quelques animaux malades (alimente le KPI "Animaux malades" + tag rouge dans la liste)
UPDATE farmos_animals
SET status = 'sick'
WHERE organization_id = 1 AND id IN (@cow_with_milk, @cow2, @chick, @pig_with_meat);
