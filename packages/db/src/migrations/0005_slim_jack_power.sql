ALTER TABLE `encounter` ADD `encounter_type` text DEFAULT 'clinical' NOT NULL;--> statement-breakpoint
CREATE INDEX `encounter_type_idx` ON `encounter` (`encounter_type`);