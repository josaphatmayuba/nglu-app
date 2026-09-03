-- 0153_treasury_transaction_types_fix.sql
-- Assainissement des types de transaction de TRESORERIE (Caisse / WU & Cash Express).
-- Constat (dev) : noms chaotiques + fautes, 2 doublons, 3 sens debit/credit inverses.
-- AUCUNE ecriture n'utilise ces types (verifie : 0 transaction) -> correction sans
-- risque sur l'historique. On ne touche PAS au plan comptable (les comptes pointes
-- sont de vrais comptes Asset/Equity/Liability), seulement aux transaction_types.
--
-- Regle partie double : Asset augmente au DEBIT ; Liability et Equity au CREDIT.
-- Idempotent (UPDATE cibles par id ; reactivation conditionnelle). 1 stmt/breakpoint.
--> statement-breakpoint

-- Ids des comptes (par nom, robuste). Trecorerie = Asset, capital = Equity, dette = Liability.
SET @cash    := (SELECT id FROM `subAccount` WHERE `name`='Caisse principale' AND `status`='true' LIMIT 1);
--> statement-breakpoint
SET @wu_cash := (SELECT id FROM `subAccount` WHERE `name`='We et cash express en espèce' AND `status`='true' LIMIT 1);
--> statement-breakpoint
SET @wu_bank := (SELECT id FROM `subAccount` WHERE `name`='We et cash express en banque' AND `status`='true' LIMIT 1);
--> statement-breakpoint
SET @cap_wu  := (SELECT id FROM `subAccount` WHERE `name` LIKE 'Capital WU et We et cash express%' LIMIT 1);
--> statement-breakpoint
SET @cap_cash:= (SELECT id FROM `subAccount` WHERE `name`='capital caisse principale' LIMIT 1);
--> statement-breakpoint
SET @debt_wu := (SELECT id FROM `subAccount` WHERE `name`='dette en espèce de ONGD à We et cash express' LIMIT 1);
--> statement-breakpoint
SET @debt_cash:= (SELECT id FROM `subAccount` WHERE `name` LIKE 'Dette en espèce de ONGD pour la caisse principale%' LIMIT 1);
--> statement-breakpoint

-- ── 1) Corrections de SENS (debit/credit inverses) ──

-- 84 : sortie de caisse vers WU. Etait D=capital caisse / C=Caisse (faux : touche le
-- capital). Correct : WU especes augmente (DEBIT), Caisse diminue (CREDIT).
UPDATE `transaction_types`
SET `debit_account_id`=@wu_cash, `credit_account_id`=@cash, `updated_at`=NOW()
WHERE `id`=84 AND @wu_cash IS NOT NULL AND @cash IS NOT NULL;
--> statement-breakpoint

-- 79 : emprunt en caisse. Etait D=Dette / C=Caisse (inverse). Correct : Caisse augmente
-- (DEBIT, Asset), Dette augmente (CREDIT, Liability).
UPDATE `transaction_types`
SET `debit_account_id`=@cash, `credit_account_id`=@debt_cash, `updated_at`=NOW()
WHERE `id`=79 AND @cash IS NOT NULL AND @debt_cash IS NOT NULL;
--> statement-breakpoint

-- 75 : emprunt aupres de WU (especes). Etait D=Dette / C=WU especes (inverse).
-- Correct : WU especes augmente (DEBIT), Dette augmente (CREDIT).
UPDATE `transaction_types`
SET `debit_account_id`=@wu_cash, `credit_account_id`=@debt_wu, `updated_at`=NOW()
WHERE `id`=75 AND @wu_cash IS NOT NULL AND @debt_wu IS NOT NULL;
--> statement-breakpoint

-- ── 2) DESACTIVER les doublons (is_active=0, soft) ──
-- 80 = doublon de 40 (WU banque -> WU especes) et contredit sa propre description.
-- 83 = inverse de 41 (deja couvert par 40/41).
-- 78 = doublon de 44 (apport capital en caisse).
UPDATE `transaction_types` SET `is_active`=0, `updated_at`=NOW() WHERE `id` IN (80, 83, 78);
--> statement-breakpoint

-- ── 3) RENOMMAGE clair et coherent (terminologie unique "WU & Cash Express") ──
UPDATE `transaction_types` SET `name`='WU : retrait banque vers especes',  `description`='Transfert du compte bancaire WU vers les especes WU', `updated_at`=NOW() WHERE `id`=40;
--> statement-breakpoint
UPDATE `transaction_types` SET `name`='WU : depot especes vers banque',    `description`='Depot des especes WU sur le compte bancaire WU', `updated_at`=NOW() WHERE `id`=41;
--> statement-breakpoint
UPDATE `transaction_types` SET `name`='Apport capital vers Caisse principale', `description`='Augmentation du capital en caisse principale', `updated_at`=NOW() WHERE `id`=44;
--> statement-breakpoint
UPDATE `transaction_types` SET `name`='Remboursement capital depuis la Caisse', `description`='Restitution de capital depuis la caisse principale', `updated_at`=NOW() WHERE `id`=59;
--> statement-breakpoint
UPDATE `transaction_types` SET `name`='Emprunt WU (especes) vers Caisse/Tresorerie', `description`='Dette en especes contractee aupres de WU & Cash Express', `updated_at`=NOW() WHERE `id`=75;
--> statement-breakpoint
UPDATE `transaction_types` SET `name`='Remboursement dette WU (especes)', `description`='Remboursement de la dette contractee aupres de WU & Cash Express', `updated_at`=NOW() WHERE `id`=76;
--> statement-breakpoint
UPDATE `transaction_types` SET `name`='Emprunt vers Caisse principale', `description`='Dette en especes affectee a la caisse principale', `updated_at`=NOW() WHERE `id`=79;
--> statement-breakpoint
UPDATE `transaction_types` SET `name`='Transfert WU (banque) vers Caisse principale', `description`='Transfert depuis le compte WU vers la caisse principale', `updated_at`=NOW() WHERE `id`=81;
--> statement-breakpoint
UPDATE `transaction_types` SET `name`='Transfert Caisse principale vers WU (especes)', `description`='Sortie de la caisse principale vers les especes WU', `updated_at`=NOW() WHERE `id`=84;
