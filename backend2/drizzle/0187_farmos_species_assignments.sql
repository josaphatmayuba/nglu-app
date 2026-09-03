-- farmos_species_assignments : affectation utilisateur <-> espece (RBAC par espece, Phase 2).
-- N IMPORTE QUEL utilisateur (employe, veterinaire, superviseur...) peut etre
-- limite a 1..N especes, INDEPENDAMMENT du role et du poste. Le role decide des
-- droits, l espece du perimetre. species = varchar coherent avec
-- farmos_animals.species. Scope par organisation. Soft-delete via is_active.
-- Unique (user_id, species). Idempotent (CREATE IF NOT EXISTS, index/unique inline).

CREATE TABLE IF NOT EXISTS `farmos_species_assignments` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `user_id` bigint NOT NULL,
  `species` varchar(50) NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  UNIQUE KEY `uq_species_assignments_user_species` (`user_id`, `species`),
  INDEX `idx_species_assignments_org` (`organization_id`, `is_active`)
);
