-- 2) Animaux représentatifs (15 individus / lots).
INSERT IGNORE INTO `farmos_animals`
  (`organization_id`, `external_id`, `name`, `species`, `race`, `sex`, `date_of_birth`, `weight`, `lot`, `barn`, `status`, `withdrawal_until`, `withdrawal_kind`, `last_event`) VALUES
  (1, 'BQ-2024-0118', 'Marguerite',          'cow',     'Holstein',         'F',     '2021-03-14', 612.00, 'Lot A',       'Étable 1',   'healthy',   NULL,         NULL,    'Insémination · 14 déc.'),
  (1, 'BQ-2024-0119', 'Clémence',            'cow',     'Holstein',         'F',     '2020-07-22', 658.00, 'Lot A',       'Étable 1',   'treatment', '2026-06-04', 'milk',  'Traitement mammite · J+2'),
  (1, 'BQ-2024-0120', 'Aurore',              'cow',     'Jersey',           'F',     '2022-01-11', 480.00, 'Lot B',       'Étable 1',   'healthy',   NULL,         NULL,    'Tarissement · 18 mai'),
  (1, 'BQ-2024-0121', 'Pivoine',             'cow',     'Jersey',           'F',     '2019-04-02', 502.00, 'Lot B',       'Étable 2',   'alert',     NULL,         NULL,    '↓ Lait depuis 3 j'),
  (1, 'PR-2026-A032', 'Truie #A032',         'pig',     'Large White',      'F',     '2023-09-01', 245.00, 'Maternité 3', 'Salle 3',    'healthy',   NULL,         NULL,    'IA · 18 fév.'),
  (1, 'PR-2026-A077', 'Lot Engr. 77',        'pig',     'Duroc × LW',       'Mixte', '2025-12-10',  68.00, 'Engr. 77',    'Salle 6',    'treatment', '2026-06-12', 'meat',  'Antibio collectif · J+4'),
  (1, 'AV-2026-L14',  'Lot Pondeuses 14',    'chicken', 'Lohmann Brown',    'F',     '2025-08-04',   2.00, 'Lot 14',      'Bâtiment B2','healthy',   NULL,         NULL,    'Taux ponte 92 %'),
  (1, 'AV-2026-L09',  'Lot Chair 09',        'chicken', 'Ross 308',         'Mixte', '2026-04-22',   1.40, 'Lot 09',      'Bâtiment B1','alert',     NULL,         NULL,    'Température 28 °C · alerte'),
  (1, 'AQ-B-04',      'Bassin Truite 04',    'fish',    'Truite arc-en-ciel','Mixte','2025-10-01', 420.00, 'Bassin 4',    'Circuit A',  'alert',     NULL,         NULL,    'O₂ à 6,1 mg/L'),
  (1, 'AQ-B-07',      'Bassin Tilapia 07',   'fish',    'Tilapia du Nil',   'Mixte', '2026-01-15', 280.00, 'Bassin 7',    'Circuit B',  'healthy',   NULL,         NULL,    'Croissance +3,2 %'),
  (1, 'CP-2024-066',  'Câline',              'goat',    'Saanen',           'F',     '2022-05-11',  64.00, 'Pâturage Nord','Bâtiment C','healthy',   NULL,         NULL,    'Pesée · 18 mai'),
  (1, 'OV-2025-211',  'Lot Mérinos 211',     'sheep',   'Mérinos',          'Mixte', '2024-03-20',  58.00, 'Pâturage Sud','Bergerie',   'treatment', NULL,         NULL,    'Vermifuge · J+6'),
  (1, 'LP-2026-019',  'Mère #019',           'rabbit',  'Néo-Zélandais',    'F',     '2024-11-12',   4.60, 'Rangée 2',    'Cuniculerie','healthy',   NULL,         NULL,    'Mise bas · 22 mai'),
  (1, 'CN-2026-L05',  'Lot Pékin 05',        'duck',    'Canard de Pékin',  'Mixte', '2025-09-04',   3.10, 'Lot 05',      'Bâtiment D', 'healthy',   NULL,         NULL,    'Ponte 88 %'),
  (1, 'DI-2026-L02',  'Lot Dindon 02',       'turkey',  'Bronze des Prés',  'Mixte', '2026-02-01',   9.40, 'Lot 02',      'Bâtiment E', 'healthy',   NULL,         NULL,    'GMQ 92 g/j');
