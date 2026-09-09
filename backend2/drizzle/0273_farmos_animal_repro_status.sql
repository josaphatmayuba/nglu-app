-- Registre de reproduction porcine, etape 1 : etat reproductif porte par la fiche animal.
-- repro_status valeurs applicatives : nulliparous, mated, pregnant, lactating, empty, culled.
-- repro_status_since sert a detecter la truie improductive (temps passe dans letat).
-- body_condition_score = note detat corporel (echelle 1 a 5, un decimal).
-- parity = numero de portee (nombre de mises bas deja realisees).
-- Idempotent MySQL 8: INFORMATION_SCHEMA + PREPARE, 1 statement par breakpoint.

SET @farmos_animals_table_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animals'
);
--> statement-breakpoint
SET @farmos_animals_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animals'
    AND COLUMN_NAME = 'repro_status'
);
--> statement-breakpoint
SET @farmos_animals_sql := IF(
  @farmos_animals_table_exists = 1 AND @farmos_animals_col_exists = 0,
  'ALTER TABLE `farmos_animals` ADD COLUMN `repro_status` varchar(20) NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_animals_stmt FROM @farmos_animals_sql;
--> statement-breakpoint
EXECUTE farmos_animals_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_animals_stmt;
--> statement-breakpoint
SET @farmos_animals_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animals'
    AND COLUMN_NAME = 'repro_status_since'
);
--> statement-breakpoint
SET @farmos_animals_sql := IF(
  @farmos_animals_table_exists = 1 AND @farmos_animals_col_exists = 0,
  'ALTER TABLE `farmos_animals` ADD COLUMN `repro_status_since` date NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_animals_stmt FROM @farmos_animals_sql;
--> statement-breakpoint
EXECUTE farmos_animals_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_animals_stmt;
--> statement-breakpoint
SET @farmos_animals_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animals'
    AND COLUMN_NAME = 'body_condition_score'
);
--> statement-breakpoint
SET @farmos_animals_sql := IF(
  @farmos_animals_table_exists = 1 AND @farmos_animals_col_exists = 0,
  'ALTER TABLE `farmos_animals` ADD COLUMN `body_condition_score` decimal(3,1) NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_animals_stmt FROM @farmos_animals_sql;
--> statement-breakpoint
EXECUTE farmos_animals_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_animals_stmt;
--> statement-breakpoint
SET @farmos_animals_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_animals'
    AND COLUMN_NAME = 'parity'
);
--> statement-breakpoint
SET @farmos_animals_sql := IF(
  @farmos_animals_table_exists = 1 AND @farmos_animals_col_exists = 0,
  'ALTER TABLE `farmos_animals` ADD COLUMN `parity` int NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_animals_stmt FROM @farmos_animals_sql;
--> statement-breakpoint
EXECUTE farmos_animals_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_animals_stmt;
