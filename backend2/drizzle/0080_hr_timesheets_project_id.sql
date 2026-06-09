SET @hr_timesheets_project_id_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'hr_timesheets'
    AND COLUMN_NAME = 'projectId'
);
--> statement-breakpoint
SET @hr_timesheets_project_id_sql := IF(
  @hr_timesheets_project_id_exists = 0,
  'ALTER TABLE `hr_timesheets` ADD COLUMN `projectId` BIGINT NULL AFTER `periodEndDate`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE hr_timesheets_project_id_stmt FROM @hr_timesheets_project_id_sql;
--> statement-breakpoint
EXECUTE hr_timesheets_project_id_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE hr_timesheets_project_id_stmt;
--> statement-breakpoint
UPDATE `hr_timesheets` t
JOIN `hr_projects` p
  ON p.`organization_id` = t.`organization_id`
 AND (
    t.`project` = p.`name`
    OR t.`project` = p.`code`
    OR t.`project` = CONCAT(p.`code`, ' - ', p.`name`)
 )
SET t.`projectId` = p.`id`,
    t.`donor` = COALESCE(NULLIF(t.`donor`, ''), p.`donor`)
WHERE t.`projectId` IS NULL;
--> statement-breakpoint
SET @hr_timesheets_project_id_idx_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'hr_timesheets'
    AND INDEX_NAME = 'idx_hr_timesheets_project_id'
);
--> statement-breakpoint
SET @hr_timesheets_project_id_idx_sql := IF(
  @hr_timesheets_project_id_idx_exists = 0,
  'CREATE INDEX `idx_hr_timesheets_project_id` ON `hr_timesheets` (`projectId`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE hr_timesheets_project_id_idx_stmt FROM @hr_timesheets_project_id_idx_sql;
--> statement-breakpoint
EXECUTE hr_timesheets_project_id_idx_stmt;
--> statement-breakpoint
DEALLOCATE PREPARE hr_timesheets_project_id_idx_stmt;
