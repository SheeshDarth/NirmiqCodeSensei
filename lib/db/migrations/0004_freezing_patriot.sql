CREATE UNIQUE INDEX `daily_logs_workspace_date` ON `daily_logs` (`workspace_id`,`date`);--> statement-breakpoint
ALTER TABLE `learning_maps` DROP COLUMN `concepts_json`;