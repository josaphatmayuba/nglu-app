-- Domus : reponses des DELEGUES aux relances de loyer en retard.
--
-- Quand un loyer est en retard, le delegue affecte au bien recoit un SMS avec
-- un lien : il repond si le locataire a paye ou non. Chaque reponse est tracee
-- ici, meme negative, pour que le gestionnaire sache ou en est le recouvrement
-- au lieu de relancer a l aveugle.
--
-- answer = paid (le locataire a paye) ou unpaid (pas encore).
-- Sur paid, le delegue saisit un montant et peut joindre UNE photo de preuve
-- (recu, capture mobile money) ; une ligne real_estate_rent_payments est alors
-- creee en statut pending et son id est conserve dans rent_payment_id.
--
-- POINT DE SECURITE : la confirmation ne cree JAMAIS un paiement paid et ne
-- genere aucune ecriture comptable. Le lien portail n est protege par aucun mot
-- de passe ; laisser un lien SMS ecrire dans la comptabilite serait ouvrir la
-- caisse a quiconque le detient. Le gestionnaire valide ensuite la ligne
-- pending depuis le CRM (confirmPendingPayment), et c est cette validation qui
-- passe l ecriture. Meme logique que les demandes de modification du portail
-- locataire, qui restent pending jusqu a approbation.
--
-- Forme idempotente : la migration doit pouvoir etre rejouee sur dev et prod.
CREATE TABLE IF NOT EXISTS `real_estate_delegate_rent_checks` (
  `id` int AUTO_INCREMENT NOT NULL,
  `organization_id` int NOT NULL,
  `delegate_id` int NOT NULL,
  `lease_id` int NOT NULL,
  `property_id` int,
  `token` varchar(64),
  `token_hash` varchar(128) NOT NULL,
  `period_month` date,
  `answer` varchar(20),
  `amount` decimal(15,2),
  `currency_id` int,
  `comment` varchar(500),
  `proof_url` varchar(500),
  `rent_payment_id` int,
  `answered_at` timestamp NULL,
  `expires_at` timestamp NULL,
  `revoked_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `real_estate_delegate_rent_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
SET @uniq_chk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_delegate_rent_checks' AND INDEX_NAME = 'real_estate_delegate_rent_checks_token_hash_unique');
--> statement-breakpoint
SET @sql := IF(@uniq_chk = 0, 'CREATE UNIQUE INDEX `real_estate_delegate_rent_checks_token_hash_unique` ON `real_estate_delegate_rent_checks` (`token_hash`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
--> statement-breakpoint
-- Un seul lien actif par (delegue, bail, mois) : le cron de retard tourne tous
-- les jours et re-emettrait sinon un lien different a chaque passage, rendant
-- caducs les SMS deja partis.
SET @idx_chk := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_delegate_rent_checks' AND INDEX_NAME = 'idx_delegate_rent_checks_lookup');
--> statement-breakpoint
SET @sql2 := IF(@idx_chk = 0, 'CREATE INDEX `idx_delegate_rent_checks_lookup` ON `real_estate_delegate_rent_checks` (`organization_id`, `delegate_id`, `lease_id`, `period_month`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt2 FROM @sql2;
--> statement-breakpoint
EXECUTE stmt2;
--> statement-breakpoint
DEALLOCATE PREPARE stmt2;
--> statement-breakpoint
-- File de suivi cote gestionnaire : les reponses recentes, repondues ou non.
SET @idx_chk2 := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'real_estate_delegate_rent_checks' AND INDEX_NAME = 'idx_delegate_rent_checks_answer');
--> statement-breakpoint
SET @sql3 := IF(@idx_chk2 = 0, 'CREATE INDEX `idx_delegate_rent_checks_answer` ON `real_estate_delegate_rent_checks` (`organization_id`, `answer`, `answered_at`)', 'SELECT 1');
--> statement-breakpoint
PREPARE stmt3 FROM @sql3;
--> statement-breakpoint
EXECUTE stmt3;
--> statement-breakpoint
DEALLOCATE PREPARE stmt3;
