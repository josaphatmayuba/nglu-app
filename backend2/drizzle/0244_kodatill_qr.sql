-- KodaTill Phase 3 (SCRUM-294 / epic SCRUM-278) : QR codes de commande et
-- journal des scans.
--
-- kt_qr_codes porte un QR physique colle sur une table, une zone ou un
-- comptoir. label est le libelle affiche cote personnel (exemple Table 03),
-- slug est la partie lisible utilisee dans les URLs internes et public_token
-- est le jeton opaque non devinable qui identifie le QR sur le canal public.
-- Le token est genere cote application (aleatoire cryptographique), jamais ici
-- puisque aucune donnee nest inseree par cette migration. La cle UNIQUE sur
-- public_token protege contre une collision et rend la recherche publique
-- directe, sans passer par organization_id qui est inconnu du scanneur.
--
-- scan_count et last_scan_at sont des compteurs denormalises maintenus a
-- lecriture pour eviter un COUNT sur kt_qr_scans a chaque affichage de la
-- liste des QR. La verite detaillee reste kt_qr_scans.
--
-- kt_qr_scans est une table a forte volumetrie : un scan par client et par
-- passage. user_agent_hash stocke une empreinte du user agent et non le user
-- agent brut, pour la deduplication et lanalyse sans conserver de donnee
-- identifiante. order_id est nullable car un scan ne debouche pas toujours sur
-- une commande, il est renseigne a posteriori quand la commande est creee.
--
-- Index de volumetrie demandes : kt_qr_codes(organization_id, branch_id) pour
-- lister les QR dune succursale, et kt_qr_scans(qr_code_id, scanned_at) pour
-- les statistiques et la purge par fenetre temporelle.
--
-- Conventions projet : organization_id BIGINT NOT NULL DEFAULT 1 partout,
-- soft delete via status, created_at / updated_at systematiques, un seul
-- statement par breakpoint, aucune apostrophe dans les commentaires, aucune
-- donnee de demonstration inseree. Comme les autres tables kt_, aucune
-- contrainte FOREIGN KEY physique nest posee : les relations sont portees par
-- des colonnes BIGINT UNSIGNED alignees sur le type des cles primaires et par
-- des index, lintegrite etant assuree au niveau applicatif.
CREATE TABLE IF NOT EXISTS `kt_qr_codes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `branch_id` BIGINT UNSIGNED NOT NULL,
  `label` VARCHAR(160) NOT NULL,
  `type` ENUM('table','zone','counter') NOT NULL DEFAULT 'table',
  `slug` VARCHAR(160) NOT NULL,
  `public_token` VARCHAR(64) NOT NULL,
  `scan_count` INT NOT NULL DEFAULT 0,
  `last_scan_at` DATETIME NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_kt_qr_codes_public_token` (`public_token`),
  KEY `idx_kt_qr_codes_org_branch` (`organization_id`, `branch_id`),
  KEY `idx_kt_qr_codes_org` (`organization_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `kt_qr_scans` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `qr_code_id` BIGINT UNSIGNED NOT NULL,
  `scanned_at` DATETIME NOT NULL,
  `user_agent_hash` VARCHAR(64) NULL,
  `order_id` BIGINT UNSIGNED NULL,
  `status` VARCHAR(10) NOT NULL DEFAULT 'true',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_kt_qr_scans_code_date` (`qr_code_id`, `scanned_at`),
  KEY `idx_kt_qr_scans_org` (`organization_id`, `status`),
  KEY `idx_kt_qr_scans_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
