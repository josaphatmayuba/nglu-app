-- ============================================================
-- Backfill: journal_entries pointant vers un currency_id ORPHELIN (aucune ligne
-- correspondante dans currency) -> defaut USD canonique.
-- CAUSE: ~329 ecritures legacy en currency_id=318 (id inexistant dans la table
--   currency active). L'API renvoie alors currencyCode=NULL et le frontend
--   retombe sur le repli CUR ("USD") -> une 2e ligne "USD" parasite dans les KPI.
-- 0146 ne couvrait que currency_id IS NULL (pas les orphelins).
-- PRINCIPE: aucun montant touche; on ne corrige que la reference devise manquante.
-- IMPORTANT: on calcule l'USD canonique dans une variable de session AVANT
--   l'UPDATE. Un sous-SELECT sur `currency` a l'interieur d'un UPDATE qui joint
--   deja `currency` declenche ERROR 1093 (can't reopen table) -> migration skipped
--   silencieusement par applyOperationalRepairs -> donnees inchangees.
-- splitSqlStatements coupe sur ';' : statements autonomes, 1 par breakpoint.
-- Idempotent: ne touche que les lignes dont le currency_id ne joint plus rien.
-- ============================================================
SET @usd_id := COALESCE((SELECT MIN(id) FROM currency WHERE status = 'true' AND (currencyCode = 'USD' OR (currencyName LIKE '%Dollar%' AND currencyName NOT LIKE '%Canad%'))), 1);
--> statement-breakpoint
UPDATE journal_entries je
LEFT JOIN currency c ON c.id = je.currency_id
SET je.currency_id = @usd_id
WHERE je.currency_id IS NOT NULL AND c.id IS NULL;
