-- Idempotent (rejouable à chaque boot via OPERATIONAL_REPAIR_MIGRATIONS).
-- Documents FarmOS : certificats sanitaires, ordonnances, factures, analyses labo.
-- Stockage base64 inline (même pattern que farmos_animal_photos).

CREATE TABLE IF NOT EXISTS `farmos_documents` (
  `id` serial AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `organization_id` bigint NOT NULL DEFAULT 1,
  `animal_id` bigint NULL,
  `exam_id` bigint NULL,
  `doc_type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `filename` varchar(255) NULL,
  `content_type` varchar(100) NULL,
  `size_bytes` int NULL,
  `data_url` mediumtext NOT NULL,
  `issued_date` date NULL,
  `notes` text NULL,
  `uploaded_by` bigint NULL,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT (now())
);
