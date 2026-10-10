-- Domus : noms de variables explicites dans les modeles de messages existants.
-- Rappel de loyer : {amount} (loyer mensuel) devient {monthlyRent}. Preavis de defaut : {amount} (dette totale) devient {totalDebt}.
-- Retard : {daysLate} suivi de j ou jours devient {lateLabel}. Idempotent : ne touche que les lignes qui contiennent encore l ancien texte.
UPDATE `email_templates` SET `body` = REPLACE(`body`, '{amount}', '{monthlyRent}') WHERE `eventType` IN ('payment_reminder', 'payment_reminder_contact') AND `body` LIKE '%{amount}%';
--> statement-breakpoint
UPDATE `email_templates` SET `body` = REPLACE(`body`, '{amount}', '{totalDebt}') WHERE `eventType` IN ('default_notice', 'default_notice_contact') AND `body` LIKE '%{amount}%';
--> statement-breakpoint
UPDATE `email_templates` SET `body` = REPLACE(REPLACE(`body`, '{daysLate} jours', '{lateLabel}'), '{daysLate} j de retard', '{lateLabel} de retard') WHERE `eventType` IN ('payment_reminder', 'payment_reminder_contact') AND `body` LIKE '%{daysLate}%';
