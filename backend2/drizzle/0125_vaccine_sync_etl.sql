-- Tables ETL pour le fouillage periodique des sources mondiales (ACIA pilote).
-- Idempotent via CREATE TABLE IF NOT EXISTS. Sans apostrophe dans les commentaires.

-- Journal des executions de synchronisation (tracabilite, idempotence par batch).
CREATE TABLE IF NOT EXISTS `vx_sync_runs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `source_system` VARCHAR(40) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'running',
  `trigger_mode` VARCHAR(20) NOT NULL DEFAULT 'manual',
  `rows_fetched` INT DEFAULT 0,
  `rows_staged` INT DEFAULT 0,
  `rows_upserted` INT DEFAULT 0,
  `rows_unmapped` INT DEFAULT 0,
  `error_message` TEXT,
  `started_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  KEY `idx_vx_sync_runs_source` (`source_system`, `started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint

-- Staging : miroir brut des lignes source (NVARCHAR), hash de ligne pour idempotence.
CREATE TABLE IF NOT EXISTS `vx_staging_products` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `sync_run_id` BIGINT UNSIGNED NOT NULL,
  `source_system` VARCHAR(40) NOT NULL,
  `source_ref` VARCHAR(120),
  `raw_product_name` VARCHAR(300),
  `raw_manufacturer` VARCHAR(200),
  `raw_species` VARCHAR(300),
  `raw_status` VARCHAR(60),
  `raw_payload` JSON,
  `row_hash` CHAR(64) NOT NULL,
  `processed` TINYINT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vx_staging_hash` (`source_system`, `row_hash`),
  KEY `idx_vx_staging_run` (`sync_run_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
