-- BatiPro : fonds du chantier (etape 1, schema + config comptable uniquement).
-- Table batipro_project_funds : chaque apport de fonds recu pour un chantier
-- (proprietaire, associe ou autre), avec piece jointe optionnelle et lien vers
-- l ecriture comptable (ledger_entry_id) et sa contre-passation (reversal_entry_id).
-- Annulation douce via is_active = 0 + cancelled_at / cancelled_by / cancel_reason,
-- jamais de DELETE. Pas de FK stricte (pattern batipro), seulement des index.
-- Valeurs admises (contrainte applicative) :
--   contributor_kind : owner | partner | other
--   funding_nature   : client_advance | partner_account | equity
--   payment_method   : cash | bank | mobile_money
--   ledger_status    : posted | pending
-- Config comptable par organisation (pas de donnees de demo) :
--   sous-comptes Mobile Money (Asset), Avances clients chantier (Liability),
--   Compte courant associe (Liability) crees seulement si absents de l org.
--   Regles transaction_type_rules type batipro_project_funding :
--     DEBIT  cash -> Cash, bank -> Bank, mobile_money -> Mobile Money
--     CREDIT client_advance -> Avances clients chantier,
--            partner_account -> Compte courant associe,
--            equity -> Shareholder 1 Equity
-- Comptes parents et sous-comptes resolus par NOM et par org (MIN id si doublon),
-- jamais par id fige. Idempotent : INSERT ... SELECT ... WHERE NOT EXISTS.
-- Un seul statement par breakpoint. Aucune apostrophe dans les commentaires.
CREATE TABLE IF NOT EXISTS `batipro_project_funds` (
  `id` bigint unsigned AUTO_INCREMENT NOT NULL,
  `organization_id` bigint NOT NULL,
  `project_id` bigint NOT NULL,
  `received_at` date NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `currency_id` bigint NOT NULL,
  `contributor_kind` varchar(20) NOT NULL DEFAULT 'owner',
  `contributor_name` varchar(255),
  `contributor_phone` varchar(32),
  `funding_nature` varchar(30) NOT NULL DEFAULT 'client_advance',
  `payment_method` varchar(20) NOT NULL,
  `reference` varchar(120),
  `notes` text,
  `attached_file_key` varchar(512),
  `attached_file_format` varchar(10),
  `attached_file_size` bigint,
  `ledger_entry_id` bigint,
  `ledger_status` varchar(20) NOT NULL DEFAULT 'posted',
  `reversal_entry_id` bigint,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `cancelled_at` timestamp NULL,
  `cancelled_by` bigint,
  `cancel_reason` varchar(255),
  `created_by` bigint,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `batipro_project_funds_id` PRIMARY KEY(`id`),
  KEY `idx_batipro_project_funds_org_project_active` (`organization_id`, `project_id`, `is_active`),
  KEY `idx_batipro_project_funds_org_currency` (`organization_id`, `currency_id`)
);
--> statement-breakpoint
INSERT INTO `subAccount` (`organization_id`, `name`, `accountId`, `status`, `created_at`, `updated_at`)
SELECT `a`.`organization_id`, 'Mobile Money', MIN(`a`.`id`), 'true', NOW(), NOW()
FROM `account` `a`
WHERE `a`.`name` = 'Asset'
  AND NOT EXISTS (SELECT 1 FROM `subAccount` `s` WHERE `s`.`organization_id` = `a`.`organization_id` AND `s`.`name` = 'Mobile Money')
GROUP BY `a`.`organization_id`;
--> statement-breakpoint
INSERT INTO `subAccount` (`organization_id`, `name`, `accountId`, `status`, `created_at`, `updated_at`)
SELECT `a`.`organization_id`, 'Avances clients chantier', MIN(`a`.`id`), 'true', NOW(), NOW()
FROM `account` `a`
WHERE `a`.`name` = 'Liability'
  AND NOT EXISTS (SELECT 1 FROM `subAccount` `s` WHERE `s`.`organization_id` = `a`.`organization_id` AND `s`.`name` = 'Avances clients chantier')
