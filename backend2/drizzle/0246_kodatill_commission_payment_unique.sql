-- Index UNIQUE sur kt_commission_entries.payment_id : garde-fou DB contre le
-- double calcul concurrent des commissions. Le filtre applicatif (SELECT des
-- paymentId deja traites puis boucle d INSERT dans platform-commissions.service)
-- ne protege pas de deux appels simultanes de POST /platform/commissions/compute.
-- payment_id est NULLABLE : MySQL autorise plusieurs NULL dans un index UNIQUE,
-- donc les eventuelles lignes sans paiement ne sont pas contraintes. Le seul
-- INSERT applicatif renseigne toujours payment_id, il n y a donc pas de ligne
-- NULL produite par le code aujourd hui.
-- Idempotent : INFORMATION_SCHEMA + PREPARE/EXECUTE (MySQL 8 ne supporte pas
-- CREATE UNIQUE INDEX IF NOT EXISTS). Un seul statement par breakpoint.
-- Securite : si des doublons preexistent, la creation de l index echouerait et
-- bloquerait le boot du conteneur ; on ne cree donc l index que si aucun
-- doublon n existe (sinon no-op, a traiter manuellement).
SET @idx_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'kt_commission_entries'
    AND INDEX_NAME = 'uq_kt_commission_entries_payment'
);
--> statement-breakpoint
SET @tbl_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'kt_commission_entries'
);
--> statement-breakpoint
SET @dup_count = 0;
--> statement-breakpoint
SET @sql_dup = IF(@tbl_exists = 1,
  'SELECT COUNT(*) INTO @dup_count FROM (SELECT `payment_id` FROM `kt_commission_entries` WHERE `payment_id` IS NOT NULL GROUP BY `payment_id` HAVING COUNT(*) > 1) d',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt_dup FROM @sql_dup;
--> statement-breakpoint
EXECUTE stmt_dup;
--> statement-breakpoint
DEALLOCATE PREPARE stmt_dup;
--> statement-breakpoint
SET @sql = IF(@tbl_exists = 1 AND @idx_exists = 0 AND @dup_count = 0,
  'CREATE UNIQUE INDEX `uq_kt_commission_entries_payment` ON `kt_commission_entries` (`payment_id`)',
  'SELECT 1'
);
--> statement-breakpoint
PREPARE stmt FROM @sql;
--> statement-breakpoint
EXECUTE stmt;
--> statement-breakpoint
DEALLOCATE PREPARE stmt;
