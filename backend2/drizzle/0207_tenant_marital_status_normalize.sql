UPDATE `tenant_details` SET `marital_status` = 'single' WHERE LOWER(`marital_status`) IN ('célibataire', 'celibataire');
--> statement-breakpoint
UPDATE `tenant_details` SET `marital_status` = 'married' WHERE LOWER(`marital_status`) IN ('marié', 'marie');
--> statement-breakpoint
UPDATE `tenant_details` SET `marital_status` = 'common_law' WHERE LOWER(`marital_status`) IN ('conjoint de fait', 'union libre');
--> statement-breakpoint
UPDATE `tenant_details` SET `marital_status` = 'divorced' WHERE LOWER(`marital_status`) IN ('divorcé', 'divorce');
--> statement-breakpoint
UPDATE `tenant_details` SET `marital_status` = 'widowed' WHERE LOWER(`marital_status`) IN ('veuf', 'veuve');
