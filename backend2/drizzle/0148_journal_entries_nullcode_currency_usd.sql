-- ============================================================
-- Backfill: journal_entries pointant vers une devise dont le currencyCode est
-- NULL/vide -> defaut USD canonique. + soft-delete des lignes currency orphelines.
-- ============================================================
-- CAUSE REELLE (diagnostic base dev, 2026-06-14):
--   La 2e ligne "USD" parasite des KPI Produits/Charges vient de currency_id=318
--   ("DOLLAR", symbole '$', currencyCode=NULL, status='false') porteur de ~437
--   ecritures legacy. La page Comptabilite regroupe par currency_id ; le frontend
--   affiche le symbole/repli "USD" quand currencyCode est NULL -> 2e ligne USD
--   distincte de la vraie USD (id=1).
-- POURQUOI 0143/0146/0147 N'ONT RIEN CORRIGE:
--   - 0143 ne fusionne que les lignes currency status='true' ET par currencyName
--     identique ; id=318 est status='false' et currencyName='DOLLAR' != 'US Dollar'
--     -> exclu de la map.
--   - 0146/0147 ne ciblent que currency_id IS NULL ou ORPHELIN (aucune ligne
--     currency correspondante). Or id=318 EXISTE dans currency (la jointure trouve
--     une ligne) : la condition c.id IS NULL est fausse -> 0 ecriture touchee.
--   Le vrai symptome n'etait pas un id manquant mais une ligne currency reelle
--   dont seul le currencyCode est NULL.
-- PRINCIPE: aucun montant touche ; on ne corrige que la reference devise. USD
--   canonique calcule dans une variable de session AVANT l'UPDATE (un sous-SELECT
--   sur `currency` dans un UPDATE qui joint deja `currency` -> ERROR 1093 ->
--   migration skippee silencieusement). splitSqlStatements coupe sur ';' :
--   statements autonomes, 1 par breakpoint. Idempotent.
-- ============================================================
SET @usd_id := COALESCE((SELECT MIN(id) FROM currency WHERE status = 'true' AND (currencyCode = 'USD' OR (currencyName LIKE '%Dollar%' AND currencyName NOT LIKE '%Canad%'))), 1);
--> statement-breakpoint
UPDATE journal_entries je
JOIN currency c ON c.id = je.currency_id
SET je.currency_id = @usd_id
WHERE je.currency_id <> @usd_id AND (c.currencyCode IS NULL OR c.currencyCode = '');
--> statement-breakpoint
UPDATE currency c
SET c.status = 'false'
WHERE c.id <> @usd_id AND (c.currencyCode IS NULL OR c.currencyCode = '');
