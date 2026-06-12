-- Idempotent. Seed de protocoles exemples + delais de retrait + condition (moteur de regles).
-- Demontre la regle asymetrique: rappel uniquement si zone a haut risque. Sans apostrophe dans les commentaires.

-- 1) Delais de retrait (0 jour) sur les homologations volaille a denrees.
INSERT IGNORE INTO `vx_withdrawal_periods` (`registration_id`,`produce_type`,`withdrawal_days`)
SELECT rg.id, pt.t, 0
FROM `vx_registrations` rg
JOIN `vx_vaccines` v ON v.id = rg.`vaccine_id`
JOIN (SELECT 'meat' AS t UNION ALL SELECT 'eggs') pt
WHERE v.`product_name` IN ('Newcastle (ND) - souche La Sota','Gumboro (IBD)','Bronchite infectieuse (IB) - H120')
  AND NOT EXISTS (SELECT 1 FROM `vx_withdrawal_periods` w WHERE w.`registration_id` = rg.id AND w.`produce_type` = pt.t);
--> statement-breakpoint

-- 2) Protocole Newcastle / Volaille (si absent).
INSERT IGNORE INTO `vx_protocols` (`vaccine_id`,`species_id`,`source_guideline`,`protocol_category`)
SELECT v.id, sp.id, 'WOAH-TAHC', 'core'
FROM `vx_vaccines` v
JOIN `vx_species` sp ON sp.`common_name_fr` = 'Volaille'
WHERE v.`product_name` = 'Newcastle (ND) - souche La Sota'
  AND NOT EXISTS (
    SELECT 1 FROM `vx_protocols` p WHERE p.`vaccine_id` = v.id AND p.`species_id` = sp.id
  );
--> statement-breakpoint

-- 3) Etape 1 : primo a J1-7 (toujours applicable).
INSERT IGNORE INTO `vx_protocol_steps` (`protocol_id`,`step_order`,`age_min_days`,`age_max_days`,`dose_amount`,`dose_unit`,`route`)
SELECT p.id, 1, 1, 7, 1.000, 'dose', 'oculo-nasal ou eau de boisson'
FROM `vx_protocols` p
JOIN `vx_vaccines` v ON v.id = p.`vaccine_id`
WHERE v.`product_name` = 'Newcastle (ND) - souche La Sota'
  AND NOT EXISTS (SELECT 1 FROM `vx_protocol_steps` s WHERE s.`protocol_id` = p.id AND s.`step_order` = 1);
--> statement-breakpoint

-- 4) Etape 2 : rappel a +21 j (conditionnel zone haut risque).
INSERT IGNORE INTO `vx_protocol_steps` (`protocol_id`,`step_order`,`interval_from_prev_days`,`dose_amount`,`dose_unit`,`route`)
SELECT p.id, 2, 21, 1.000, 'dose', 'eau de boisson'
FROM `vx_protocols` p
JOIN `vx_vaccines` v ON v.id = p.`vaccine_id`
WHERE v.`product_name` = 'Newcastle (ND) - souche La Sota'
  AND NOT EXISTS (SELECT 1 FROM `vx_protocol_steps` s WHERE s.`protocol_id` = p.id AND s.`step_order` = 2);
--> statement-breakpoint

-- 5) Condition zone a haut risque (si absente).
INSERT IGNORE INTO `vx_conditions` (`condition_type`,`operator`,`expected_value`)
SELECT 'risk_zone','=','high'
WHERE NOT EXISTS (SELECT 1 FROM `vx_conditions` c WHERE c.`condition_type`='risk_zone' AND c.`operator`='=' AND c.`expected_value`='high');
--> statement-breakpoint

-- 6) Rattache la condition a l etape 2 (rappel).
INSERT IGNORE INTO `vx_protocol_step_conditions` (`protocol_step_id`,`condition_id`,`is_mandatory`)
SELECT s.id, c.id, 1
FROM `vx_protocol_steps` s
JOIN `vx_protocols` p ON p.id = s.`protocol_id`
JOIN `vx_vaccines` v ON v.id = p.`vaccine_id`
JOIN `vx_conditions` c ON c.`condition_type`='risk_zone' AND c.`operator`='=' AND c.`expected_value`='high'
WHERE v.`product_name` = 'Newcastle (ND) - souche La Sota' AND s.`step_order` = 2;
