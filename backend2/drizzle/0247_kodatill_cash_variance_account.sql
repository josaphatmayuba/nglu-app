-- KodaTill (SCRUM-307) : ajoute le compte canonique "Ecart de caisse" au plan
-- comptable de CHAQUE organisation existante.
-- Pre-requis operationnel de KodatillAccountingService.postCashSessionClosure :
-- le service resout ce compte par NOM, scope organisation, et ne cree jamais de
-- compte lui meme. Tant qu il est absent, une cloture de caisse presentant un
-- ecart (excedent ou manquant au comptage) n est PAS comptabilisee (warn).
-- Le nom est ecrit sans accent (Ecart de caisse) : il doit correspondre au
-- caractere pres a ACCOUNT_CASH_VARIANCE dans accounting.service.ts.
-- Compte UNIQUE recevant les deux sens : CREDIT si excedent (produit),
-- DEBIT si manquant (contre passation). Sens naturel positif = CREDIT, donc
-- rattache au compte racine Revenue (le compte de resultat du ledger ne retient
-- que les racines Revenue / Expense, cf. bug des racines typees Equity).
-- Aucune donnee de demo : uniquement un compte de reference du plan comptable.
-- Idempotent (rejouable au boot) : INSERT ... SELECT ... WHERE NOT EXISTS,
-- meme pattern que la migration 0231 (Supplier Advance). Un seul statement par
-- breakpoint. Aucune apostrophe dans les commentaires.
INSERT INTO `subAccount` (`organization_id`, `name`, `accountId`, `status`, `created_at`, `updated_at`)
SELECT `a`.`organization_id`, 'Ecart de caisse', `a`.`id`, 'true', NOW(), NOW()
FROM `account` `a`
WHERE `a`.`name` = 'Revenue'
  AND NOT EXISTS (SELECT 1 FROM `subAccount` `s` WHERE `s`.`organization_id` = `a`.`organization_id` AND `s`.`name` = 'Ecart de caisse');
