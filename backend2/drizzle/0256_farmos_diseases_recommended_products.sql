-- SCRUM-192 (suite) -- Liste generique indicative de classes de medicaments/
-- vaccins usuels par maladie (independante du stock reel de chaque ferme,
-- deja couvert par farmos_disease_medicines). Contenu educatif, pas de
-- posologie ni de marque -- toujours orienter vers un veterinaire.
-- Idempotent (ADD COLUMN IF NOT EXISTS via INFORMATION_SCHEMA, MySQL 8).

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_diseases' AND COLUMN_NAME='recommended_products'),
  'ALTER TABLE `farmos_diseases` ADD COLUMN `recommended_products` text NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
