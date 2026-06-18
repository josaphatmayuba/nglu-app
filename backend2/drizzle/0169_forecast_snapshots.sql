-- Trace des previsions (boucle prevu vs reel) : un snapshot enregistre, a une date
-- donnee, le NET prevu pour un mois cible x devise x scope x mode. Permet ensuite
-- de comparer au reel et de mesurer l'ecart (auto-correction). Seule table du
-- chantier forecast (le calcul, lui, ne stocke rien).
-- Idempotent (CREATE TABLE IF NOT EXISTS) car hors auto-create initial fiable sous MySQL 8.
CREATE TABLE IF NOT EXISTS `forecast_snapshots` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `taken_at` date NOT NULL,
  `target_month` varchar(7) NOT NULL,
  `scope` varchar(20) NOT NULL DEFAULT 'all',
  `mode` varchar(20) NOT NULL DEFAULT 'prudent',
  `currency_id` bigint,
  `predicted_net` decimal(15,2) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
SET @fs_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'forecast_snapshots'
    AND INDEX_NAME = 'idx_forecast_snapshots_lookup'
);
--> statement-breakpoint
SET @fs_idx_sql := IF(
  @fs_idx_exists = 0,
  'CREATE INDEX `idx_forecast_snapshots_lookup` ON `forecast_snapshots` (`organization_id`, `target_month`, `scope`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE fs_idx_stmt FROM @fs_idx_sql;
--> statement-breakpoint
EXECUTE fs_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE fs_idx_stmt;
--> statement-breakpoint
