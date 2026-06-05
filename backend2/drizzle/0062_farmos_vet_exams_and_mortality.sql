CREATE TABLE `farmos_vet_exams` (
  `id` SERIAL PRIMARY KEY,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `animal_id` BIGINT,
  `species` VARCHAR(50),
  `vet` VARCHAR(255),
  `vet_user_id` BIGINT,
  `exam_date` DATE NOT NULL,
  `diagnosis` TEXT,
  `notes` TEXT,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_exam_org` (`organization_id`, `is_active`),
  INDEX `idx_exam_date` (`exam_date`)
);
--> statement-breakpoint
CREATE TABLE `farmos_mortality_events` (
  `id` SERIAL PRIMARY KEY,
  `organization_id` BIGINT NOT NULL DEFAULT 1,
  `animal_id` BIGINT,
  `species` VARCHAR(50) NOT NULL,
  `event_date` DATE NOT NULL,
  `count` INT NOT NULL DEFAULT 1,
  `cause` VARCHAR(255),
  `necropsy_requested` TINYINT NOT NULL DEFAULT 0,
  `notes` TEXT,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_mortality_org` (`organization_id`, `is_active`),
  INDEX `idx_mortality_date` (`event_date`)
);