--> statement-breakpoint

-- 3) Médicaments + alimentation (STOCK).
INSERT IGNORE INTO `farmos_medicines`
  (`organization_id`, `name`, `kind`, `quantity`, `unit`, `min_quantity`, `supplier`, `expiry_date`) VALUES
  (1, 'Granulé vache laitière 18 %',  'feed', 4820, 'kg',     1500, 'Coop Agri-Pro',     '2026-09-12'),
  (1, 'Aliment porc engraissement',   'feed',  120, 'kg',      500, 'Meunerie Tremblay', '2026-08-04'),
  (1, 'Aliment ponte poule',          'feed', 2410, 'kg',      800, 'Coop Agri-Pro',     '2026-07-22'),
  (1, 'Granulé truite 4 mm',          'feed',  640, 'kg',      200, 'Skretting',         '2026-10-30'),
  (1, 'Foin sec 1ère coupe',          'feed',   72, 'balles',   30, 'Ferme Lapierre',    NULL),
  (1, 'Mastijet Fort',                'med',    18, 'tubes',    10, 'Vétoquinol',        '2027-03-01'),
  (1, 'Tylan 200 (injectable)',       'med',     4, 'fl.',       6, 'Elanco',            '2026-08-12'),
  (1, 'Ivermectine pour-on',          'med',    12, 'L',         4, 'Boehringer',        '2027-06-04'),
  (1, 'Coccivac-D',                   'med',   240, 'doses',   100, 'MSD',               '2026-12-01'),
  (1, 'Sel de mer aquaculture',       'med',    80, 'kg',       20, 'Aquatech',          NULL);
--> statement-breakpoint

-- 4) Traitements actifs (lookup animal_id par external_id + disease_id par espèce/nom).
-- Mammite Clémence
INSERT INTO `farmos_treatments`
  (`organization_id`, `animal_id`, `medicine_id`, `disease_id`, `medicine_name`, `dosage`, `route`, `start_date`, `end_date`, `vet`, `withdrawal_milk_hours`, `withdrawal_meat_days`, `status`)
SELECT 1, a.id, m.id, d.id, 'Mastijet Fort', '1 inj./quartier', 'Intra-mammaire', '2026-05-22', '2026-05-25', 'Dr. Boucher', 216, 28, 'running'
FROM `farmos_animals` a
JOIN `farmos_medicines` m ON m.organization_id = 1 AND m.name = 'Mastijet Fort'
JOIN `farmos_diseases`  d ON d.organization_id IS NULL AND d.species = 'cow' AND d.name_fr = 'Mammite'
WHERE a.organization_id = 1 AND a.external_id = 'BQ-2024-0119'
  AND NOT EXISTS (SELECT 1 FROM `farmos_treatments` t WHERE t.organization_id = 1 AND t.animal_id = a.id AND t.start_date = '2026-05-22' AND t.medicine_id = m.id);
--> statement-breakpoint

-- Toux Lot Engr. 77
INSERT INTO `farmos_treatments`
  (`organization_id`, `animal_id`, `medicine_id`, `disease_id`, `medicine_name`, `dosage`, `route`, `start_date`, `end_date`, `vet`, `withdrawal_meat_days`, `status`)
SELECT 1, a.id, m.id, d.id, 'Tylan 200', '10 mg/kg', 'Eau de boisson', '2026-05-20', '2026-05-25', 'Dr. Lavoie', 14, 'running'
FROM `farmos_animals` a
JOIN `farmos_medicines` m ON m.organization_id = 1 AND m.name = 'Tylan 200 (injectable)'
JOIN `farmos_diseases`  d ON d.organization_id IS NULL AND d.species = 'pig' AND d.name_fr = 'Toux'
WHERE a.organization_id = 1 AND a.external_id = 'PR-2026-A077'
  AND NOT EXISTS (SELECT 1 FROM `farmos_treatments` t WHERE t.organization_id = 1 AND t.animal_id = a.id AND t.start_date = '2026-05-20' AND t.medicine_id = m.id);
