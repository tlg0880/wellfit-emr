--> statement-breakpoint
ALTER TABLE `rips_export` ADD COLUMN `operation_type` text DEFAULT 'FEV_RIPS' NOT NULL;--> statement-breakpoint
ALTER TABLE `rips_export` ADD COLUMN `organization_tax_id` text;--> statement-breakpoint
ALTER TABLE `rips_export` ADD COLUMN `invoice_number` text;--> statement-breakpoint
ALTER TABLE `rips_export` ADD COLUMN `note_type` text;--> statement-breakpoint
ALTER TABLE `rips_export` ADD COLUMN `note_number` text;--> statement-breakpoint
ALTER TABLE `rips_export` ADD COLUMN `num_users` integer;--> statement-breakpoint
ALTER TABLE `rips_export` ADD COLUMN `total_value` text;--> statement-breakpoint
ALTER TABLE `rips_export` ADD COLUMN `cuv` text;--> statement-breakpoint
ALTER TABLE `rips_export` ADD COLUMN `sent_at` integer;--> statement-breakpoint
ALTER TABLE `rips_export` ADD COLUMN `muv_response_json` text;--> statement-breakpoint
CREATE INDEX `rips_export_operation_type_idx` ON `rips_export` (`operation_type`);--> statement-breakpoint
CREATE INDEX `rips_export_cuv_idx` ON `rips_export` (`cuv`);--> statement-breakpoint
CREATE TABLE `rips_export_encounter` (
	`id` text PRIMARY KEY NOT NULL,
	`rips_export_id` text NOT NULL,
	`encounter_id` text NOT NULL,
	`patient_id` text NOT NULL,
	`user_consecutive` integer NOT NULL,
	`service_type` text NOT NULL,
	`service_consecutive` integer NOT NULL,
	`included_at` integer NOT NULL,
	FOREIGN KEY (`rips_export_id`) REFERENCES `rips_export`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ree_export_idx` ON `rips_export_encounter` (`rips_export_id`);--> statement-breakpoint
CREATE INDEX `ree_encounter_idx` ON `rips_export_encounter` (`encounter_id`);--> statement-breakpoint
CREATE INDEX `ree_patient_idx` ON `rips_export_encounter` (`patient_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ree_export_encounter_unique_idx` ON `rips_export_encounter` (`rips_export_id`,`encounter_id`);