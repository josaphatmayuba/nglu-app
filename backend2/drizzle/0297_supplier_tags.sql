-- Registre des tiers : deux axes de classement, tous les deux multi-valeurs.
--
-- Avant cette migration, un tiers portait un seul `supplier.supplier_type`, qui
-- melangeait deux questions differentes :
--   - DANS QUELLE APP il apparait (construction, real_estate, farm...)
--   - CE QU IL FAIT (nous livrer des produits, ou travailler sur un chantier)
--
-- Un seul champ mono-valeur ne peut repondre aux deux. Consequence concrete :
-- un sous-traitant saisi dans BatiPro (supplier_type=construction) ne pouvait
-- PAS apparaitre dans Domus (qui demande type=real_estate). Il fallait le
-- saisir deux fois, avec deux historiques de facturation separes pour la meme
-- personne.
--
-- D ou cette table, qui porte les deux axes :
--   axis=domain   -> general | construction | real_estate | farm | factory
--                    un tiers peut cocher plusieurs domaines et etre vu dans
--                    plusieurs apps tout en restant UN seul enregistrement.
--   axis=nature   -> goods        (nous livre des produits / materiaux)
--                    subcontractor (travaille temporairement sur le chantier
--                                   et nous facture ; inclut le tacheron paye
--                                   au forfait)
--                    service      (prestation ponctuelle hors chantier :
--                                  plomberie sur un bien Domus, nettoyage...)
--
-- `supplier.supplier_type` est CONSERVE et continue d etre ecrit : il reste le
-- domaine principal, et les ecrans qui le lisent encore ne changent pas de
-- comportement. La table ne fait qu ajouter les valeurs supplementaires.
--
-- Le journalier de chantier n est PAS ici : il ne facture pas, il est paye a la
-- journee et vit dans batipro_workers avec son pointage.
--
-- Forme idempotente : la migration doit pouvoir etre rejouee sur dev et prod.
CREATE TABLE IF NOT EXISTS `supplier_tags` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL,
  `supplier_id` int NOT NULL,
  `axis` varchar(20) NOT NULL,
  `code` varchar(40) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `supplier_tags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
-- Un tiers ne porte pas deux fois le meme tag : le backfill ci-dessous et les
-- rejeux de la migration doivent rester sans effet une fois passes.
SET @uniq_chk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_tags' AND INDEX_NAME = 'supplier_tags_unique');
--> statement-breakpoint
SET @sql := IF(@uniq_chk = 0, 'CREATE UNIQUE INDEX `supplier_tags_unique` ON `supplier_tags` (`organization_id`, `supplier_id`, `axis`, `code`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
-- Sens de lecture principal : "donne-moi les tiers de tel axe/code" pour
-- construire la liste filtree d un ecran.
SET @idx_chk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_tags' AND INDEX_NAME = 'idx_supplier_tags_lookup');
--> statement-breakpoint
SET @sql2 := IF(@idx_chk = 0, 'CREATE INDEX `idx_supplier_tags_lookup` ON `supplier_tags` (`organization_id`, `axis`, `code`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt2 FROM @sql2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
--> statement-breakpoint
-- Sens inverse : afficher les tags d une fiche tiers.
SET @idx_chk2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'supplier_tags' AND INDEX_NAME = 'idx_supplier_tags_supplier');
--> statement-breakpoint
SET @sql3 := IF(@idx_chk2 = 0, 'CREATE INDEX `idx_supplier_tags_supplier` ON `supplier_tags` (`organization_id`, `supplier_id`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt3 FROM @sql3;
--> statement-breakpoint
EXECUTE stmt3;
--> statement-breakpoint
DEALLOCATE PREPARE stmt3;
--> statement-breakpoint
-- Backfill du domaine : chaque tiers existant recoit son supplier_type actuel
-- comme premier domaine, donc les listes par app restent identiques a l existant.
-- Ce n est pas du seed de demonstration : on reprend une donnee deja saisie.
INSERT IGNORE INTO `supplier_tags` (`organization_id`, `supplier_id`, `axis`, `code`)
SELECT `organization_id`, `id`, 'domain', COALESCE(NULLIF(`supplier_type`, ''), 'general') FROM `supplier`;
--> statement-breakpoint
-- Backfill de la nature : aucune donnee existante ne dit si un tiers livre des
-- produits ou sous-traite. On ne devine pas, on ne marque donc RIEN ici.
-- Un tiers sans tag de nature est traite comme non classe et reste visible dans
-- toutes les listes de nature, pour qu aucun tiers ne disparaisse d un ecran le
-- jour du deploiement. Le classement se fait ensuite a la main depuis la fiche.
SELECT 1;