--> statement-breakpoint

-- Parasites Lot Mérinos 211
INSERT INTO `farmos_treatments`
  (`organization_id`, `animal_id`, `medicine_id`, `disease_id`, `medicine_name`, `dosage`, `route`, `start_date`, `end_date`, `vet`, `withdrawal_meat_days`, `status`)
SELECT 1, a.id, m.id, d.id, 'Ivermectine', '0,2 mg/kg', 'Sous-cutanée', '2026-05-18', '2026-05-18', 'Dr. Boucher', 28, 'completed'
FROM `farmos_animals` a
JOIN `farmos_medicines` m ON m.organization_id = 1 AND m.name = 'Ivermectine pour-on'
JOIN `farmos_diseases`  d ON d.organization_id IS NULL AND d.species = 'sheep' AND d.name_fr = 'Parasites'
WHERE a.organization_id = 1 AND a.external_id = 'OV-2025-211'
  AND NOT EXISTS (SELECT 1 FROM `farmos_treatments` t WHERE t.organization_id = 1 AND t.animal_id = a.id AND t.start_date = '2026-05-18' AND t.medicine_id = m.id);
--> statement-breakpoint

-- Prévention coccidiose Lot Pondeuses 14
INSERT INTO `farmos_treatments`
  (`organization_id`, `animal_id`, `medicine_id`, `disease_id`, `medicine_name`, `dosage`, `route`, `start_date`, `end_date`, `vet`, `withdrawal_eggs_days`, `status`)
SELECT 1, a.id, m.id, d.id, 'Coccivac-D', '1 dose', 'Eau de boisson', '2026-05-15', '2026-05-15', 'Dr. Lavoie', 0, 'completed'
FROM `farmos_animals` a
JOIN `farmos_medicines` m ON m.organization_id = 1 AND m.name = 'Coccivac-D'
JOIN `farmos_diseases`  d ON d.organization_id IS NULL AND d.species = 'chicken' AND d.name_fr = 'Coccidiose'
WHERE a.organization_id = 1 AND a.external_id = 'AV-2026-L14'
  AND NOT EXISTS (SELECT 1 FROM `farmos_treatments` t WHERE t.organization_id = 1 AND t.animal_id = a.id AND t.start_date = '2026-05-15' AND t.medicine_id = m.id);
--> statement-breakpoint

-- Parasites externes Bassin Truite 04
INSERT INTO `farmos_treatments`
  (`organization_id`, `animal_id`, `medicine_id`, `disease_id`, `medicine_name`, `dosage`, `route`, `start_date`, `end_date`, `vet`, `withdrawal_meat_days`, `status`)
SELECT 1, a.id, m.id, d.id, 'Sel de mer', '5 g/L · 30 min', 'Bassin', '2026-05-23', '2026-05-23', 'Dr. Tremblay', 0, 'completed'
FROM `farmos_animals` a
JOIN `farmos_medicines` m ON m.organization_id = 1 AND m.name = 'Sel de mer aquaculture'
JOIN `farmos_diseases`  d ON d.organization_id IS NULL AND d.species = 'fish' AND d.name_fr = 'Parasites'
WHERE a.organization_id = 1 AND a.external_id = 'AQ-B-04'
  AND NOT EXISTS (SELECT 1 FROM `farmos_treatments` t WHERE t.organization_id = 1 AND t.animal_id = a.id AND t.start_date = '2026-05-23' AND t.medicine_id = m.id);
--> statement-breakpoint

-- 5) Événements de reproduction (gestations en cours).
INSERT INTO `farmos_reproduction_events`
  (`organization_id`, `animal_id`, `event_type`, `event_date`, `expected_due_date`, `outcome`, `notes`)
