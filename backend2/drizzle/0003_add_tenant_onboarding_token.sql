ALTER TABLE `tenant_onboardings`
  ADD COLUMN `token` varchar(128) AFTER `token_hash`;
