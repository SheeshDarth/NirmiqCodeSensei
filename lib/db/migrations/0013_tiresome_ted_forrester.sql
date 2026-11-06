CREATE TABLE `pathway_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`pathway_key` text NOT NULL,
	`content_version` text NOT NULL,
	`snapshot_json` text NOT NULL,
	`answer` text NOT NULL,
	`rubric_json` text NOT NULL,
	`scores_json` text NOT NULL,
	`score` integer NOT NULL,
	`ready` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `pathway_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`target_key` text NOT NULL,
	`content_version` text NOT NULL,
	`reviewed_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pathway_reviews_target_version` ON `pathway_reviews` (`workspace_id`,`target_key`,`content_version`);--> statement-breakpoint
CREATE TABLE `study_edges` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`from_id` text NOT NULL,
	`to_id` text NOT NULL,
	`origin` text NOT NULL,
	`status` text NOT NULL,
	`rationale` text NOT NULL,
	`catalog_version` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_id`) REFERENCES `study_nodes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_id`) REFERENCES `study_nodes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_edges_pair` ON `study_edges` (`workspace_id`,`from_id`,`to_id`);--> statement-breakpoint
CREATE TABLE `study_nodes` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`anchor` text NOT NULL,
	`title` text NOT NULL,
	`origin` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `study_nodes_anchor` ON `study_nodes` (`workspace_id`,`anchor`);