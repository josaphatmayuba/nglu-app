-- batipro_project_assignments : affectation utilisateur <-> chantier (RBAC par
-- chantier, BatiPro, Phase 2). N IMPORTE QUEL user peut etre limite a 1..N
-- chantiers, INDEPENDAMMENT du role et du poste. Le role decide des droits, le
-- chantier du perimetre. project_id -> batipro_projects. Scope par organisation.
-- Soft-delete via is_active. Unique (user_id, project_id).
-- Idempotent (CREATE IF NOT EXISTS, index/unique inline).

CREATE TABLE IF NOT EXISTS `batipro_project_assignments` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `user_id` bigint NOT NULL,
  `project_id` bigint NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  UNIQUE KEY `uq_batipro_project_assignments_user_project` (`user_id`, `project_id`),
  INDEX `idx_batipro_project_assignments_org` (`organization_id`, `is_active`)
);
