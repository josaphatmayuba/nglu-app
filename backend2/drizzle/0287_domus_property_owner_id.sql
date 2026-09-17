-- Domus : rattache un bien a son proprietaire legal (real_estate_owners, 0286).
-- owner_id nullable : si NULL, fallback total sur le comportement actuel
-- (gestionnaire mandate via appSettings landlord_*), donc rien ne casse.
-- real_estate_properties est deja en prod avec un drift possible dev/prod :
-- forme idempotente obligatoire, MySQL 8 nacceptant pas ADD COLUMN IF NOT EXISTS
-- ni CREATE INDEX IF NOT EXISTS.
-- FK logique uniquement (pas de contrainte physique), comme le reste des
-- tables real_estate_*.
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_properties' AND COLUMN_NAME = 'owner_id');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_properties` ADD COLUMN `owner_id` bigint DEFAULT NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @idx_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_properties' AND INDEX_NAME = 'idx_re_properties_owner');
--> statement-breakpoint
SET @sql2 := IF(@idx_exists = 0, 'ALTER TABLE `real_estate_properties` ADD KEY `idx_re_properties_owner` (`owner_id`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt2 FROM @sql2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
