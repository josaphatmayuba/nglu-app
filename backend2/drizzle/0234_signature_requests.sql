-- Demandes de signature manuscrite par lien public.
-- Cas d usage : on cree une demande avec un texte libre affiche en haut, puis on
-- envoie UN seul lien. La personne ouvre le lien sur son telephone et trace deux
-- signatures a la main : une au nom de Bianca, une au nom de Liam. Le signataire
-- physique (Roxanna) signe donc les deux fois depuis le meme appareil.
--
-- signature_requests : l entete (texte affiche, token public, statut).
--   public_token = identifiant du lien, aleatoire et non devinable (UUID v4 sans
--   tirets, 32 caracteres). Il remplace toute authentification : la page de
--   signature est publique, donc le token est le seul secret. Index UNIQUE pour
--   la resolution du lien et pour empecher toute collision.
--   status : pending (aucune signature) -> partial (une des deux) -> completed.
--   completed_at est renseigne quand les deux signatures sont presentes.
--
-- signature_signatures : une ligne par signature tracee (deux au maximum).
--   party_key identifie la case signee : bianca ou liam. UNIQUE (request_id,
--   party_key) garantit qu une case ne peut pas etre signee deux fois, ce qui
--   rend le POST idempotent cote metier plutot que de dependre du frontend.
--   signature_data contient le trace au format data URL PNG (base64) produit par
--   le canvas HTML. MEDIUMTEXT (16 Mo) : un trace de canvas mobile pese quelques
--   dizaines de Ko, LONGTEXT serait du gaspillage et TEXT (64 Ko) trop juste.
--   signer_name est le nom du signataire physique (Roxanna), distinct de la case
--   signee : on trace QUI a signe POUR QUI, ce qui est le point juridique du
--   dossier. ip_address / user_agent sont conserves comme preuve de depot.
--
-- Soft delete via status sur l entete (regle projet : jamais de DELETE physique).
-- Idempotent (rejouable au boot) : CREATE TABLE IF NOT EXISTS suffit ici, aucune
-- colonne ajoutee a une table existante. Un seul statement par breakpoint.
-- Aucune apostrophe dans les commentaires (le splitter suit les quotes).
CREATE TABLE IF NOT EXISTS `signature_requests` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `public_token` VARCHAR(64) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `body` TEXT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'pending',
  `completed_at` TIMESTAMP NULL DEFAULT NULL,
  `created_by` BIGINT NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_signature_requests_token` (`public_token`),
  KEY `idx_signature_requests_org` (`organization_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `signature_signatures` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_id` BIGINT UNSIGNED NOT NULL,
  `party_key` VARCHAR(40) NOT NULL,
  `party_label` VARCHAR(120) NOT NULL,
  `signer_name` VARCHAR(160) NULL,
  `signature_data` MEDIUMTEXT NOT NULL,
  `signed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ip_address` VARCHAR(64) NULL,
  `user_agent` TEXT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_signature_party` (`request_id`, `party_key`),
  KEY `idx_signature_request` (`request_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
