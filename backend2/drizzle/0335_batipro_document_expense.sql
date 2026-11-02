-- BatiPro : depense chantier sur batipro_documents (beneficiaire libre ou ouvrier, auteur, annulation).
-- Colonnes toutes NULL, sans FK. Ids en BIGINT UNSIGNED (meme type que users.id et batipro_workers.id).
-- Idempotent MySQL 8: INFORMATION_SCHEMA + PREPARE, 1 statement par breakpoint. Aucun seed, aucune donnee modifiee.
SET @bde_beneficiary_name_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'batipro_documents'
    AND COLUMN_NAME = 'beneficiary_name'
);
--> statement-breakpoint
SET @bde_beneficiary_name_sql := IF(
  @bde_beneficiary_name_exists = 0,
  'ALTER TABLE `batipro_documents` ADD COLUMN `beneficiary_name` varchar(255) NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE bde_beneficiary_name_stmt FROM @bde_beneficiary_name_sql;
--> statement-breakpoint
EXECUTE bde_beneficiary_name_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE bde_beneficiary_name_stmt;
--> statement-breakpoint
SET @bde_beneficiary_worker_id_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'batipro_documents'
    AND COLUMN_NAME = 'beneficiary_worker_id'
);
--> statement-breakpoint
SET @bde_beneficiary_worker_id_sql := IF(
  @bde_beneficiary_worker_id_exists = 0,
  'ALTER TABLE `batipro_documents` ADD COLUMN `beneficiary_worker_id` bigint unsigned NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE bde_beneficiary_worker_id_stmt FROM @bde_beneficiary_worker_id_sql;
--> statement-breakpoint
EXECUTE bde_beneficiary_worker_id_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE bde_beneficiary_worker_id_stmt;
--> statement-breakpoint
SET @bde_created_by_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'batipro_documents'
    AND COLUMN_NAME = 'created_by'
);
--> statement-breakpoint
SET @bde_created_by_sql := IF(
  @bde_created_by_exists = 0,
  'ALTER TABLE `batipro_documents` ADD COLUMN `created_by` bigint unsigned NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE bde_created_by_stmt FROM @bde_created_by_sql;
--> statement-breakpoint
EXECUTE bde_created_by_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE bde_created_by_stmt;
--> statement-breakpoint
SET @bde_cancelled_at_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'batipro_documents'
    AND COLUMN_NAME = 'cancelled_at'
);
--> statement-breakpoint
SET @bde_cancelled_at_sql := IF(
  @bde_cancelled_at_exists = 0,
  'ALTER TABLE `batipro_documents` ADD COLUMN `cancelled_at` timestamp NULL DEFAULT NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE bde_cancelled_at_stmt FROM @bde_cancelled_at_sql;
--> statement-breakpoint
EXECUTE bde_cancelled_at_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE bde_cancelled_at_stmt;
--> statement-breakpoint
SET @bde_cancelled_by_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'batipro_documents'
    AND COLUMN_NAME = 'cancelled_by'
);
--> statement-breakpoint
SET @bde_cancelled_by_sql := IF(
  @bde_cancelled_by_exists = 0,
  'ALTER TABLE `batipro_documents` ADD COLUMN `cancelled_by` bigint unsigned NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE bde_cancelled_by_stmt FROM @bde_cancelled_by_sql;
--> statement-breakpoint
EXECUTE bde_cancelled_by_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE bde_cancelled_by_stmt;
--> statement-breakpoint
SET @bde_cancel_reason_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'batipro_documents'
    AND COLUMN_NAME = 'cancel_reason'
);
--> statement-breakpoint
SET @bde_cancel_reason_sql := IF(
  @bde_cancel_reason_exists = 0,
  'ALTER TABLE `batipro_documents` ADD COLUMN `cancel_reason` varchar(500) NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE bde_cancel_reason_stmt FROM @bde_cancel_reason_sql;
--> statement-breakpoint
EXECUTE bde_cancel_reason_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE bde_cancel_reason_stmt;
