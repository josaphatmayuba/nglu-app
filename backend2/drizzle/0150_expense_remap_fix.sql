-- 0150_expense_remap_fix.sql
-- Correctif de 0149 : le remap + soft-delete n'ont PAS eu lieu car 0149 utilisait
-- une TEMPORARY TABLE referencee 2x dans la meme requete (INSERT ... WHERE id NOT IN
-- (SELECT FROM meme_table)) -> MySQL ER_CANT_REOPEN_TABLE -> migration marquee
-- appliquee malgre l'echec (seuls les 8 comptes canoniques ont ete crees).
--
-- Ici on utilise une VRAIE table (non-temporary) `tmp_expense_remap_0149`, qui peut
-- etre rouverte sans limite, droppee en debut (idempotent) et en fin.
-- Une instruction par statement-breakpoint. Pas d'apostrophe dans les commentaires.
--> statement-breakpoint

SET @exp_acc := (SELECT id FROM `account` WHERE `type` = 'Expense' ORDER BY id LIMIT 1);
--> statement-breakpoint

-- Filet : (re)creer les 8 comptes canoniques si absents (idempotent, au cas ou 0149 non joue).
INSERT INTO `subAccount` (`name`, `accountId`, `status`, `created_at`, `updated_at`)
SELECT v.n, @exp_acc, 'true', NOW(), NOW() FROM (
  SELECT 'Carburant et energie' n UNION ALL SELECT 'Travaux et chantiers'
  UNION ALL SELECT 'Salaires et main-d oeuvre' UNION ALL SELECT 'Elevage et agriculture'
  UNION ALL SELECT 'Transport et voyage' UNION ALL SELECT 'Reparation et entretien'
  UNION ALL SELECT 'Frais de bureau et divers' UNION ALL SELECT 'Achats et approvisionnements'
) v
WHERE @exp_acc IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `subAccount` s WHERE s.`name` = v.n AND s.`accountId` = @exp_acc);
--> statement-breakpoint

-- Table de correspondance (VRAIE table, pas temporary).
DROP TABLE IF EXISTS `tmp_expense_remap_0149`;
--> statement-breakpoint

CREATE TABLE `tmp_expense_remap_0149` (
  `src_id` BIGINT NOT NULL,
  `dst_id` BIGINT NOT NULL,
  PRIMARY KEY (`src_id`)
);
--> statement-breakpoint

SET @c_fuel  := (SELECT id FROM `subAccount` WHERE `name`='Carburant et energie'        AND `accountId`=@exp_acc LIMIT 1);
--> statement-breakpoint
SET @c_work  := (SELECT id FROM `subAccount` WHERE `name`='Travaux et chantiers'         AND `accountId`=@exp_acc LIMIT 1);
--> statement-breakpoint
SET @c_wage  := (SELECT id FROM `subAccount` WHERE `name`='Salaires et main-d oeuvre'    AND `accountId`=@exp_acc LIMIT 1);
--> statement-breakpoint
SET @c_farm  := (SELECT id FROM `subAccount` WHERE `name`='Elevage et agriculture'       AND `accountId`=@exp_acc LIMIT 1);
--> statement-breakpoint
SET @c_trip  := (SELECT id FROM `subAccount` WHERE `name`='Transport et voyage'          AND `accountId`=@exp_acc LIMIT 1);
--> statement-breakpoint
SET @c_repa  := (SELECT id FROM `subAccount` WHERE `name`='Reparation et entretien'      AND `accountId`=@exp_acc LIMIT 1);
--> statement-breakpoint
SET @c_misc  := (SELECT id FROM `subAccount` WHERE `name`='Frais de bureau et divers'    AND `accountId`=@exp_acc LIMIT 1);
--> statement-breakpoint
SET @c_buy   := (SELECT id FROM `subAccount` WHERE `name`='Achats et approvisionnements' AND `accountId`=@exp_acc LIMIT 1);
--> statement-breakpoint

-- 2a) Reparation et entretien (priorite haute : reparation/tracteur).
INSERT INTO `tmp_expense_remap_0149` (`src_id`,`dst_id`)
SELECT sa.id, @c_repa FROM `subAccount` sa
JOIN `account` a ON a.id = sa.`accountId`
WHERE a.`type`='Expense' AND @c_repa IS NOT NULL
  AND sa.id NOT IN (@c_fuel,@c_work,@c_wage,@c_farm,@c_trip,@c_repa,@c_misc,@c_buy)
  AND sa.`name` NOT IN ('Cost of Sales','Salary','Rent','Utilities','Discount Given','Maintenance','FarmOS Expenses','Exchange Fees','Coût des ventes','Loyer','Remise accordée')
  AND (LOWER(sa.`name`) LIKE '%réparation%' OR LOWER(sa.`name`) LIKE '%reparation%' OR LOWER(sa.`name`) LIKE '%tracteur%');
