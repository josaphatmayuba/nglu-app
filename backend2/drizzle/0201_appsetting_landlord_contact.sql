ALTER TABLE `appSetting` ADD COLUMN `landlord_name` varchar(255);
--> statement-breakpoint
ALTER TABLE `appSetting` ADD COLUMN `landlord_phone` varchar(50);
--> statement-breakpoint
UPDATE `real_estate_contract_templates` SET `body` = REPLACE(`body`, 'résidant au [ADRESSE DU BAILLEUR]', 'résidant au [ADRESSE DU BAILLEUR], Téléphone : [TÉLÉPHONE DU BAILLEUR]') WHERE `body` LIKE '%résidant au [ADRESSE DU BAILLEUR]%' AND `body` NOT LIKE '%[TÉLÉPHONE DU BAILLEUR]%';
--> statement-breakpoint
UPDATE `real_estate_contract_templates` SET `body` = REPLACE(`body`, 'BAILLEUR : [NOM COMPLET DU BAILLEUR], [ADRESSE DU BAILLEUR]', 'BAILLEUR : [NOM COMPLET DU BAILLEUR], [ADRESSE DU BAILLEUR], Téléphone : [TÉLÉPHONE DU BAILLEUR]') WHERE `body` NOT LIKE '%[TÉLÉPHONE DU BAILLEUR]%';
