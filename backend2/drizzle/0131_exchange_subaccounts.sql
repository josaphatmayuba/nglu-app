-- Sous-comptes pour l'echange de devise (modele bancaire). Idempotent.
-- Table subAccount, colonne accountId : 1 = Asset (compte de change/clearing),
-- 6 = Expense (frais de change). Inseres seulement s'ils n'existent pas deja.
-- Sans apostrophe dans les commentaires (le splitter de migration suit les quotes).
INSERT INTO `subAccount` (`name`, `accountId`, `status`, `created_at`, `updated_at`)
SELECT 'Currency Exchange Clearing', 1, 'true', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `subAccount` WHERE `name` = 'Currency Exchange Clearing');
--> statement-breakpoint
INSERT INTO `subAccount` (`name`, `accountId`, `status`, `created_at`, `updated_at`)
SELECT 'Exchange Fees', 6, 'true', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `subAccount` WHERE `name` = 'Exchange Fees');
