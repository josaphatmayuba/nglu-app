-- Ajoute les preuves (photo/scan recu signe) sur la caution locataire (Domus) :
-- proof_url pour l'encaissement, return_proof_url pour la restitution.
-- real_estate_security_deposits est une table hors journal historiquement
-- (cf. 0284_repair_real_estate_security_deposits.sql) : ADD COLUMN classique
-- non garanti sur toutes les bases -> forme idempotente obligatoire MySQL 8
-- (pas de ADD COLUMN IF NOT EXISTS, syntaxe non supportee).
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_security_deposits' AND COLUMN_NAME = 'proof_url');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_security_deposits` ADD COLUMN `proof_url` varchar(500) DEFAULT NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @col_exists2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_security_deposits' AND COLUMN_NAME = 'return_proof_url');
--> statement-breakpoint
SET @sql2 := IF(@col_exists2 = 0, 'ALTER TABLE `real_estate_security_deposits` ADD COLUMN `return_proof_url` varchar(500) DEFAULT NULL', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt2 FROM @sql2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
