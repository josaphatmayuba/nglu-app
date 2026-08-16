-- SCRUM-192 (suite) -- Lien optionnel entre une paillette (banque de semence)
-- et un animal male existant du cheptel (au lieu de la seule saisie texte
-- libre `sire_name`, utile pour la semence importee sans fiche animal).
-- Idempotent (ADD COLUMN via INFORMATION_SCHEMA + PREPARE/EXECUTE, MySQL 8).

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_semen_straws' AND COLUMN_NAME='sire_animal_id'),
  'ALTER TABLE `farmos_semen_straws` ADD COLUMN `sire_animal_id` bigint NULL AFTER `sire_registration`', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
--> statement-breakpoint

SET @sql := IF(NOT EXISTS(SELECT 1 FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='farmos_semen_straws' AND INDEX_NAME='idx_farmos_straws_sire_animal'),
  'ALTER TABLE `farmos_semen_straws` ADD KEY `idx_farmos_straws_sire_animal` (`sire_animal_id`)', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
