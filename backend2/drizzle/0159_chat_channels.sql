--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chat_channels` (
  `id` int NOT NULL AUTO_INCREMENT,
  `slug` varchar(80) NOT NULL COMMENT 'identifiant URL: transactions-journalieres, rh, comptabilite...',
  `name` varchar(120) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `icon` varchar(50) DEFAULT NULL COMMENT 'nom icone lucide-react',
  `color` varchar(20) DEFAULT '#6366f1',
  `is_default` tinyint(1) NOT NULL DEFAULT 0 COMMENT '1 = tous les utilisateurs rejoignent auto',
  `created_by` int NOT NULL,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_channel_slug` (`slug`),
  KEY `idx_channel_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `chat_channel_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `channel_id` int NOT NULL,
  `user_id` int NOT NULL,
  `role` varchar(20) NOT NULL DEFAULT 'member' COMMENT 'admin | member',
  `joined_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_channel_member` (`channel_id`, `user_id`),
  KEY `idx_member_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `journal_discussions`
  ADD COLUMN IF NOT EXISTS `channel_id` int DEFAULT NULL COMMENT 'null = discussion contextuelle, set = channel permanent',
  ADD COLUMN IF NOT EXISTS `discussion_type` varchar(30) NOT NULL DEFAULT 'entity' COMMENT 'entity | channel | direct';
--> statement-breakpoint
INSERT IGNORE INTO `chat_channels` (`slug`, `name`, `description`, `icon`, `color`, `is_default`, `created_by`) VALUES
  ('general', 'Général', 'Canal de discussion générale', 'MessageCircle', '#6366f1', 1, 1),
  ('transactions', 'Transactions journalières', 'Suivi des transactions et mouvements financiers quotidiens', 'TrendingUp', '#10b981', 1, 1),
  ('rh', 'Ressources humaines', 'Annonces RH, congés, paie', 'Users', '#f59e0b', 0, 1),
  ('comptabilite', 'Comptabilité', 'Écritures, clôtures, rapports', 'BookOpen', '#8b5cf6', 0, 1),
  ('direction', 'Direction', 'Canal réservé à la direction', 'Shield', '#e11d48', 0, 1);
