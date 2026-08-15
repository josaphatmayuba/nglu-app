-- SCRUM-192 (suite) -- URL source (reference veterinaire) pour la recommandation
-- de classes de medicaments/vaccins de recommended_products, afin que
-- eleveur puisse cliquer et verifier information (OIE/WOAH, FAO, Merck
-- Veterinary Manual...). Idempotent (ADD COLUMN IF NOT EXISTS, MySQL 8).

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_diseases' AND COLUMN_NAME='recommended_products_source_url'),
  'ALTER TABLE `farmos_diseases` ADD COLUMN `recommended_products_source_url` varchar(500) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
