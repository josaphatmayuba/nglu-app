-- Registre de reproduction porcine, etape 1 : un cycle = une truie, de la saillie au sevrage.
-- sow_id reference farmos_animals.id, sire_animal_id reference farmos_animals.id (male du cheptel),
-- sire_straw_id reference farmos_semen_straws.id (paillette IA). Pas de contrainte FK physique :
-- le reste des tables farmos_* nen pose pas, on reste coherent.
-- outcome : in_progress | farrowed | weaned | aborted | not_pregnant | culled.
-- diagnosis_result : pregnant | empty | doubtful. breeding_type : natural | insemination.
-- Le fichier ajoute aussi cycle_id sur farmos_reproduction_events pour rattacher
-- chaque evenement (saillie, diagnostic, mise bas, sevrage) a son cycle.
-- Idempotent : CREATE TABLE IF NOT EXISTS + INFORMATION_SCHEMA/PREPARE pour la colonne.
CREATE TABLE IF NOT EXISTS `farmos_repro_cycles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `sow_id` bigint NOT NULL,
  `cycle_number` int DEFAULT NULL,
  `mating_date` date DEFAULT NULL,
  `sire_animal_id` bigint DEFAULT NULL,
  `sire_straw_id` bigint DEFAULT NULL,
  `breeding_type` varchar(20) DEFAULT NULL,
  `expected_diagnosis_date` date DEFAULT NULL,
  `diagnosis_date` date DEFAULT NULL,
  `diagnosis_result` varchar(20) DEFAULT NULL,
  `expected_farrowing_date` date DEFAULT NULL,
  `farrowing_date` date DEFAULT NULL,
  `expected_weaning_date` date DEFAULT NULL,
  `weaning_date` date DEFAULT NULL,
  `outcome` varchar(20) DEFAULT 'in_progress',
  `notes` text,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
SET @farmos_repro_table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_reproduction_events'
);
--> statement-breakpoint
SET @farmos_repro_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_reproduction_events'
    AND COLUMN_NAME = 'cycle_id'
);
--> statement-breakpoint
SET @farmos_repro_sql := IF(
  @farmos_repro_table_exists = 1 AND @farmos_repro_col_exists = 0,
  'ALTER TABLE `farmos_reproduction_events` ADD COLUMN `cycle_id` bigint NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_repro_stmt FROM @farmos_repro_sql;
--> statement-breakpoint
EXECUTE farmos_repro_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_repro_stmt;
