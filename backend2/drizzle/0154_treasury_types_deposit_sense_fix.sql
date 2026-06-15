-- 0154_treasury_types_deposit_sense_fix.sql
-- Suite de 0153. Les libelles "depot"/"retrait" WU (#40/#41) etaient inverses par
-- rapport au sens comptable : un DEPOT en banque doit DEBITER la banque (l'argent y
-- entre) ; un RETRAIT doit la CREDITER. En base, #41 "depot" debitait les especes et
-- creditait la banque (= un retrait). On realigne nom + sens sur la realite comptable
-- (et sur la nomenclature validee par le user).
--
-- Regle : Asset augmente au DEBIT. Depot banque = banque augmente -> DEBIT banque.
-- Aucune ecriture n'utilise ces types (verifie 0153). Idempotent. 1 stmt/breakpoint.
--> statement-breakpoint

SET @wu_cash := (SELECT id FROM `subAccount` WHERE `name`='We et cash express en espèce' AND `status`='true' LIMIT 1);
--> statement-breakpoint
SET @wu_bank := (SELECT id FROM `subAccount` WHERE `name`='We et cash express en banque' AND `status`='true' LIMIT 1);
--> statement-breakpoint

-- #41 = DEPOT especes -> banque : DEBIT banque (augmente), CREDIT especes (diminue).
UPDATE `transaction_types`
SET `name`='WU : depot especes vers banque',
    `description`='Depot des especes WU sur le compte bancaire WU (banque augmente)',
    `debit_account_id`=@wu_bank, `credit_account_id`=@wu_cash, `updated_at`=NOW()
WHERE `id`=41 AND @wu_bank IS NOT NULL AND @wu_cash IS NOT NULL;
--> statement-breakpoint

-- #40 = RETRAIT banque -> especes : DEBIT especes (augmente), CREDIT banque (diminue).
UPDATE `transaction_types`
SET `name`='WU : retrait banque vers especes',
    `description`='Retrait du compte bancaire WU vers les especes WU (especes augmentent)',
    `debit_account_id`=@wu_cash, `credit_account_id`=@wu_bank, `updated_at`=NOW()
WHERE `id`=40 AND @wu_cash IS NOT NULL AND @wu_bank IS NOT NULL;
