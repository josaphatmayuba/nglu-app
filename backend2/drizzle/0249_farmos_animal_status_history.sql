-- Historique des changements de statut sante individuel d un animal (sain /
-- malade / quarantaine / etc.). Aucune table equivalente n existait avant :
-- farmosAnimals.status etait ecrase sans trace (cf farmos_batch_adjustments
-- qui trace deja les mouvements de COUNT, pas le statut sante).
-- previous_status/new_status = snapshot avant/apres. cause/note optionnels,
-- utilises notamment quand new_status = sick/quarantine.
-- Soft delete via is_active (regle projet : jamais de DELETE physique).
-- Idempotent (rejouable au boot) : CREATE TABLE IF NOT EXISTS suffit. Un seul
-- statement par breakpoint.
CREATE TABLE IF NOT EXISTS `farmos_animal_status_history` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `animal_id` BIGINT NOT NULL,
  `previous_status` VARCHAR(20) NULL,
  `new_status` VARCHAR(20) NOT NULL,
  `cause` VARCHAR(255) NULL,
  `note` TEXT NULL,
  `created_by` BIGINT NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_farmos_animal_status_history_org` (`organization_id`, `is_active`),
  KEY `idx_farmos_animal_status_history_animal` (`animal_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
