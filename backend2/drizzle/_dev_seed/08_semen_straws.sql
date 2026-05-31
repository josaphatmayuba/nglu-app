-- Dev only — banque de semence (paillettes IA) avec ~16 références
-- couvrant les 4 espèces actives (cow/pig/goat/sheep), rattachées aux
-- fournisseurs créés par 07_suppliers_and_vet_tremblay.sql.
-- Idempotent : INSERT WHERE NOT EXISTS sur (organization_id, code).

SET @sup_ciaq      = (SELECT id FROM `supplier` WHERE name = 'Coop Agri-Pro'        LIMIT 1);
SET @sup_meunerie  = (SELECT id FROM `supplier` WHERE name = 'Meunerie Tremblay'    LIMIT 1);
SET @sup_skretting = (SELECT id FROM `supplier` WHERE name = 'Skretting'            LIMIT 1);
SET @sup_vetoq     = (SELECT id FROM `supplier` WHERE name = 'Vétoquinol'           LIMIT 1);
SET @sup_elanco    = (SELECT id FROM `supplier` WHERE name = 'Elanco'               LIMIT 1);
SET @sup_boeh      = (SELECT id FROM `supplier` WHERE name = 'Boehringer Ingelheim' LIMIT 1);
SET @sup_msd       = (SELECT id FROM `supplier` WHERE name = 'MSD Santé Animale'    LIMIT 1);

INSERT INTO `farmos_semen_straws`
  (organization_id, code, sire_name, sire_registration, species, breed, country, region,
   supplier_id, collection_center, collection_date, batch_number, motility_pct,
   concentration_million_per_ml, straws_per_dose, genetic_traits, notes,
   straws_total, straws_remaining, tank_location, price_per_dose)
