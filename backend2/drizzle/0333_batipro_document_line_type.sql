-- BatiPro : type par ligne de document (material = article de stock, service = depense sans stock),
-- categorie de service et note de ligne (dates, taux, n de facture hors designation).
-- Idempotent MySQL 8: INFORMATION_SCHEMA + PREPARE, 1 statement par breakpoint. Aucun seed, aucune donnee modifiee.
SET @bdl_line_type_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'batipro_document_lines'
    AND COLUMN_NAME = 'line_type'
);
--> statement-breakpoint
SET @bdl_line_type_sql := IF(
  @bdl_line_type_exists = 0,
  'ALTER TABLE `batipro_document_lines` ADD COLUMN `line_type` varchar(20) NOT NULL DEFAULT 'material'',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE bdl_line_type_stmt FROM @bdl_line_type_sql;
--> statement-breakpoint
EXECUTE bdl_line_type_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE bdl_line_type_stmt;
--> statement-breakpoint
SET @bdl_service_category_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'batipro_document_lines'
    AND COLUMN_NAME = 'service_category'
);
--> statement-breakpoint
SET @bdl_service_category_sql := IF(
  @bdl_service_category_exists = 0,
  'ALTER TABLE `batipro_document_lines` ADD COLUMN `service_category` varchar(30) NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE bdl_service_category_stmt FROM @bdl_service_category_sql;
--> statement-breakpoint
EXECUTE bdl_service_category_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE bdl_service_category_stmt;
--> statement-breakpoint
SET @bdl_line_note_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'batipro_document_lines'
    AND COLUMN_NAME = 'line_note'
);
--> statement-breakpoint
SET @bdl_line_note_sql := IF(
  @bdl_line_note_exists = 0,
  'ALTER TABLE `batipro_document_lines` ADD COLUMN `line_note` varchar(500) NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE bdl_line_note_stmt FROM @bdl_line_note_sql;
--> statement-breakpoint
EXECUTE bdl_line_note_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE bdl_line_note_stmt;
