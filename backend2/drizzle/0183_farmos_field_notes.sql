-- farmos_field_notes : notes terrain geolocalisees (COMP-P1-009).
-- Texte libre + coordonnees GPS (captees cote navigateur) + zone/lot optionnels + photo.
-- Soft-delete via is_active. Idempotent (safe au re-jeu) : index dans le CREATE IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS `farmos_field_notes` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `note` text NOT NULL,
  `latitude` decimal(10,7) NULL,
  `longitude` decimal(10,7) NULL,
  `accuracy` decimal(8,2) NULL,
  `zone_id` bigint NULL,
  `lot` varchar(255) NULL,
  `photo_url` text NULL,
  `created_by` bigint NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  INDEX `idx_field_notes_org` (`organization_id`, `is_active`)
);
