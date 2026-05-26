--> statement-breakpoint
CREATE TABLE `billing_item` (
	`id` text PRIMARY KEY NOT NULL,
	`encounter_id` text NOT NULL,
	`payer_id` text NOT NULL,
	`service_type` text NOT NULL,
	`service_code` text NOT NULL,
	`service_id` text,
	`description` text,
	`quantity` integer NOT NULL DEFAULT 1,
	`unit_value` text NOT NULL,
	`total_value` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payer_id`) REFERENCES `payer`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `billing_item_encounter_idx` ON `billing_item` (`encounter_id`);--> statement-breakpoint
CREATE INDEX `billing_item_payer_idx` ON `billing_item` (`payer_id`);--> statement-breakpoint
CREATE INDEX `billing_item_service_idx` ON `billing_item` (`service_type`,`service_code`);