GROUP BY `a`.`organization_id`;
--> statement-breakpoint
INSERT INTO `subAccount` (`organization_id`, `name`, `accountId`, `status`, `created_at`, `updated_at`)
SELECT `a`.`organization_id`, 'Compte courant associe', MIN(`a`.`id`), 'true', NOW(), NOW()
FROM `account` `a`
WHERE `a`.`name` = 'Liability'
  AND NOT EXISTS (SELECT 1 FROM `subAccount` `s` WHERE `s`.`organization_id` = `a`.`organization_id` AND `s`.`name` = 'Compte courant associe')
GROUP BY `a`.`organization_id`;
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT `s`.`organization_id`, 'batipro_project_funding', 'cash', MIN(`s`.`id`), 'DEBIT', 1
FROM `subAccount` `s`
WHERE `s`.`name` = 'Cash'
  AND NOT EXISTS (SELECT 1 FROM `transaction_type_rules` `r` WHERE `r`.`organization_id` = `s`.`organization_id` AND `r`.`type` = 'batipro_project_funding' AND `r`.`role` = 'cash')
GROUP BY `s`.`organization_id`;
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT `s`.`organization_id`, 'batipro_project_funding', 'bank', MIN(`s`.`id`), 'DEBIT', 1
FROM `subAccount` `s`
WHERE `s`.`name` = 'Bank'
  AND NOT EXISTS (SELECT 1 FROM `transaction_type_rules` `r` WHERE `r`.`organization_id` = `s`.`organization_id` AND `r`.`type` = 'batipro_project_funding' AND `r`.`role` = 'bank')
GROUP BY `s`.`organization_id`;
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT `s`.`organization_id`, 'batipro_project_funding', 'mobile_money', MIN(`s`.`id`), 'DEBIT', 1
FROM `subAccount` `s`
WHERE `s`.`name` = 'Mobile Money'
  AND NOT EXISTS (SELECT 1 FROM `transaction_type_rules` `r` WHERE `r`.`organization_id` = `s`.`organization_id` AND `r`.`type` = 'batipro_project_funding' AND `r`.`role` = 'mobile_money')
GROUP BY `s`.`organization_id`;
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT `s`.`organization_id`, 'batipro_project_funding', 'client_advance', MIN(`s`.`id`), 'CREDIT', 2
FROM `subAccount` `s`
WHERE `s`.`name` = 'Avances clients chantier'
  AND NOT EXISTS (SELECT 1 FROM `transaction_type_rules` `r` WHERE `r`.`organization_id` = `s`.`organization_id` AND `r`.`type` = 'batipro_project_funding' AND `r`.`role` = 'client_advance')
GROUP BY `s`.`organization_id`;
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT `s`.`organization_id`, 'batipro_project_funding', 'partner_account', MIN(`s`.`id`), 'CREDIT', 2
FROM `subAccount` `s`
WHERE `s`.`name` = 'Compte courant associe'
  AND NOT EXISTS (SELECT 1 FROM `transaction_type_rules` `r` WHERE `r`.`organization_id` = `s`.`organization_id` AND `r`.`type` = 'batipro_project_funding' AND `r`.`role` = 'partner_account')
GROUP BY `s`.`organization_id`;
--> statement-breakpoint
INSERT INTO `transaction_type_rules` (`organization_id`, `type`, `role`, `account_id`, `side`, `sort_order`)
SELECT `s`.`organization_id`, 'batipro_project_funding', 'equity', MIN(`s`.`id`), 'CREDIT', 2
FROM `subAccount` `s`
WHERE `s`.`name` = 'Shareholder 1 Equity'
  AND NOT EXISTS (SELECT 1 FROM `transaction_type_rules` `r` WHERE `r`.`organization_id` = `s`.`organization_id` AND `r`.`type` = 'batipro_project_funding' AND `r`.`role` = 'equity')
GROUP BY `s`.`organization_id`;
