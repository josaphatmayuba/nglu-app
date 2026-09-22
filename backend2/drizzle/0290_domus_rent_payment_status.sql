-- Domus : statut sur real_estate_rent_payments pour distinguer
-- une echeance de loyer generee retroactivement (pending, non encaissee)
-- dun vrai paiement encaisse (paid) qui declenche la transaction comptable.
-- Defaut 'paid' : toutes les lignes existantes sont de vrais paiements confirmes,
-- donc rien ne change retroactivement.
-- real_estate_rent_payments est deja en prod avec un drift possible dev/prod :
-- forme idempotente obligatoire, MySQL 8 nacceptant pas ADD COLUMN IF NOT EXISTS.
SET @col_exists := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_rent_payments' AND COLUMN_NAME = 'status');
--> statement-breakpoint
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `real_estate_rent_payments` ADD COLUMN `status` varchar(20) NOT NULL DEFAULT ''paid''', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
