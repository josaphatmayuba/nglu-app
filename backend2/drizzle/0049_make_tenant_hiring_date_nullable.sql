-- Allow tenants without a hiring date (form no longer asks for it).
ALTER TABLE `tenant_details` MODIFY `hiring_date` date NULL;
