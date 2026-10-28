-- Bug 20 Lot 4 (dernier lot) : transaction.amount et manualPayment.amount passees de DOUBLE a DECIMAL(18,2) exact.
-- Mesure lecture seule du 2026-10-28 : aucune valeur avec plus de 2 decimales en dev (116 lignes) ni en prod (124 lignes), manualPayment vide : aucune perte.
-- Le grand livre journal_entry_lines.amount est deja en DECIMAL(18,2) : meme echelle que les ecritures plates.
-- Nullabilite et defaut conserves a l identique. Idempotent : ne modifie que si la colonne est encore en double.
-- Aucune donnee inseree. Les autres colonnes double restantes sont des quantites, heures, jours, taux, scores ou dimensions : non touchees.
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transaction' AND COLUMN_NAME = 'amount' AND DATA_TYPE = 'double'), 'ALTER TABLE `transaction` MODIFY COLUMN `amount` DECIMAL(18,2) NOT NULL', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
SET @sql := (SELECT IF(EXISTS(SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'manualPayment' AND COLUMN_NAME = 'amount' AND DATA_TYPE = 'double'), 'ALTER TABLE `manualPayment` MODIFY COLUMN `amount` DECIMAL(18,2) NOT NULL DEFAULT 0', 'SELECT 1'));
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
