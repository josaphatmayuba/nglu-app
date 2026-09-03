-- References externes (couche 2 "reference externe") saisies a la main : prix de
-- marche par region, taux de mortalite de reference, etc. Source prioritaire =
-- manuel (connaissance terrain RDC) ; API/IA viendront en complement plus tard.
-- Sert d'hypothese affichable, jamais du N1 certain.
-- Idempotent (CREATE TABLE IF NOT EXISTS) car hors auto-create initial fiable sous MySQL 8.
CREATE TABLE IF NOT EXISTS `forecast_external_refs` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `kind` varchar(40) NOT NULL,
  `label` varchar(180) NOT NULL,
  `region` varchar(120),
  `value` decimal(15,4) NOT NULL DEFAULT 0,
  `unit` varchar(40),
  `currency_id` bigint,
  `source` varchar(40) NOT NULL DEFAULT 'manual',
  `valid_from` date,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
SET @fer_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'forecast_external_refs'
    AND INDEX_NAME = 'idx_forecast_external_refs_lookup'
);
--> statement-breakpoint
SET @fer_idx_sql := IF(
  @fer_idx_exists = 0,
  'CREATE INDEX `idx_forecast_external_refs_lookup` ON `forecast_external_refs` (`organization_id`, `kind`, `is_active`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE fer_idx_stmt FROM @fer_idx_sql;
--> statement-breakpoint
EXECUTE fer_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE fer_idx_stmt;
--> statement-breakpoint
