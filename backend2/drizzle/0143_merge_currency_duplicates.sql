-- ============================================================
-- Fusion des devises en doublon (meme currencyName) -> 1 seule devise canonique.
-- CAUSE: la page Comptabilite regroupe par currencyId mais affiche le symbole,
--   donc plusieurs lignes currency de meme nom (ex: DOLLAR) affichent USD plusieurs fois.
-- PRINCIPE: on ne touche AUCUN montant ni aucune ecriture; on repointe seulement
--   les colonnes currency_id/currencyId vers le MIN(id) du meme currencyName.
-- IMPORTANT: regroupement par currencyName (propre), JAMAIS par symbole
--   (symboles mojibake degenerent en '?' et fusionneraient des devises differentes).
-- Statements AUTONOMES (1 par --> statement-breakpoint, pas de procedure stockee:
--   splitSqlStatements coupe sur ';' au boot -> ER_PARSE_ERROR). Idempotent.
-- Soft-delete (status='false') des lignes currency doublon a la fin (jamais de DELETE).
-- ============================================================
CREATE TABLE IF NOT EXISTS _currency_merge_map (dup_id BIGINT PRIMARY KEY, canon_id BIGINT NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
--> statement-breakpoint
-- Vider la map (idempotence: on la reconstruit a chaque passage).
DELETE FROM _currency_merge_map WHERE 1=1;
--> statement-breakpoint
-- doublons = lignes actives de meme nom dont l'id n'est pas le MIN(id) du nom.
-- canon = MIN(id) actif du meme currencyName (sous-requete derivee, pas de table temporaire).
INSERT INTO _currency_merge_map (dup_id, canon_id) SELECT c.id, k.canon_id FROM currency c JOIN (SELECT currencyName AS nm, MIN(id) AS canon_id FROM currency WHERE status='true' GROUP BY currencyName) k ON k.nm=c.currencyName WHERE c.status='true' AND c.id<>k.canon_id;
--> statement-breakpoint
-- === Recablage des references devise (1 UPDATE par colonne) ===
UPDATE journal_entries t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE currency_exchanges t JOIN _currency_merge_map m ON t.from_currency_id=m.dup_id SET t.from_currency_id=m.canon_id;
--> statement-breakpoint
UPDATE currency_exchanges t JOIN _currency_merge_map m ON t.to_currency_id=m.dup_id SET t.to_currency_id=m.canon_id;
--> statement-breakpoint
UPDATE currency_exchanges t JOIN _currency_merge_map m ON t.fee_currency_id=m.dup_id SET t.fee_currency_id=m.canon_id;
--> statement-breakpoint
UPDATE projects t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE purchase_orders t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE budgets t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE tenant_details t JOIN _currency_merge_map m ON t.salary_currency_id=m.dup_id SET t.salary_currency_id=m.canon_id;
--> statement-breakpoint
UPDATE transaction t JOIN _currency_merge_map m ON t.currencyId=m.dup_id SET t.currencyId=m.canon_id;
--> statement-breakpoint
UPDATE real_estate_properties t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE real_estate_units t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE real_estate_leases t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE real_estate_rent_payments t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE real_estate_security_deposits t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE real_estate_maintenance_requests t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE real_estate_maintenance_costs t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE salary_histories t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE hr_payrolls t JOIN _currency_merge_map m ON t.currencyId=m.dup_id SET t.currencyId=m.canon_id;
--> statement-breakpoint
UPDATE hr_projects t JOIN _currency_merge_map m ON t.currencyId=m.dup_id SET t.currencyId=m.canon_id;
--> statement-breakpoint
UPDATE hr_project_assignments t JOIN _currency_merge_map m ON t.currencyId=m.dup_id SET t.currencyId=m.canon_id;
--> statement-breakpoint
UPDATE hr_contracts t JOIN _currency_merge_map m ON t.currencyId=m.dup_id SET t.currencyId=m.canon_id;
--> statement-breakpoint
UPDATE hr_expense_requests t JOIN _currency_merge_map m ON t.currencyId=m.dup_id SET t.currencyId=m.canon_id;
--> statement-breakpoint
UPDATE hr_social_declarations t JOIN _currency_merge_map m ON t.currencyId=m.dup_id SET t.currencyId=m.canon_id;
--> statement-breakpoint
UPDATE hr_training_sessions t JOIN _currency_merge_map m ON t.currencyId=m.dup_id SET t.currencyId=m.canon_id;
--> statement-breakpoint
UPDATE appSetting t JOIN _currency_merge_map m ON t.currencyId=m.dup_id SET t.currencyId=m.canon_id;
--> statement-breakpoint
UPDATE saleInvoice t JOIN _currency_merge_map m ON t.currencyId=m.dup_id SET t.currencyId=m.canon_id;
--> statement-breakpoint
UPDATE purchaseInvoice t JOIN _currency_merge_map m ON t.currencyId=m.dup_id SET t.currencyId=m.canon_id;
--> statement-breakpoint
UPDATE farmos_sales t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE farmos_price_list t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE farmos_expenses t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
UPDATE farmos_semen_straws t JOIN _currency_merge_map m ON t.currency_id=m.dup_id SET t.currency_id=m.canon_id;
--> statement-breakpoint
-- === Soft-delete des lignes currency doublon (ligne devise seulement, pas les ecritures) ===
UPDATE currency c JOIN _currency_merge_map m ON c.id=m.dup_id SET c.status='false';
--> statement-breakpoint
DROP TABLE IF EXISTS _currency_merge_map;
