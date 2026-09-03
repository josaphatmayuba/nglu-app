-- Journal Entreprise — tables principales.
-- Référentiel d'événements, tâches, pièces jointes et paramètres.
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `journal_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `event_type` enum('note','appel','reunion','courrier','incident','livraison','decision','visite') NOT NULL DEFAULT 'note',
  `source_module` varchar(64) NOT NULL DEFAULT 'general',
  `importance` enum('basse','moyenne','haute') NOT NULL DEFAULT 'basse',
  `event_date` date NOT NULL,
  `description` text,
  `location` varchar(255),
  `participants` text,
  `tags` text,
  `is_pinned` tinyint(1) NOT NULL DEFAULT 0,
  `created_by` int,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_journal_events_date` (`event_date`),
  KEY `idx_journal_events_type` (`event_type`),
  KEY `idx_journal_events_module` (`source_module`),
  KEY `idx_journal_events_pinned` (`is_pinned`),
  KEY `idx_journal_events_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `journal_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `notes` text,
  `due_date` date,
  `reminder_date` date,
  `priority` enum('basse','moyenne','haute') NOT NULL DEFAULT 'basse',
  `source_module` varchar(64) NOT NULL DEFAULT 'general',
  `related_event_id` int,
  `is_done` tinyint(1) NOT NULL DEFAULT 0,
  `done_at` timestamp NULL,
  `created_by` int,
  `status` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_journal_tasks_done` (`is_done`),
  KEY `idx_journal_tasks_due` (`due_date`),
  KEY `idx_journal_tasks_module` (`source_module`),
  KEY `idx_journal_tasks_event` (`related_event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `journal_attachments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `event_id` int NOT NULL,
  `filename` varchar(255) NOT NULL,
  `mime_type` varchar(128),
  `size_bytes` int,
  `url` text,
  `uploaded_by` int,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_journal_attachments_event` (`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `journal_audit_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int,
  `user_email` varchar(255),
  `user_name` varchar(255),
  `action` varchar(64) NOT NULL,
  `entity_type` varchar(64),
  `entity_id` int,
  `description` text,
  `ip_address` varchar(45),
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_journal_audit_user` (`user_id`),
  KEY `idx_journal_audit_action` (`action`),
  KEY `idx_journal_audit_entity` (`entity_type`, `entity_id`),
  KEY `idx_journal_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `journal_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `company_id` int,
  `email_notifications` tinyint(1) NOT NULL DEFAULT 1,
  `task_reminders` tinyint(1) NOT NULL DEFAULT 1,
  `urgent_alerts` tinyint(1) NOT NULL DEFAULT 1,
  `timezone` varchar(64) NOT NULL DEFAULT 'Africa/Kinshasa',
  `date_format` varchar(32) NOT NULL DEFAULT 'dd/MM/yyyy',
  `default_view` varchar(32) NOT NULL DEFAULT 'activite',
  `auto_audit` tinyint(1) NOT NULL DEFAULT 1,
  `cross_module_events` tinyint(1) NOT NULL DEFAULT 1,
  `retention_days` int NOT NULL DEFAULT 365,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
--> statement-breakpoint
INSERT IGNORE INTO `journal_settings` (`id`, `company_id`) VALUES (1, NULL);
