-- 0151_transaction_types_expense_cleanup.sql
-- Suite de 0149/0150 : ces migrations ont regroupe les sous-comptes de charge
-- "libelles d'operation" vers 8 comptes canoniques et soft-delete les parasites.
-- Or 67 transaction_types pointaient leur debit_account_id vers ces sous-comptes
-- desormais inactifs (1 type "raccourci de saisie" par depense = meme anti-pattern).
--
-- Action : soft-delete (is_active=0) tout transaction_type dont le compte de DEBIT
-- pointe un subAccount inactif (status='false') ou inexistant ; et creer 8 types
-- generiques propres (un par categorie de charge), debit=categorie, credit=Caisse
-- principale, pour la saisie courante des depenses.
--
-- Idempotent / re-jouable (boot repair index >=70). Pas d'apostrophe dans commentaires.
-- Une instruction par statement-breakpoint.
--> statement-breakpoint

SET @exp_acc := (SELECT id FROM `account` WHERE `type` = 'Expense' ORDER BY id LIMIT 1);
--> statement-breakpoint

-- Compte de credit par defaut pour la saisie des depenses : Caisse principale (actif).
SET @cash := (SELECT id FROM `subAccount` WHERE `name` = 'Caisse principale' AND `status` = 'true' ORDER BY id LIMIT 1);
--> statement-breakpoint

-- 1) Soft-delete les types dont le DEBIT pointe un sous-compte inactif/inexistant.
UPDATE `transaction_types` tt
LEFT JOIN `subAccount` da ON da.id = tt.`debit_account_id`
SET tt.`is_active` = 0, tt.`updated_at` = NOW()
WHERE tt.`is_active` = 1
  AND (da.id IS NULL OR da.`status` = 'false');
--> statement-breakpoint

-- 2) Ids des 8 comptes de charge canoniques (crees par 0149/0150).
SET @c_fuel  := (SELECT id FROM `subAccount` WHERE `name`='Carburant et energie'        AND `accountId`=@exp_acc AND `status`='true' LIMIT 1);
--> statement-breakpoint
SET @c_work  := (SELECT id FROM `subAccount` WHERE `name`='Travaux et chantiers'         AND `accountId`=@exp_acc AND `status`='true' LIMIT 1);
--> statement-breakpoint
SET @c_wage  := (SELECT id FROM `subAccount` WHERE `name`='Salaires et main-d oeuvre'    AND `accountId`=@exp_acc AND `status`='true' LIMIT 1);
--> statement-breakpoint
SET @c_farm  := (SELECT id FROM `subAccount` WHERE `name`='Elevage et agriculture'       AND `accountId`=@exp_acc AND `status`='true' LIMIT 1);
--> statement-breakpoint
SET @c_trip  := (SELECT id FROM `subAccount` WHERE `name`='Transport et voyage'          AND `accountId`=@exp_acc AND `status`='true' LIMIT 1);
--> statement-breakpoint
SET @c_repa  := (SELECT id FROM `subAccount` WHERE `name`='Reparation et entretien'      AND `accountId`=@exp_acc AND `status`='true' LIMIT 1);
--> statement-breakpoint
SET @c_misc  := (SELECT id FROM `subAccount` WHERE `name`='Frais de bureau et divers'    AND `accountId`=@exp_acc AND `status`='true' LIMIT 1);
--> statement-breakpoint
SET @c_buy   := (SELECT id FROM `subAccount` WHERE `name`='Achats et approvisionnements' AND `accountId`=@exp_acc AND `status`='true' LIMIT 1);
--> statement-breakpoint

-- 3) Creer 8 types generiques de depense (idempotent par nom). Debit=categorie, Credit=Caisse principale.
INSERT INTO `transaction_types` (`name`, `debit_account_id`, `credit_account_id`, `description`, `is_active`, `created_at`, `updated_at`)
SELECT v.n, v.d, @cash, v.de, 1, NOW(), NOW() FROM (
  SELECT 'Depense - Carburant et energie'        AS n, @c_fuel AS d, 'Saisie depense carburant/energie'        AS de
  UNION ALL SELECT 'Depense - Travaux et chantiers',          @c_work, 'Saisie depense travaux/chantiers'
  UNION ALL SELECT 'Depense - Salaires et main-d oeuvre',     @c_wage, 'Saisie salaires/main-d oeuvre'
  UNION ALL SELECT 'Depense - Elevage et agriculture',        @c_farm, 'Saisie depense elevage/agriculture'
  UNION ALL SELECT 'Depense - Transport et voyage',           @c_trip, 'Saisie depense transport/voyage'
  UNION ALL SELECT 'Depense - Reparation et entretien',       @c_repa, 'Saisie depense reparation/entretien'
  UNION ALL SELECT 'Depense - Frais de bureau et divers',     @c_misc, 'Saisie frais de bureau/divers'
  UNION ALL SELECT 'Depense - Achats et approvisionnements',  @c_buy,  'Saisie achats/approvisionnements'
) v
WHERE @cash IS NOT NULL AND v.d IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM `transaction_types` t WHERE t.`name` = v.n);
--> statement-breakpoint

-- 4) Reactiver (au cas ou re-jeu apres soft-delete) ces 8 types generiques s'ils existaient deja inactifs.
UPDATE `transaction_types`
SET `is_active` = 1, `updated_at` = NOW()
WHERE `name` IN (
  'Depense - Carburant et energie','Depense - Travaux et chantiers','Depense - Salaires et main-d oeuvre',
  'Depense - Elevage et agriculture','Depense - Transport et voyage','Depense - Reparation et entretien',
  'Depense - Frais de bureau et divers','Depense - Achats et approvisionnements'
) AND `is_active` = 0;
