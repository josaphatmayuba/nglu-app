-- real_estate_property_assignments : affectation utilisateur <-> bien (RBAC par
-- bien, Domus, Phase 2). N IMPORTE QUEL user peut etre limite a 1..N biens,
-- INDEPENDAMMENT du role et du poste. Le role decide des droits, le bien du
-- perimetre. property_id -> real_estate_properties. Scope par organisation.
-- Soft-delete via is_active. Unique (user_id, property_id).
-- Idempotent (CREATE IF NOT EXISTS, index/unique inline).

CREATE TABLE IF NOT EXISTS `real_estate_property_assignments` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `user_id` bigint NOT NULL,
  `property_id` bigint NOT NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  UNIQUE KEY `uq_property_assignments_user_property` (`user_id`, `property_id`),
  INDEX `idx_property_assignments_org` (`organization_id`, `is_active`)
);
