CREATE TABLE `patient_document` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`original_file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`storage_key` text NOT NULL,
	`uploaded_by_user_id` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`summary_text` text,
	`summary_json` text,
	`extracted_text` text,
	`error_message` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `patient_document_patient_idx` ON `patient_document` (`patient_id`);--> statement-breakpoint
CREATE INDEX `patient_document_status_idx` ON `patient_document` (`status`);--> statement-breakpoint
CREATE INDEX `patient_document_uploaded_by_idx` ON `patient_document` (`uploaded_by_user_id`);