--> statement-breakpoint

-- 2b) Carburant et energie.
INSERT INTO `tmp_expense_remap_0149` (`src_id`,`dst_id`)
SELECT sa.id, @c_fuel FROM `subAccount` sa
JOIN `account` a ON a.id = sa.`accountId`
WHERE a.`type`='Expense' AND @c_fuel IS NOT NULL
  AND sa.id NOT IN (@c_fuel,@c_work,@c_wage,@c_farm,@c_trip,@c_repa,@c_misc,@c_buy)
  AND sa.`name` NOT IN ('Cost of Sales','Salary','Rent','Utilities','Discount Given','Maintenance','FarmOS Expenses','Exchange Fees','Coût des ventes','Loyer','Remise accordée')
  AND sa.id NOT IN (SELECT src_id FROM `tmp_expense_remap_0149`)
  AND (LOWER(sa.`name`) LIKE '%carburant%' OR LOWER(sa.`name`) LIKE '%électrogène%' OR LOWER(sa.`name`) LIKE '%electrogene%' OR LOWER(sa.`name`) LIKE '%groupe élect%');
--> statement-breakpoint

-- 2c) Salaires et main-d oeuvre.
INSERT INTO `tmp_expense_remap_0149` (`src_id`,`dst_id`)
SELECT sa.id, @c_wage FROM `subAccount` sa
JOIN `account` a ON a.id = sa.`accountId`
WHERE a.`type`='Expense' AND @c_wage IS NOT NULL
  AND sa.id NOT IN (@c_fuel,@c_work,@c_wage,@c_farm,@c_trip,@c_repa,@c_misc,@c_buy)
  AND sa.`name` NOT IN ('Cost of Sales','Salary','Rent','Utilities','Discount Given','Maintenance','FarmOS Expenses','Exchange Fees','Coût des ventes','Loyer','Remise accordée')
  AND sa.id NOT IN (SELECT src_id FROM `tmp_expense_remap_0149`)
  AND (LOWER(sa.`name`) LIKE '%salaire%' OR LOWER(sa.`name`) LIKE '%salary%' OR LOWER(sa.`name`) LIKE '%main-d%' OR LOWER(sa.`name`) LIKE '%main d%' OR LOWER(sa.`name`) LIKE '%personnel%' OR LOWER(sa.`name`) LIKE '%ration%' OR LOWER(sa.`name`) LIKE '%briquetier%');
--> statement-breakpoint

-- 2d) Elevage et agriculture (avant Travaux pour capter etang/poisson/porc).
INSERT INTO `tmp_expense_remap_0149` (`src_id`,`dst_id`)
SELECT sa.id, @c_farm FROM `subAccount` sa
JOIN `account` a ON a.id = sa.`accountId`
WHERE a.`type`='Expense' AND @c_farm IS NOT NULL
  AND sa.id NOT IN (@c_fuel,@c_work,@c_wage,@c_farm,@c_trip,@c_repa,@c_misc,@c_buy)
  AND sa.`name` NOT IN ('Cost of Sales','Salary','Rent','Utilities','Discount Given','Maintenance','FarmOS Expenses','Exchange Fees','Coût des ventes','Loyer','Remise accordée')
  AND sa.id NOT IN (SELECT src_id FROM `tmp_expense_remap_0149`)
  AND (LOWER(sa.`name`) LIKE '%porc%' OR LOWER(sa.`name`) LIKE '%poisson%' OR LOWER(sa.`name`) LIKE '%étang%' OR LOWER(sa.`name`) LIKE '%etang%' OR LOWER(sa.`name`) LIKE '%aliment%' OR LOWER(sa.`name`) LIKE '%pharmaceutique%' OR LOWER(sa.`name`) LIKE '%bétail%' OR LOWER(sa.`name`) LIKE '%betail%' OR LOWER(sa.`name`) LIKE '%manioc%' OR LOWER(sa.`name`) LIKE '%moulin%' OR LOWER(sa.`name`) LIKE '%porcherie%' OR LOWER(sa.`name`) LIKE '%sarclage%');
--> statement-breakpoint

