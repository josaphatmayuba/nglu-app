CREATE TABLE `farmos_feed_forecasts` (
  `id` SERIAL PRIMARY KEY,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `species` VARCHAR(50) NOT NULL,
  `item` VARCHAR(255) NOT NULL,
  `needed_kg` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `horizon_days` INT NOT NULL DEFAULT 14,
  `confidence` INT,
  `urgent` TINYINT NOT NULL DEFAULT 0,
  `source` VARCHAR(50) DEFAULT 'ai',
  `notes` TEXT,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_feed_forecast_org` (`organization_id`, `is_active`)
);
