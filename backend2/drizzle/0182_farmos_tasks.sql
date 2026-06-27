-- farmos_tasks : taches assignees a l'equipe (COMP-P1-010).
-- Distinct de farmos_work_logs (journal retrospectif d'heures faites).
-- Statuts : todo / in_progress / done / postponed.
-- Liables a un animal, lot, batiment ou zone (champs optionnels).
-- Idempotent (safe au re-jeu) : index definis dans le CREATE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS `farmos_tasks` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `title` varchar(255) NOT NULL,
  `description` text NULL,
  `status` varchar(20) NOT NULL DEFAULT 'todo',
  `priority` varchar(20) NOT NULL DEFAULT 'medium',
  `assigned_user_id` bigint NULL,
  `due_date` date NULL,
  `animal_id` bigint NULL,
  `lot` varchar(255) NULL,
  `building_id` bigint NULL,
  `zone_id` bigint NULL,
  `photo_url` text NULL,
  `done_at` timestamp NULL,
  `created_by` bigint NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  INDEX `idx_tasks_org` (`organization_id`, `is_active`),
  INDEX `idx_tasks_assignee` (`assigned_user_id`, `status`)
);
