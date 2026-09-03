-- Corrige le typage du plan comptable racine : les comptes Revenue et Expense
-- etaient seedes en type Equity (erreur historique du seeder), si bien que le
-- compte de resultat (ledger filtre sur type Revenue / Expense) ne les voyait
-- jamais et que le selecteur de comptes de charge restait vide.
-- Idempotent : UPDATE cible par nom, ne touche que les lignes encore mal typees.
-- Sans apostrophe dans les commentaires (le splitter de migration suit les quotes).
UPDATE `account` SET `type` = 'Revenue', `updated_at` = NOW()
WHERE `name` = 'Revenue' AND `type` <> 'Revenue';
--> statement-breakpoint
UPDATE `account` SET `type` = 'Expense', `updated_at` = NOW()
WHERE `name` = 'Expense' AND `type` <> 'Expense';
