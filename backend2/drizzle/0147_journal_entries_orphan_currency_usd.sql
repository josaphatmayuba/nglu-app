-- ============================================================
-- Backfill: journal_entries pointant vers un currency_id ORPHELIN (aucune ligne
-- correspondante dans currency) -> defaut USD canonique.
-- CAUSE: ~329 ecritures legacy en currency_id=318 (id inexistant dans la table
--   currency active). L'API renvoie alors currencyCode=NULL et le frontend
--   retombe sur le repli CUR ("USD") -> une 2e ligne "USD" parasite dans les KPI
--   du compte de resultat (en plus de la vraie USD id 1).
-- 0146 ne couvrait que currency_id IS NULL (pas les orphelins) et visait un repli
--   id=2 / currencyName='DOLLAR' absent ici (l'USD de cette base = code 'USD').
-- PRINCIPE: aucun montant touche; on ne corrige que la reference devise manquante.
--   USD canonique = MIN(id) actif dont currencyCode='USD' OU currencyName LIKE '%Dollar%'
--   (hors CAD), repli 1. Convention legacy "devise manquante = USD".
-- Idempotent: ne change que les lignes dont le currency_id ne joint plus rien.
-- ============================================================
UPDATE journal_entries je
LEFT JOIN currency c ON c.id = je.currency_id
SET je.currency_id = COALESCE(
  (SELECT MIN(id) FROM currency
     WHERE status = 'true'
       AND (currencyCode = 'USD' OR (currencyName LIKE '%Dollar%' AND currencyName NOT LIKE '%Canad%'))),
  1)
WHERE je.currency_id IS NOT NULL AND c.id IS NULL;
