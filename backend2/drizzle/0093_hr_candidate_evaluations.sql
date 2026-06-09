-- Idempotent (rejouable à chaque boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Évaluations candidat avec grille de critères pondérés + score agrégé.

CREATE TABLE IF NOT EXISTS `hr_candidate_evaluations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `candidateId` bigint NOT NULL,
  `evaluatorId` bigint,
  `criteria` json,
  `total_score` double NOT NULL DEFAULT 0,
  `max_score` double NOT NULL DEFAULT 0,
  `comment` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hr_candidate_eval_candidate` (`candidateId`)
);
