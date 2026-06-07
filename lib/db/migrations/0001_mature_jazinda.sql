CREATE TABLE `session_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`tool_name` text NOT NULL,
	`action_summary` text NOT NULL,
	`explanation` text NOT NULL,
	`risk_level` text DEFAULT 'safe' NOT NULL,
	`outcome` text,
	`source` text DEFAULT 'hook' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
