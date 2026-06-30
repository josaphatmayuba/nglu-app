-- farmos_species_managers : affectation utilisateur <-> espece (RBAC par espece, Phase 2).
-- Un gestionnaire ne voit/gere que les especes qui lui sont affectees ; affectation
-- EN PLUS du role. species = varchar coherent avec farmos_animals.species.
-- Scope par organisation. Soft-delete via is_active. Unique (user_id, species).
-- Idempotent (CREATE IF NOT EXISTS, index/unique dans le CREATE).

CREATE TABLE IF NOT EXISTS `farmos_species_managers` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `user_id` bigint NOT NULL,
  `species` varchar(50) NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  UNIQUE KEY `uq_species_managers_user_species` (`user_id`, `species`),
  INDEX `idx_species_managers_org` (`organization_id`, `is_active`)
);
