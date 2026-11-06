CREATE TABLE `decision_records` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`title` text NOT NULL,
	`chosen_option` text NOT NULL,
	`alternatives_json` text DEFAULT '[]' NOT NULL,
	`rationale` text NOT NULL,
	`accepted_tradeoff` text,
	`affected_paths_json` text DEFAULT '[]' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