-- 2e) Travaux et chantiers.
INSERT INTO `tmp_expense_remap_0149` (`src_id`,`dst_id`)
SELECT sa.id, @c_work FROM `subAccount` sa
JOIN `account` a ON a.id = sa.`accountId`
WHERE a.`type`='Expense' AND @c_work IS NOT NULL
  AND sa.id NOT IN (@c_fuel,@c_work,@c_wage,@c_farm,@c_trip,@c_repa,@c_misc,@c_buy)
  AND sa.`name` NOT IN ('Cost of Sales','Salary','Rent','Utilities','Discount Given','Maintenance','FarmOS Expenses','Exchange Fees','Coût des ventes','Loyer','Remise accordée')
  AND sa.id NOT IN (SELECT src_id FROM `tmp_expense_remap_0149`)
  AND (LOWER(sa.`name`) LIKE '%chantier%' OR LOWER(sa.`name`) LIKE '%travaux%' OR LOWER(sa.`name`) LIKE '%construction%' OR LOWER(sa.`name`) LIKE '%forage%' OR LOWER(sa.`name`) LIKE '%briqu%' OR LOWER(sa.`name`) LIKE '%ciment%' OR LOWER(sa.`name`) LIKE '%sable%' OR LOWER(sa.`name`) LIKE '%poussiere%' OR LOWER(sa.`name`) LIKE '%poussière%');
--> statement-breakpoint

-- 2f) Transport et voyage.
INSERT INTO `tmp_expense_remap_0149` (`src_id`,`dst_id`)
SELECT sa.id, @c_trip FROM `subAccount` sa
JOIN `account` a ON a.id = sa.`accountId`
WHERE a.`type`='Expense' AND @c_trip IS NOT NULL
  AND sa.id NOT IN (@c_fuel,@c_work,@c_wage,@c_farm,@c_trip,@c_repa,@c_misc,@c_buy)
  AND sa.`name` NOT IN ('Cost of Sales','Salary','Rent','Utilities','Discount Given','Maintenance','FarmOS Expenses','Exchange Fees','Coût des ventes','Loyer','Remise accordée')
  AND sa.id NOT IN (SELECT src_id FROM `tmp_expense_remap_0149`)
  AND (LOWER(sa.`name`) LIKE '%voyage%' OR LOWER(sa.`name`) LIKE '%transport%' OR LOWER(sa.`name`) LIKE '%paillage%');
--> statement-breakpoint

-- 2g) Achats et approvisionnements.
INSERT INTO `tmp_expense_remap_0149` (`src_id`,`dst_id`)
SELECT sa.id, @c_buy FROM `subAccount` sa
JOIN `account` a ON a.id = sa.`accountId`
WHERE a.`type`='Expense' AND @c_buy IS NOT NULL
  AND sa.id NOT IN (@c_fuel,@c_work,@c_wage,@c_farm,@c_trip,@c_repa,@c_misc,@c_buy)
  AND sa.`name` NOT IN ('Cost of Sales','Salary','Rent','Utilities','Discount Given','Maintenance','FarmOS Expenses','Exchange Fees','Coût des ventes','Loyer','Remise accordée')
  AND sa.id NOT IN (SELECT src_id FROM `tmp_expense_remap_0149`)
  AND (LOWER(sa.`name`) LIKE 'achat%' OR LOWER(sa.`name`) LIKE '%achat %');
--> statement-breakpoint

-- 2h) Reste des parasites Expense -> Frais de bureau et divers (fourre-tout).
INSERT INTO `tmp_expense_remap_0149` (`src_id`,`dst_id`)
SELECT sa.id, @c_misc FROM `subAccount` sa
JOIN `account` a ON a.id = sa.`accountId`
WHERE a.`type`='Expense' AND @c_misc IS NOT NULL
  AND sa.id NOT IN (@c_fuel,@c_work,@c_wage,@c_farm,@c_trip,@c_repa,@c_misc,@c_buy)
  AND sa.`name` NOT IN ('Cost of Sales','Salary','Rent','Utilities','Discount Given','Maintenance','FarmOS Expenses','Exchange Fees','Coût des ventes','Loyer','Remise accordée')
  AND sa.id NOT IN (SELECT src_id FROM `tmp_expense_remap_0149`);
--> statement-breakpoint

-- 3) Remap table plate `transaction` (debitId + creditId).
UPDATE `transaction` t
JOIN `tmp_expense_remap_0149` r ON r.`src_id` = t.`debitId`
SET t.`debitId` = r.`dst_id`;
--> statement-breakpoint

UPDATE `transaction` t
JOIN `tmp_expense_remap_0149` r ON r.`src_id` = t.`creditId`
SET t.`creditId` = r.`dst_id`;
--> statement-breakpoint

-- 4) Remap ledger `journal_entry_lines.account_id`.
UPDATE `journal_entry_lines` jl
JOIN `tmp_expense_remap_0149` r ON r.`src_id` = jl.`account_id`
SET jl.`account_id` = r.`dst_id`;
--> statement-breakpoint

-- 5) Soft-delete des sous-comptes parasites remappes.
UPDATE `subAccount` sa
JOIN `tmp_expense_remap_0149` r ON r.`src_id` = sa.id
SET sa.`status` = 'false', sa.`updated_at` = NOW();
--> statement-breakpoint

DROP TABLE IF EXISTS `tmp_expense_remap_0149`;
