-- Domus : ajoute latitude/longitude aux biens immobiliers pour la carte
-- (SCRUM carte des proprietes). Colonnes nullable : NULL = pas encore
-- geocode, fallback total sur le comportement actuel (liste sans marker).
-- real_estate_properties est deja en prod avec un drift possible dev/prod :
-- forme idempotente obligatoire, MySQL 8 nacceptant pas ADD COLUMN IF NOT EXISTS
-- ni CREATE INDEX IF NOT EXISTS.
SET @lat_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_properties' AND COLUMN_NAME = 'latitude');
--> statement-breakpoint
SET @sql_lat := IF(@lat_exists = 0, 'ALTER TABLE `real_estate_properties` ADD COLUMN `latitude` decimal(10,7) DEFAULT NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt_lat FROM @sql_lat;
--> statement-breakpoint
EXECUTE stmt_lat;
--> statement-breakpoint
DEALLOCATE PREPARE stmt_lat;
--> statement-breakpoint
SET @lng_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_properties' AND COLUMN_NAME = 'longitude');
--> statement-breakpoint
SET @sql_lng := IF(@lng_exists = 0, 'ALTER TABLE `real_estate_properties` ADD COLUMN `longitude` decimal(10,7) DEFAULT NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt_lng FROM @sql_lng;
--> statement-breakpoint
EXECUTE stmt_lng;
--> statement-breakpoint
DEALLOCATE PREPARE stmt_lng;
