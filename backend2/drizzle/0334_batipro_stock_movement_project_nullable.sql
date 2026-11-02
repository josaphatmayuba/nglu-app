-- BatiPro : project_id nullable sur batipro_stock_movements (mouvements de stock general sans chantier).
-- Type conserve (BIGINT signe, cf. 0226). Index existants conserves, aucune FK sur cette colonne.
-- Idempotent MySQL 8: INFORMATION_SCHEMA + PREPARE, 1 statement par breakpoint. Aucun seed, aucune donnee modifiee.
SET @bsm_project_notnull := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'batipro_stock_movements'
    AND COLUMN_NAME = 'project_id'
    AND IS_NULLABLE = 'NO'
);
--> statement-breakpoint
SET @bsm_project_sql := IF(
  @bsm_project_notnull > 0,
  'ALTER TABLE `batipro_stock_movements` MODIFY `project_id` bigint NULL',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE bsm_project_stmt FROM @bsm_project_sql;
--> statement-breakpoint
EXECUTE bsm_project_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE bsm_project_stmt;