SELECT * FROM (
  -- Vaches (Holstein, Jersey, Angus, Hereford)
  SELECT 1 AS organization_id, 'CIAQ-HOLM-1H10567' AS code, 'Holm Honest' AS sire_name, 'HOCANM200000012345' AS sire_registration, 'cow' AS species, 'Holstein' AS breed, 'Canada' AS country, 'Québec' AS region, @sup_ciaq AS supplier_id, 'CIAQ Saint-Hyacinthe' AS collection_center, '2025-09-12' AS collection_date, 'L25-2347' AS batch_number, 78 AS motility_pct, 1200 AS concentration_million_per_ml, 1 AS straws_per_dose, JSON_OBJECT('milk_kg', 1245, 'fat_pct', 0.18, 'longevity', 108, 'calving_ease', 6) AS genetic_traits, 'Top sire laitier 2025' AS notes, 50 AS straws_total, 47 AS straws_remaining, 'T1/C2/G4' AS tank_location, 38.00 AS price_per_dose UNION ALL
  SELECT 1, 'SEMEX-JER-7H4521',  'Jolt of JoJo',    'JECANM199900078921', 'cow', 'Jersey',    'Canada', 'Ontario',         @sup_ciaq, 'Semex Guelph',         '2025-07-04', 'L25-1812', 82, 1450, 1, JSON_OBJECT('milk_kg',  820, 'fat_pct', 0.65, 'protein_pct', 0.22, 'longevity', 112),       'Bonne richesse butyreuse', 30, 28, 'T1/C3/G1', 42.50 UNION ALL
  SELECT 1, 'GENEX-ANG-2A8810',  'Angus Powerhouse','ANCANM202100045667', 'cow', 'Angus',     'Canada', 'Alberta',         @sup_ciaq, 'Genex Calgary',        '2025-08-20', 'L25-2050', 75, 1100, 1, JSON_OBJECT('weaning_weight_kg', 305, 'marbling_score', 6.2, 'calving_ease', 7),         'Excellent ECV maternel',   25, 22, 'T2/C1/G2', 28.00 UNION ALL
  SELECT 1, 'CIAQ-HEF-3R2055',   'Hereford Champ',  'HECANM202000033301', 'cow', 'Hereford',  'USA',    'Montana',         @sup_ciaq, 'ABS Global',           '2024-11-15', 'L24-3008', 70, 1050, 1, JSON_OBJECT('weaning_weight_kg', 295, 'docility', 8.1),                                  NULL,                      20, 20, 'T2/C1/G3', 26.00 UNION ALL

  -- Porcs (Duroc, Landrace, Yorkshire, Pietrain)
  SELECT 1, 'PIC-DUR-7D5512',    'Duroc Elite',     'PIC-DUR-2024-001',   'pig', 'Duroc',     'Canada', 'Manitoba',        @sup_meunerie, 'PIC Winnipeg',     '2025-10-02', 'L25-2701', 80, 1800, 1, JSON_OBJECT('lean_meat_pct', 62, 'adg_g_per_day', 950, 'feed_conversion', 2.45),     'IA verrats terminaux',     40, 38, 'T3/C1/G1', 18.50 UNION ALL
  SELECT 1, 'TOPIGS-LR-2L1108',  'Landrace Prolific','TGN-LR-2024-018',   'pig', 'Landrace',  'Nederland','Beuningen',     @sup_meunerie, 'Topigs Norsvin',   '2025-08-19', 'L25-1922', 76, 1650, 1, JSON_OBJECT('litter_size', 14.8, 'born_alive', 14.2, 'longevity_parities', 6.5),       'Lignée maternelle hyperprolifique', 60, 55, 'T3/C2/G1', 16.00 UNION ALL
  SELECT 1, 'GENESUS-YK-9Y3340', 'Yorkshire Top',   'GEN-YK-2024-076',    'pig', 'Yorkshire', 'Canada', 'Manitoba',        @sup_meunerie, 'Genesus Inc.',     '2025-06-30', 'L25-1601', 79, 1720, 1, JSON_OBJECT('litter_size', 13.4, 'piglet_weight_kg', 1.45),                            NULL,                      45, 41, 'T3/C2/G3', 17.20 UNION ALL
  SELECT 1, 'AXIOM-PIE-1P9907',  'Pietrain Heavy',  'AX-PIE-2024-012',    'pig', 'Pietrain',  'France', 'Bretagne',        @sup_meunerie, 'Axiom Génétique',  '2025-05-12', 'L25-1320', 73, 1500, 1, JSON_OBJECT('lean_meat_pct', 64.5, 'conformation', 9.2),                                'Verrat de finition viande',35, 30, 'T3/C3/G2', 19.80 UNION ALL

  -- Chèvres (Alpine, Saanen, Boer)
  SELECT 1, 'CAPRI-ALP-5A2233',  'Alpine Star',     'CGNM-2024-AS-001',   'goat','Alpine',    'France', 'Rhône-Alpes',     @sup_vetoq, 'Capgenes',           '2025-04-22', 'L25-1102', 72, 980,  1, JSON_OBJECT('milk_kg', 850, 'fat_pct', 3.6, 'protein_pct', 3.0),                       NULL,                      20, 18, 'T4/C1/G2', 22.00 UNION ALL
  SELECT 1, 'CAPRI-SAA-3S8870',  'Saanen Royal',    'CGNM-2024-SR-009',   'goat','Saanen',    'France', 'Centre',          @sup_vetoq, 'Capgenes',           '2025-03-15', 'L25-0801', 74, 1010, 1, JSON_OBJECT('milk_kg', 920, 'fat_pct', 3.4),                                            NULL,                      15, 12, 'T4/C1/G4', 22.50 UNION ALL
  SELECT 1, 'BOER-MEAT-4B6601',  'Boer Champion',   'ABGA-2024-001',      'goat','Boer',      'USA',    'Texas',           @sup_boeh,  'ABGA Texas',         '2025-02-10', 'L25-0410', 68, 950,  1, JSON_OBJECT('weaning_weight_kg', 22, 'adg_g_per_day', 240),                              'Race à viande robuste',   18, 16, 'T4/C2/G1', 19.50 UNION ALL

  -- Moutons (Suffolk, Mérinos, Dorper)
  SELECT 1, 'OVIN-SUF-2S4456',   'Suffolk Power',   'NSIP-SUF-2024-001',  'sheep','Suffolk',  'Canada', 'Alberta',         @sup_msd,   'NSIP',               '2025-09-05', 'L25-2210', 71, 920,  1, JSON_OBJECT('weaning_weight_kg', 26, 'muscle_score', 8.5),                              'Croissance rapide',       22, 20, 'T5/C1/G2', 17.00 UNION ALL
  SELECT 1, 'OVIN-MER-7M1109',   'Mérinos Fine',    'AWG-MER-2024-018',   'sheep','Mérinos',  'Australia','New South Wales', @sup_msd, 'AWG Sydney',         '2025-07-18', 'L25-1850', 69, 880,  1, JSON_OBJECT('wool_fiber_micron', 18.5, 'wool_clean_yield_pct', 70),                     'Laine fine premium',      15, 12, 'T5/C2/G1', 20.00 UNION ALL
  SELECT 1, 'OVIN-DOR-3D2278',   'Dorper Hardy',    'ADSBI-2024-005',     'sheep','Dorper',   'USA',    'Texas',           @sup_elanco,'ADSBI',              '2025-06-02', 'L25-1505', 72, 905,  1, JSON_OBJECT('weaning_weight_kg', 24, 'lamb_survival_pct', 92),                          'Race à viande tropicale', 18, 18, 'T5/C2/G3', 16.50
) src
WHERE NOT EXISTS (
  SELECT 1 FROM `farmos_semen_straws` x WHERE x.organization_id = 1 AND x.code = src.code
);
