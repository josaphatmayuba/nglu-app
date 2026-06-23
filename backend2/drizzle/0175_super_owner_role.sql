-- P1 multi-tenant : role systeme super_owner (proprietaire de la plateforme).
-- Au-dessus des organisations : support / monitoring / suspendre un tenant +
-- bascule d org via l en-tete X-Active-Org (honoree par le guard uniquement pour
-- ce role). Les users clients restent enfermes dans leur organisation.
-- Idempotent : INSERT seulement si le role n existe pas deja (name est UNIQUE).

INSERT INTO `role` (`name`, `status`, `is_system`, `created_at`, `updated_at`)
SELECT 'super_owner', 'true', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `role` WHERE `name` = 'super_owner');
--> statement-breakpoint
