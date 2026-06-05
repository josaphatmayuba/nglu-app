-- SCRUM-193 — Catalogue des maladies FarmOS + normalisation farmos_treatments.
-- organization_id NULL = catalogue global (visible par toutes les organisations).
-- organization_id renseigné = maladie propre à l'organisation.

CREATE TABLE IF NOT EXISTS `farmos_diseases` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint DEFAULT NULL,
  `species` varchar(50) NOT NULL,
  `name_fr` varchar(255) NOT NULL,
  `name_en` varchar(255) DEFAULT NULL,
  `contagious` tinyint NOT NULL DEFAULT 0,
  `severity_default` varchar(20) DEFAULT NULL,
  `common_route` varchar(50) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_diseases_species` (`species`),
  KEY `idx_farmos_diseases_org_species` (`organization_id`, `species`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint

-- Seed catalogue global (organization_id = NULL).
-- Source: mockup/FarmOS Pro/src/data.jsx (SPECIES[].diseases + diseasesEn).
INSERT IGNORE INTO `farmos_diseases` (`organization_id`, `species`, `name_fr`, `name_en`, `contagious`) VALUES
  (NULL, 'cow',     'Mammite',              'Mastitis',             0),
  (NULL, 'cow',     'Boiterie',             'Lameness',             0),
  (NULL, 'cow',     'Métrite',              'Metritis',             0),
  (NULL, 'cow',     'Fièvre',               'Fever',                0),
  (NULL, 'cow',     'Parasites internes',   'Internal parasites',   1),
  (NULL, 'pig',     'Diarrhée néonatale',   'Neonatal diarrhea',    1),
  (NULL, 'pig',     'Toux',                 'Cough',                0),
  (NULL, 'pig',     'PRRS',                 'PRRS',                 1),
  (NULL, 'pig',     'Morsure de queue',     'Tail biting',          0),
  (NULL, 'pig',     'Boiterie',             'Lameness',             0),
  (NULL, 'chicken', 'Maladie respiratoire', 'Respiratory disease',  1),
  (NULL, 'chicken', 'Coccidiose',           'Coccidiosis',          1),
  (NULL, 'chicken', 'Diarrhée',             'Diarrhea',             0),
  (NULL, 'chicken', 'Picage',               'Feather pecking',      0),
  (NULL, 'fish',    'Parasites',            'Parasites',            1),
  (NULL, 'fish',    'Champignons',          'Fungi',                0),
  (NULL, 'fish',    'Maladie de peau',      'Skin disease',         0),
  (NULL, 'goat',    'Parasites',            'Parasites',            1),
  (NULL, 'goat',    'Diarrhée',             'Diarrhea',             0),
  (NULL, 'goat',    'Boiterie',             'Lameness',             0),
  (NULL, 'sheep',   'Parasites',            'Parasites',            1),
  (NULL, 'sheep',   'Boiterie',             'Lameness',             0),
  (NULL, 'sheep',   'Infection peau',       'Skin infection',       0),
  (NULL, 'rabbit',  'Diarrhée',             'Diarrhea',             0),
  (NULL, 'rabbit',  'Maladie respiratoire', 'Respiratory disease',  1),
  (NULL, 'rabbit',  'Parasites',            'Parasites',            1),
  (NULL, 'duck',    'Grippe aviaire',       'Avian flu',            1),
  (NULL, 'duck',    'Parasites',            'Parasites',            1),
  (NULL, 'duck',    'Infections',           'Infections',           0),
  (NULL, 'turkey',  'Parasites',            'Parasites',            1),
  (NULL, 'turkey',  'Maladie respiratoire', 'Respiratory disease',  1);
--> statement-breakpoint

-- Normaliser farmos_treatments : remplacer disease (texte) par disease_id (FK).
-- Migration idempotente : vérifier que la colonne existe encore avant DROP.
SET @disease_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_treatments'
    AND COLUMN_NAME = 'disease'
);
--> statement-breakpoint
SET @drop_sql := IF(
  @disease_col_exists = 1,
  'ALTER TABLE `farmos_treatments` DROP COLUMN `disease`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE drop_stmt FROM @drop_sql;
--> statement-breakpoint
EXECUTE drop_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE drop_stmt;
--> statement-breakpoint

SET @disease_id_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_treatments'
    AND COLUMN_NAME = 'disease_id'
);
--> statement-breakpoint
SET @add_sql := IF(
  @disease_id_col_exists = 0,
  'ALTER TABLE `farmos_treatments` ADD COLUMN `disease_id` bigint NOT NULL DEFAULT 0 AFTER `medicine_id`, ADD KEY `idx_farmos_treatments_disease` (`disease_id`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE add_stmt FROM @add_sql;
--> statement-breakpoint
EXECUTE add_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE add_stmt;
