-- BatiPro : fusion des situations legacy (batipro_situations) vers le socle
-- documentaire batipro_documents (type=situation). Data-only, idempotent,
-- rejouable au boot. Aucune ecriture ledger generee (statuts bornes hors
-- validated pour bloquer createInvoiceFromSituation). Legacy soft-deleted.
-- Marqueur de tracabilite dans notes : "[MIGRE legacy #<id>]" (pas d apostrophe).
--> statement-breakpoint
INSERT INTO `batipro_documents`
  (`organization_id`, `project_id`, `type`, `direction`, `number`, `status`,
   `currency_id`, `total_ht`, `total_vat`, `total_ttc`, `paid_amount`, `notes`,
   `is_active`, `created_at`, `updated_at`)
SELECT
  s.`organization_id`,
  s.`project_id`,
  'situation',
  'outbound',
  CONCAT('SIT-', YEAR(s.`created_at`), '-', LPAD(s.`number`, 4, '0')),
  CASE
    WHEN s.`status` IN ('Payee', 'Payée') THEN 'paid'
    WHEN s.`status` IN ('Rejetee', 'Rejetée') THEN 'cancelled'
    ELSE 'draft'
  END,
  s.`currency_id`,
  s.`amount`,
  0,
  s.`amount`,
  CASE WHEN s.`status` IN ('Payee', 'Payée') THEN s.`amount` ELSE 0 END,
  CONCAT('[MIGRE legacy #', s.`id`, '] Deja comptabilise hors socle, ne pas refacturer. Periode : ', COALESCE(s.`period`, '-'), ' | Avancement : ', s.`progress`, ' %'),
  1,
  s.`created_at`,
  s.`updated_at`
FROM `batipro_situations` s
WHERE s.`is_active` = 1
  AND NOT EXISTS (
    SELECT 1 FROM `batipro_documents` d
    WHERE d.`type` = 'situation'
      AND d.`notes` LIKE CONCAT('[MIGRE legacy #', s.`id`, ']%')
  );
--> statement-breakpoint
INSERT INTO `batipro_document_lines`
  (`organization_id`, `document_id`, `position`, `designation`, `quantity`,
   `unit_price`, `vat_rate`, `line_ht`, `line_ttc`, `progress_pct`, `phase_id`,
   `is_active`, `created_at`, `updated_at`)
SELECT
  s.`organization_id`,
  d.`id`,
  0,
  CONCAT('Situation n ', s.`number`, COALESCE(CONCAT(' - ', s.`period`), '')),
  1,
  s.`amount`,
  0,
  s.`amount`,
  s.`amount`,
  s.`progress`,
  NULL,
  1,
  s.`created_at`,
  s.`updated_at`
FROM `batipro_situations` s
JOIN `batipro_documents` d
  ON d.`type` = 'situation'
 AND d.`notes` LIKE CONCAT('[MIGRE legacy #', s.`id`, ']%')
WHERE s.`is_active` = 1
  AND NOT EXISTS (
    SELECT 1 FROM `batipro_document_lines` l WHERE l.`document_id` = d.`id`
  );
--> statement-breakpoint
UPDATE `batipro_situations` SET `is_active` = 0 WHERE `is_active` = 1;
