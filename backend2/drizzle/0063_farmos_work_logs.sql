CREATE TABLE `farmos_work_logs` (
  `id` SERIAL PRIMARY KEY,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `user_id` BIGINT NOT NULL,
  `work_date` DATE NOT NULL,
  `hours` DECIMAL(5,2),
  `notes` TEXT,
  `tasks` JSON,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_work_org` (`organization_id`, `is_active`),
  INDEX `idx_work_user_date` (`user_id`, `work_date`)
);
