-- Indicateurs de mise bas / sevrage pour farmos_reproduction_events (COMP-P2-007).
-- Champs utiles surtout pour le porc (portees) mais valables toutes especes.
-- offspring_count = nes vivants (existant). Ces colonnes completent: mort-nes,
-- momifies, poids moyen a la naissance, difficulte, sevres + date de sevrage.
-- Idempotent MySQL 8: INFORMATION_SCHEMA + PREPARE, 1 statement par breakpoint.

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
    AND COLUMN_NAME = 'stillborn_count'
);
--> statement-breakpoint
SET @farmos_repro_sql := IF(
  @farmos_repro_table_exists = 1 AND @farmos_repro_col_exists = 0,
  'ALTER TABLE `farmos_reproduction_events` ADD COLUMN `stillborn_count` int NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_repro_stmt FROM @farmos_repro_sql;
--> statement-breakpoint
EXECUTE farmos_repro_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_repro_stmt;
--> statement-breakpoint
SET @farmos_repro_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_reproduction_events'
    AND COLUMN_NAME = 'mummified_count'
);
--> statement-breakpoint
SET @farmos_repro_sql := IF(
  @farmos_repro_table_exists = 1 AND @farmos_repro_col_exists = 0,
  'ALTER TABLE `farmos_reproduction_events` ADD COLUMN `mummified_count` int NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_repro_stmt FROM @farmos_repro_sql;
--> statement-breakpoint
EXECUTE farmos_repro_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_repro_stmt;
--> statement-breakpoint
SET @farmos_repro_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_reproduction_events'
    AND COLUMN_NAME = 'avg_birth_weight'
);
--> statement-breakpoint
SET @farmos_repro_sql := IF(
  @farmos_repro_table_exists = 1 AND @farmos_repro_col_exists = 0,
  'ALTER TABLE `farmos_reproduction_events` ADD COLUMN `avg_birth_weight` decimal(7,2) NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_repro_stmt FROM @farmos_repro_sql;
--> statement-breakpoint
EXECUTE farmos_repro_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_repro_stmt;
--> statement-breakpoint
SET @farmos_repro_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_reproduction_events'
    AND COLUMN_NAME = 'birth_difficulty'
);
--> statement-breakpoint
SET @farmos_repro_sql := IF(
  @farmos_repro_table_exists = 1 AND @farmos_repro_col_exists = 0,
  'ALTER TABLE `farmos_reproduction_events` ADD COLUMN `birth_difficulty` varchar(20) NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_repro_stmt FROM @farmos_repro_sql;
--> statement-breakpoint
EXECUTE farmos_repro_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_repro_stmt;
--> statement-breakpoint
SET @farmos_repro_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_reproduction_events'
    AND COLUMN_NAME = 'weaned_count'
);
--> statement-breakpoint
SET @farmos_repro_sql := IF(
  @farmos_repro_table_exists = 1 AND @farmos_repro_col_exists = 0,
  'ALTER TABLE `farmos_reproduction_events` ADD COLUMN `weaned_count` int NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_repro_stmt FROM @farmos_repro_sql;
--> statement-breakpoint
EXECUTE farmos_repro_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_repro_stmt;
--> statement-breakpoint
SET @farmos_repro_col_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'farmos_reproduction_events'
    AND COLUMN_NAME = 'weaning_date'
);
--> statement-breakpoint
SET @farmos_repro_sql := IF(
  @farmos_repro_table_exists = 1 AND @farmos_repro_col_exists = 0,
  'ALTER TABLE `farmos_reproduction_events` ADD COLUMN `weaning_date` date NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE farmos_repro_stmt FROM @farmos_repro_sql;
--> statement-breakpoint
EXECUTE farmos_repro_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE farmos_repro_stmt;