SELECT 1, a.id, 'insemination', '2025-12-14', '2026-09-20', 'pending', 'Gestation cow · 162 j'
FROM `farmos_animals` a
WHERE a.organization_id = 1 AND a.external_id = 'BQ-2024-0118'
  AND NOT EXISTS (SELECT 1 FROM `farmos_reproduction_events` r WHERE r.organization_id = 1 AND r.animal_id = a.id AND r.event_date = '2025-12-14');
--> statement-breakpoint

INSERT INTO `farmos_reproduction_events`
  (`organization_id`, `animal_id`, `event_type`, `event_date`, `expected_due_date`, `outcome`, `notes`)
SELECT 1, a.id, 'insemination', '2026-02-18', '2026-06-12', 'pending', 'Gestation truie · 98 j'
FROM `farmos_animals` a
WHERE a.organization_id = 1 AND a.external_id = 'PR-2026-A032'
  AND NOT EXISTS (SELECT 1 FROM `farmos_reproduction_events` r WHERE r.organization_id = 1 AND r.animal_id = a.id AND r.event_date = '2026-02-18');
--> statement-breakpoint

INSERT INTO `farmos_reproduction_events`
  (`organization_id`, `animal_id`, `event_type`, `event_date`, `offspring_count`, `outcome`, `notes`)
SELECT 1, a.id, 'birthing', '2026-05-22', 14, 'success', 'Portée · 14 lapereaux'
FROM `farmos_animals` a
WHERE a.organization_id = 1 AND a.external_id = 'LP-2026-019'
  AND NOT EXISTS (SELECT 1 FROM `farmos_reproduction_events` r WHERE r.organization_id = 1 AND r.animal_id = a.id AND r.event_date = '2026-05-22');
--> statement-breakpoint

-- 6) Ventes (semaine courante).
INSERT IGNORE INTO `farmos_sales`
  (`organization_id`, `species`, `product_type`, `quantity`, `unit`, `unit_price`, `total_amount`, `currency_id`, `buyer`, `sale_date`, `notes`) VALUES
  (1, 'cow',     'milk', 5412.00, 'L',      0.85,  4600.20, 15, 'Laiterie Régionale',     '2026-05-28', 'Collecte hebdo'),
  (1, 'chicken', 'eggs',  113736.00, 'œufs', 0.18, 20472.48, 15, 'Distrib. Oeufs Plus',   '2026-05-27', 'Lot Pondeuses 14 · 7 j'),
  (1, 'pig',     'meat',   1850.00, 'kg',   3.40,  6290.00, 15, 'Abattoir Coopératif',    '2026-05-26', 'Engr. 77 partiel'),
  (1, 'fish',    'meat',    420.00, 'kg',   9.50,  3990.00, 15, 'Poissonnerie du Quai',   '2026-05-25', 'Bassin Truite 04'),
  (1, 'sheep',   'wool',     85.00, 'kg',  12.00,  1020.00, 15, 'Filature Artisanale',    '2026-05-24', 'Tonte printemps');
--> statement-breakpoint

-- 7) Dépenses (mois courant).
INSERT IGNORE INTO `farmos_expenses`
  (`organization_id`, `category`, `description`, `quantity`, `unit`, `amount`, `currency_id`, `supplier`, `expense_date`) VALUES
  (1, 'feed',       'Granulé vache laitière 18 %',   2000.00, 'kg',     1640.00, 15, 'Coop Agri-Pro',     '2026-05-05'),
  (1, 'feed',       'Aliment porc engraissement',    1500.00, 'kg',     1125.00, 15, 'Meunerie Tremblay', '2026-05-12'),
  (1, 'medicine',   'Mastijet Fort',                   20.00, 'tubes',   780.00, 15, 'Vétoquinol',        '2026-05-15'),
  (1, 'veterinary', 'Visite Dr. Boucher · mammites',     NULL, NULL,     450.00, 15, 'Dr. Boucher',       '2026-05-22'),
  (1, 'labor',      'Salaire ouvrier ferme · mai',       NULL, NULL,    3200.00, 15, NULL,                '2026-05-30'),
  (1, 'utility',    'Électricité bâtiments',            NULL, NULL,     685.00, 15, 'Hydro',             '2026-05-28');
