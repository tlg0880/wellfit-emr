CREATE TABLE `billing_item` (
	`id` text PRIMARY KEY NOT NULL,
	`encounter_id` text NOT NULL,
	`payer_id` text NOT NULL,
	`service_type` text NOT NULL,
	`service_code` text NOT NULL,
	`service_id` text,
	`description` text,
	`quantity` integer DEFAULT 1 NOT NULL,
	`unit_value` text NOT NULL,
	`total_value` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payer_id`) REFERENCES `payer`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `billing_item_encounter_idx` ON `billing_item` (`encounter_id`);--> statement-breakpoint
CREATE INDEX `billing_item_payer_idx` ON `billing_item` (`payer_id`);--> statement-breakpoint
CREATE INDEX `billing_item_service_idx` ON `billing_item` (`service_type`,`service_code`);--> statement-breakpoint
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
CREATE INDEX `patient_document_uploaded_by_idx` ON `patient_document` (`uploaded_by_user_id`);--> statement-breakpoint
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
CREATE UNIQUE INDEX `ree_export_encounter_service_unique_idx` ON `rips_export_encounter` (`rips_export_id`,`encounter_id`,`service_type`,`service_consecutive`);--> statement-breakpoint
DROP INDEX "account_userId_idx";--> statement-breakpoint
DROP INDEX "session_token_unique";--> statement-breakpoint
DROP INDEX "session_userId_idx";--> statement-breakpoint
DROP INDEX "user_email_unique";--> statement-breakpoint
DROP INDEX "verification_identifier_idx";--> statement-breakpoint
DROP INDEX "allergy_patient_status_idx";--> statement-breakpoint
DROP INDEX "appointment_patient_scheduled_idx";--> statement-breakpoint
DROP INDEX "appointment_practitioner_scheduled_idx";--> statement-breakpoint
DROP INDEX "appointment_site_scheduled_idx";--> statement-breakpoint
DROP INDEX "appointment_status_scheduled_idx";--> statement-breakpoint
DROP INDEX "appointment_encounter_idx";--> statement-breakpoint
DROP INDEX "attachment_link_entity_idx";--> statement-breakpoint
DROP INDEX "audit_event_patient_time_idx";--> statement-breakpoint
DROP INDEX "audit_event_user_time_idx";--> statement-breakpoint
DROP INDEX "audit_event_action_time_idx";--> statement-breakpoint
DROP INDEX "billing_item_encounter_idx";--> statement-breakpoint
DROP INDEX "billing_item_payer_idx";--> statement-breakpoint
DROP INDEX "billing_item_service_idx";--> statement-breakpoint
DROP INDEX "binary_object_hash_sha256_unique";--> statement-breakpoint
DROP INDEX "binary_object_retention_class_idx";--> statement-breakpoint
DROP INDEX "clinical_document_patient_type_created_idx";--> statement-breakpoint
DROP INDEX "clinical_document_version_unique_idx";--> statement-breakpoint
DROP INDEX "clinical_document_version_current_idx";--> statement-breakpoint
DROP INDEX "clinical_document_version_hash_idx";--> statement-breakpoint
DROP INDEX "clinical_role_code_unique";--> statement-breakpoint
DROP INDEX "consent_patient_type_signed_idx";--> statement-breakpoint
DROP INDEX "coverage_patient_active_idx";--> statement-breakpoint
DROP INDEX "coverage_plan_code_idx";--> statement-breakpoint
DROP INDEX "data_disclosure_patient_expiry_idx";--> statement-breakpoint
DROP INDEX "diagnosis_encounter_code_idx";--> statement-breakpoint
DROP INDEX "diagnostic_report_request_issued_idx";--> statement-breakpoint
DROP INDEX "document_section_version_code_idx";--> statement-breakpoint
DROP INDEX "encounter_patient_started_idx";--> statement-breakpoint
DROP INDEX "encounter_site_started_idx";--> statement-breakpoint
DROP INDEX "encounter_cause_external_idx";--> statement-breakpoint
DROP INDEX "encounter_finalidad_idx";--> statement-breakpoint
DROP INDEX "encounter_participant_role_idx";--> statement-breakpoint
DROP INDEX "ihce_bundle_encounter_status_idx";--> statement-breakpoint
DROP INDEX "incapacity_patient_issued_idx";--> statement-breakpoint
DROP INDEX "interconsultation_encounter_status_idx";--> statement-breakpoint
DROP INDEX "med_admin_order_time_idx";--> statement-breakpoint
DROP INDEX "medication_order_encounter_prescriber_idx";--> statement-breakpoint
DROP INDEX "observation_encounter_type_time_idx";--> statement-breakpoint
DROP INDEX "organization_reps_code_idx";--> statement-breakpoint
DROP INDEX "organization_tax_id_idx";--> statement-breakpoint
DROP INDEX "patient_primary_document_idx";--> statement-breakpoint
DROP INDEX "patient_birth_date_idx";--> statement-breakpoint
DROP INDEX "patient_municipality_idx";--> statement-breakpoint
DROP INDEX "patient_contact_primary_idx";--> statement-breakpoint
DROP INDEX "pcr_patient_idx";--> statement-breakpoint
DROP INDEX "pcr_status_idx";--> statement-breakpoint
DROP INDEX "pcr_deadline_idx";--> statement-breakpoint
DROP INDEX "patient_document_patient_idx";--> statement-breakpoint
DROP INDEX "patient_document_status_idx";--> statement-breakpoint
DROP INDEX "patient_document_uploaded_by_idx";--> statement-breakpoint
DROP INDEX "patient_identifier_system_value_idx";--> statement-breakpoint
DROP INDEX "payer_type_code_idx";--> statement-breakpoint
DROP INDEX "permission_code_unique";--> statement-breakpoint
DROP INDEX "practitioner_document_idx";--> statement-breakpoint
DROP INDEX "practitioner_rethus_number_idx";--> statement-breakpoint
DROP INDEX "practitioner_role_lookup_idx";--> statement-breakpoint
DROP INDEX "procedure_encounter_cups_idx";--> statement-breakpoint
DROP INDEX "retention_disposal_hold_idx";--> statement-breakpoint
DROP INDEX "rips_export_generated_status_idx";--> statement-breakpoint
DROP INDEX "rips_export_operation_type_idx";--> statement-breakpoint
DROP INDEX "rips_export_cuv_idx";--> statement-breakpoint
DROP INDEX "ree_export_idx";--> statement-breakpoint
DROP INDEX "ree_encounter_idx";--> statement-breakpoint
DROP INDEX "ree_patient_idx";--> statement-breakpoint
DROP INDEX "ree_export_encounter_service_unique_idx";--> statement-breakpoint
DROP INDEX "role_permission_unique_idx";--> statement-breakpoint
DROP INDEX "service_request_encounter_type_status_idx";--> statement-breakpoint
DROP INDEX "service_unit_site_code_idx";--> statement-breakpoint
DROP INDEX "site_organization_code_idx";--> statement-breakpoint
DROP INDEX "user_clinical_role_active_idx";--> statement-breakpoint
DROP INDEX "user_practitioner_link_user_practitioner_idx";--> statement-breakpoint
DROP INDEX "user_practitioner_link_user_active_idx";--> statement-breakpoint
DROP INDEX "user_practitioner_link_practitioner_active_idx";--> statement-breakpoint
DROP INDEX "rips_ref_entry_table_code_idx";--> statement-breakpoint
DROP INDEX "rips_ref_entry_table_name_idx";--> statement-breakpoint
DROP INDEX "rips_ref_entry_table_enabled_idx";--> statement-breakpoint
DROP INDEX "rips_ref_entry_table_name_code_unique_idx";--> statement-breakpoint
DROP INDEX "rips_reference_table_name_unique";--> statement-breakpoint
DROP INDEX "rips_ref_table_active_idx";--> statement-breakpoint
DROP INDEX "rips_ref_table_name_idx";--> statement-breakpoint
ALTER TABLE `patient_copy_request` ALTER COLUMN "created_at" TO "created_at" integer NOT NULL DEFAULT (cast(unixepoch('subsecond') * 1000 as integer));--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `allergy_patient_status_idx` ON `allergy_intolerance` (`patient_id`,`status`);--> statement-breakpoint
CREATE INDEX `appointment_patient_scheduled_idx` ON `appointment` (`patient_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `appointment_practitioner_scheduled_idx` ON `appointment` (`practitioner_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `appointment_site_scheduled_idx` ON `appointment` (`site_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `appointment_status_scheduled_idx` ON `appointment` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `appointment_encounter_idx` ON `appointment` (`encounter_id`);--> statement-breakpoint
CREATE INDEX `attachment_link_entity_idx` ON `attachment_link` (`linked_entity_type`,`linked_entity_id`);--> statement-breakpoint
CREATE INDEX `audit_event_patient_time_idx` ON `audit_event` (`patient_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_event_user_time_idx` ON `audit_event` (`user_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_event_action_time_idx` ON `audit_event` (`action_code`,`occurred_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `binary_object_hash_sha256_unique` ON `binary_object` (`hash_sha256`);--> statement-breakpoint
CREATE INDEX `binary_object_retention_class_idx` ON `binary_object` (`retention_class`);--> statement-breakpoint
CREATE INDEX `clinical_document_patient_type_created_idx` ON `clinical_document` (`patient_id`,`document_type`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `clinical_document_version_unique_idx` ON `clinical_document_version` (`document_id`,`version_no`);--> statement-breakpoint
CREATE INDEX `clinical_document_version_current_idx` ON `clinical_document_version` (`document_id`,`is_current`);--> statement-breakpoint
CREATE INDEX `clinical_document_version_hash_idx` ON `clinical_document_version` (`hash_sha256`);--> statement-breakpoint
CREATE UNIQUE INDEX `clinical_role_code_unique` ON `clinical_role` (`code`);--> statement-breakpoint
CREATE INDEX `consent_patient_type_signed_idx` ON `consent_record` (`patient_id`,`consent_type`,`signed_at`);--> statement-breakpoint
CREATE INDEX `coverage_patient_active_idx` ON `coverage` (`patient_id`,`effective_to`);--> statement-breakpoint
CREATE INDEX `coverage_plan_code_idx` ON `coverage` (`coverage_plan_code`);--> statement-breakpoint
CREATE INDEX `data_disclosure_patient_expiry_idx` ON `data_disclosure_authorization` (`patient_id`,`expires_at`);--> statement-breakpoint
CREATE INDEX `diagnosis_encounter_code_idx` ON `diagnosis` (`encounter_id`,`code_system`,`code`);--> statement-breakpoint
CREATE INDEX `diagnostic_report_request_issued_idx` ON `diagnostic_report` (`request_id`,`issued_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `document_section_version_code_idx` ON `document_section` (`document_version_id`,`section_code`);--> statement-breakpoint
CREATE INDEX `encounter_patient_started_idx` ON `encounter` (`patient_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `encounter_site_started_idx` ON `encounter` (`site_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `encounter_cause_external_idx` ON `encounter` (`cause_external_code`);--> statement-breakpoint
CREATE INDEX `encounter_finalidad_idx` ON `encounter` (`finalidad_consulta_code`);--> statement-breakpoint
CREATE INDEX `encounter_participant_role_idx` ON `encounter_participant` (`encounter_id`,`participant_role`);--> statement-breakpoint
CREATE INDEX `ihce_bundle_encounter_status_idx` ON `ihce_bundle` (`encounter_id`,`status`);--> statement-breakpoint
CREATE INDEX `incapacity_patient_issued_idx` ON `incapacity_certificate` (`patient_id`,`issued_at`);--> statement-breakpoint
CREATE INDEX `interconsultation_encounter_status_idx` ON `interconsultation` (`encounter_id`,`status`);--> statement-breakpoint
CREATE INDEX `med_admin_order_time_idx` ON `medication_administration` (`medication_order_id`,`administered_at`);--> statement-breakpoint
CREATE INDEX `medication_order_encounter_prescriber_idx` ON `medication_order` (`encounter_id`,`prescriber_id`,`signed_at`);--> statement-breakpoint
CREATE INDEX `observation_encounter_type_time_idx` ON `observation` (`encounter_id`,`observation_type`,`observed_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `organization_reps_code_idx` ON `organization` (`reps_code`);--> statement-breakpoint
CREATE INDEX `organization_tax_id_idx` ON `organization` (`tax_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `patient_primary_document_idx` ON `patient` (`primary_document_type`,`primary_document_number`);--> statement-breakpoint
CREATE INDEX `patient_birth_date_idx` ON `patient` (`birth_date`);--> statement-breakpoint
CREATE INDEX `patient_municipality_idx` ON `patient` (`municipality_code`);--> statement-breakpoint
CREATE INDEX `patient_contact_primary_idx` ON `patient_contact` (`patient_id`,`is_primary`);--> statement-breakpoint
CREATE INDEX `pcr_patient_idx` ON `patient_copy_request` (`patient_id`);--> statement-breakpoint
CREATE INDEX `pcr_status_idx` ON `patient_copy_request` (`status`);--> statement-breakpoint
CREATE INDEX `pcr_deadline_idx` ON `patient_copy_request` (`deadline`);--> statement-breakpoint
CREATE UNIQUE INDEX `patient_identifier_system_value_idx` ON `patient_identifier` (`identifier_system`,`identifier_value`);--> statement-breakpoint
CREATE UNIQUE INDEX `payer_type_code_idx` ON `payer` (`payer_type`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `permission_code_unique` ON `permission` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `practitioner_document_idx` ON `practitioner` (`document_type`,`document_number`);--> statement-breakpoint
CREATE INDEX `practitioner_rethus_number_idx` ON `practitioner` (`rethus_number`);--> statement-breakpoint
CREATE INDEX `practitioner_role_lookup_idx` ON `practitioner_role` (`practitioner_id`,`role_code`,`end_at`);--> statement-breakpoint
CREATE INDEX `procedure_encounter_cups_idx` ON `procedure_record` (`encounter_id`,`cups_code`);--> statement-breakpoint
CREATE INDEX `retention_disposal_hold_idx` ON `retention_record` (`disposal_eligibility_date`,`legal_hold_flag`);--> statement-breakpoint
CREATE INDEX `rips_export_generated_status_idx` ON `rips_export` (`generated_at`,`status`);--> statement-breakpoint
CREATE INDEX `rips_export_operation_type_idx` ON `rips_export` (`operation_type`);--> statement-breakpoint
CREATE INDEX `rips_export_cuv_idx` ON `rips_export` (`cuv`);--> statement-breakpoint
CREATE UNIQUE INDEX `role_permission_unique_idx` ON `role_permission` (`role_id`,`permission_id`);--> statement-breakpoint
CREATE INDEX `service_request_encounter_type_status_idx` ON `service_request` (`encounter_id`,`request_type`,`status`);--> statement-breakpoint
CREATE INDEX `service_unit_site_code_idx` ON `service_unit` (`site_id`,`service_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `site_organization_code_idx` ON `site` (`organization_id`,`site_code`);--> statement-breakpoint
CREATE INDEX `user_clinical_role_active_idx` ON `user_clinical_role` (`user_id`,`effective_to`);--> statement-breakpoint
CREATE UNIQUE INDEX `user_practitioner_link_user_practitioner_idx` ON `user_practitioner_link` (`user_id`,`practitioner_id`,`link_type`);--> statement-breakpoint
CREATE INDEX `user_practitioner_link_user_active_idx` ON `user_practitioner_link` (`user_id`,`effective_to`);--> statement-breakpoint
CREATE INDEX `user_practitioner_link_practitioner_active_idx` ON `user_practitioner_link` (`practitioner_id`,`effective_to`);--> statement-breakpoint
CREATE INDEX `rips_ref_entry_table_code_idx` ON `rips_reference_entry` (`table_id`,`code`);--> statement-breakpoint
CREATE INDEX `rips_ref_entry_table_name_idx` ON `rips_reference_entry` (`table_id`,`name`);--> statement-breakpoint
CREATE INDEX `rips_ref_entry_table_enabled_idx` ON `rips_reference_entry` (`table_id`,`enabled`);--> statement-breakpoint
CREATE UNIQUE INDEX `rips_ref_entry_table_name_code_unique_idx` ON `rips_reference_entry` (`table_name`,`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `rips_reference_table_name_unique` ON `rips_reference_table` (`name`);--> statement-breakpoint
CREATE INDEX `rips_ref_table_active_idx` ON `rips_reference_table` (`is_active`);--> statement-breakpoint
CREATE INDEX `rips_ref_table_name_idx` ON `rips_reference_table` (`name`);--> statement-breakpoint
ALTER TABLE `rips_export` ADD `operation_type` text DEFAULT 'FEV_RIPS' NOT NULL;--> statement-breakpoint
ALTER TABLE `rips_export` ADD `organization_tax_id` text;--> statement-breakpoint
ALTER TABLE `rips_export` ADD `invoice_number` text;--> statement-breakpoint
ALTER TABLE `rips_export` ADD `note_type` text;--> statement-breakpoint
ALTER TABLE `rips_export` ADD `note_number` text;--> statement-breakpoint
ALTER TABLE `rips_export` ADD `num_users` integer;--> statement-breakpoint
ALTER TABLE `rips_export` ADD `total_value` text;--> statement-breakpoint
ALTER TABLE `rips_export` ADD `cuv` text;--> statement-breakpoint
ALTER TABLE `rips_export` ADD `sent_at` integer;--> statement-breakpoint
ALTER TABLE `rips_export` ADD `muv_response_json` text;