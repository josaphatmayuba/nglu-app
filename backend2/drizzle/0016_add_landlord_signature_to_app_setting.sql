-- 0016_add_landlord_signature_to_app_setting.sql
-- Store an optional landlord signature (base64 PNG data URL) used on
-- signed contracts. When NULL, the UI falls back to a text stamp.

SET @addLandlordSigSql := IF(
  (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'appSetting'
      AND COLUMN_NAME = 'landlord_signature'
  ) = 0,
  'ALTER TABLE `appSetting` ADD COLUMN `landlord_signature` LONGTEXT NULL AFTER `logo`',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE addLandlordSigStmt FROM @addLandlordSigSql;
--> statement-breakpoint
EXECUTE addLandlordSigStmt;
--> statement-breakpoint
DEALLOCATE PREPARE addLandlordSigStmt;
