CREATE TABLE `appointment` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`practitioner_id` text,
	`site_id` text NOT NULL,
	`service_unit_id` text,
	`scheduled_at` integer NOT NULL,
	`duration_minutes` integer DEFAULT 30 NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`reason` text NOT NULL,
	`notes` text,
	`encounter_id` text,
	`created_by` text NOT NULL,
	`cancelled_at` integer,
	`cancelled_reason` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`practitioner_id`) REFERENCES `practitioner`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`site_id`) REFERENCES `site`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`service_unit_id`) REFERENCES `service_unit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `appointment_patient_scheduled_idx` ON `appointment` (`patient_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `appointment_practitioner_scheduled_idx` ON `appointment` (`practitioner_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `appointment_site_scheduled_idx` ON `appointment` (`site_id`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `appointment_status_scheduled_idx` ON `appointment` (`status`,`scheduled_at`);--> statement-breakpoint
CREATE INDEX `appointment_encounter_idx` ON `appointment` (`encounter_id`);--> statement-breakpoint
CREATE TABLE `patient_copy_request` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`patient_name` text NOT NULL,
	`scope` text NOT NULL,
	`delivery_channel` text NOT NULL,
	`requester` text NOT NULL,
	`legal_basis` text NOT NULL,
	`notes` text,
	`status` text DEFAULT 'Recibida' NOT NULL,
	`created_at` integer NOT NULL,
	`deadline` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `pcr_patient_idx` ON `patient_copy_request` (`patient_id`);--> statement-breakpoint
CREATE INDEX `pcr_status_idx` ON `patient_copy_request` (`status`);--> statement-breakpoint
CREATE INDEX `pcr_deadline_idx` ON `patient_copy_request` (`deadline`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_allergy_intolerance` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`substance_code` text NOT NULL,
	`code_system` text NOT NULL,
	`criticality` text,
	`reaction_text` text,
	`status` text NOT NULL,
	`recorded_at` integer NOT NULL,
	`recorded_by` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_allergy_intolerance`("id", "patient_id", "substance_code", "code_system", "criticality", "reaction_text", "status", "recorded_at", "recorded_by") SELECT "id", "patient_id", "substance_code", "code_system", "criticality", "reaction_text", "status", "recorded_at", "recorded_by" FROM `allergy_intolerance`;--> statement-breakpoint
DROP TABLE `allergy_intolerance`;--> statement-breakpoint
ALTER TABLE `__new_allergy_intolerance` RENAME TO `allergy_intolerance`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `allergy_patient_status_idx` ON `allergy_intolerance` (`patient_id`,`status`);--> statement-breakpoint
CREATE TABLE `__new_attachment_link` (
	`id` text PRIMARY KEY NOT NULL,
	`binary_id` text NOT NULL,
	`linked_entity_type` text NOT NULL,
	`linked_entity_id` text NOT NULL,
	`title` text NOT NULL,
	`classification` text NOT NULL,
	`captured_at` integer NOT NULL,
	FOREIGN KEY (`binary_id`) REFERENCES `binary_object`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_attachment_link`("id", "binary_id", "linked_entity_type", "linked_entity_id", "title", "classification", "captured_at") SELECT "id", "binary_id", "linked_entity_type", "linked_entity_id", "title", "classification", "captured_at" FROM `attachment_link`;--> statement-breakpoint
DROP TABLE `attachment_link`;--> statement-breakpoint
ALTER TABLE `__new_attachment_link` RENAME TO `attachment_link`;--> statement-breakpoint
CREATE INDEX `attachment_link_entity_idx` ON `attachment_link` (`linked_entity_type`,`linked_entity_id`);--> statement-breakpoint
CREATE TABLE `__new_audit_event` (
	`id` integer PRIMARY KEY NOT NULL,
	`patient_id` text,
	`encounter_id` text,
	`user_id` text NOT NULL,
	`action_code` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text,
	`occurred_at` integer NOT NULL,
	`channel` text NOT NULL,
	`ip_hash` text,
	`result_code` text NOT NULL,
	`reason_code` text,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_audit_event`("id", "patient_id", "encounter_id", "user_id", "action_code", "entity_type", "entity_id", "occurred_at", "channel", "ip_hash", "result_code", "reason_code") SELECT "id", "patient_id", "encounter_id", "user_id", "action_code", "entity_type", "entity_id", "occurred_at", "channel", "ip_hash", "result_code", "reason_code" FROM `audit_event`;--> statement-breakpoint
DROP TABLE `audit_event`;--> statement-breakpoint
ALTER TABLE `__new_audit_event` RENAME TO `audit_event`;--> statement-breakpoint
CREATE INDEX `audit_event_patient_time_idx` ON `audit_event` (`patient_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_event_user_time_idx` ON `audit_event` (`user_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `audit_event_action_time_idx` ON `audit_event` (`action_code`,`occurred_at`);--> statement-breakpoint
CREATE TABLE `__new_consent_record` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`encounter_id` text,
	`consent_type` text NOT NULL,
	`procedure_code` text,
	`decision` text NOT NULL,
	`granted_by_person_name` text NOT NULL,
	`representative_relationship` text,
	`signed_at` integer NOT NULL,
	`expires_at` integer,
	`document_version_id` text,
	`revoked_at` integer,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_version_id`) REFERENCES `clinical_document_version`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_consent_record`("id", "patient_id", "encounter_id", "consent_type", "procedure_code", "decision", "granted_by_person_name", "representative_relationship", "signed_at", "expires_at", "document_version_id", "revoked_at") SELECT "id", "patient_id", "encounter_id", "consent_type", "procedure_code", "decision", "granted_by_person_name", "representative_relationship", "signed_at", "expires_at", "document_version_id", "revoked_at" FROM `consent_record`;--> statement-breakpoint
DROP TABLE `consent_record`;--> statement-breakpoint
ALTER TABLE `__new_consent_record` RENAME TO `consent_record`;--> statement-breakpoint
CREATE INDEX `consent_patient_type_signed_idx` ON `consent_record` (`patient_id`,`consent_type`,`signed_at`);--> statement-breakpoint
CREATE TABLE `__new_coverage` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`payer_id` text NOT NULL,
	`affiliate_type` text NOT NULL,
	`coverage_plan_code` text,
	`policy_number` text,
	`effective_from` integer NOT NULL,
	`effective_to` integer,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payer_id`) REFERENCES `payer`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_coverage`("id", "patient_id", "payer_id", "affiliate_type", "coverage_plan_code", "policy_number", "effective_from", "effective_to") SELECT "id", "patient_id", "payer_id", "affiliate_type", "coverage_plan_code", "policy_number", "effective_from", "effective_to" FROM `coverage`;--> statement-breakpoint
DROP TABLE `coverage`;--> statement-breakpoint
ALTER TABLE `__new_coverage` RENAME TO `coverage`;--> statement-breakpoint
CREATE INDEX `coverage_patient_active_idx` ON `coverage` (`patient_id`,`effective_to`);--> statement-breakpoint
CREATE INDEX `coverage_plan_code_idx` ON `coverage` (`coverage_plan_code`);--> statement-breakpoint
CREATE TABLE `__new_data_disclosure_authorization` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`third_party_name` text NOT NULL,
	`purpose_code` text NOT NULL,
	`scope_json` text NOT NULL,
	`granted_at` integer NOT NULL,
	`expires_at` integer,
	`revoked_at` integer,
	`legal_basis` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_data_disclosure_authorization`("id", "patient_id", "third_party_name", "purpose_code", "scope_json", "granted_at", "expires_at", "revoked_at", "legal_basis") SELECT "id", "patient_id", "third_party_name", "purpose_code", "scope_json", "granted_at", "expires_at", "revoked_at", "legal_basis" FROM `data_disclosure_authorization`;--> statement-breakpoint
DROP TABLE `data_disclosure_authorization`;--> statement-breakpoint
ALTER TABLE `__new_data_disclosure_authorization` RENAME TO `data_disclosure_authorization`;--> statement-breakpoint
CREATE INDEX `data_disclosure_patient_expiry_idx` ON `data_disclosure_authorization` (`patient_id`,`expires_at`);--> statement-breakpoint
CREATE TABLE `__new_diagnosis` (
	`id` text PRIMARY KEY NOT NULL,
	`encounter_id` text NOT NULL,
	`document_version_id` text,
	`code_system` text NOT NULL,
	`code` text NOT NULL,
	`description` text NOT NULL,
	`diagnosis_type` text NOT NULL,
	`rips_reference_name` text,
	`rank` integer,
	`onset_at` integer,
	`certainty` text,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_version_id`) REFERENCES `clinical_document_version`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_diagnosis`("id", "encounter_id", "document_version_id", "code_system", "code", "description", "diagnosis_type", "rips_reference_name", "rank", "onset_at", "certainty") SELECT "id", "encounter_id", "document_version_id", "code_system", "code", "description", "diagnosis_type", "rips_reference_name", "rank", "onset_at", "certainty" FROM `diagnosis`;--> statement-breakpoint
DROP TABLE `diagnosis`;--> statement-breakpoint
ALTER TABLE `__new_diagnosis` RENAME TO `diagnosis`;--> statement-breakpoint
CREATE INDEX `diagnosis_encounter_code_idx` ON `diagnosis` (`encounter_id`,`code_system`,`code`);--> statement-breakpoint
CREATE TABLE `__new_diagnostic_report` (
	`id` text PRIMARY KEY NOT NULL,
	`request_id` text NOT NULL,
	`encounter_id` text NOT NULL,
	`report_type` text NOT NULL,
	`issued_at` integer NOT NULL,
	`conclusion_text` text,
	`performer_org_id` text,
	`status` text NOT NULL,
	FOREIGN KEY (`request_id`) REFERENCES `service_request`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`performer_org_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_diagnostic_report`("id", "request_id", "encounter_id", "report_type", "issued_at", "conclusion_text", "performer_org_id", "status") SELECT "id", "request_id", "encounter_id", "report_type", "issued_at", "conclusion_text", "performer_org_id", "status" FROM `diagnostic_report`;--> statement-breakpoint
DROP TABLE `diagnostic_report`;--> statement-breakpoint
ALTER TABLE `__new_diagnostic_report` RENAME TO `diagnostic_report`;--> statement-breakpoint
CREATE INDEX `diagnostic_report_request_issued_idx` ON `diagnostic_report` (`request_id`,`issued_at`);--> statement-breakpoint
CREATE TABLE `__new_ihce_bundle` (
	`id` text PRIMARY KEY NOT NULL,
	`encounter_id` text NOT NULL,
	`bundle_type` text NOT NULL,
	`bundle_json` text NOT NULL,
	`generated_at` integer NOT NULL,
	`sent_at` integer,
	`response_code` text,
	`vida_code` text,
	`status` text NOT NULL,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_ihce_bundle`("id", "encounter_id", "bundle_type", "bundle_json", "generated_at", "sent_at", "response_code", "vida_code", "status") SELECT "id", "encounter_id", "bundle_type", "bundle_json", "generated_at", "sent_at", "response_code", "vida_code", "status" FROM `ihce_bundle`;--> statement-breakpoint
DROP TABLE `ihce_bundle`;--> statement-breakpoint
ALTER TABLE `__new_ihce_bundle` RENAME TO `ihce_bundle`;--> statement-breakpoint
CREATE INDEX `ihce_bundle_encounter_status_idx` ON `ihce_bundle` (`encounter_id`,`status`);--> statement-breakpoint
CREATE TABLE `__new_incapacity_certificate` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`encounter_id` text NOT NULL,
	`issued_by` text NOT NULL,
	`issued_at` integer NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`concept_text` text NOT NULL,
	`destination_entity` text,
	`signed_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`issued_by`) REFERENCES `practitioner`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_incapacity_certificate`("id", "patient_id", "encounter_id", "issued_by", "issued_at", "start_date", "end_date", "concept_text", "destination_entity", "signed_at") SELECT "id", "patient_id", "encounter_id", "issued_by", "issued_at", "start_date", "end_date", "concept_text", "destination_entity", "signed_at" FROM `incapacity_certificate`;--> statement-breakpoint
DROP TABLE `incapacity_certificate`;--> statement-breakpoint
ALTER TABLE `__new_incapacity_certificate` RENAME TO `incapacity_certificate`;--> statement-breakpoint
CREATE INDEX `incapacity_patient_issued_idx` ON `incapacity_certificate` (`patient_id`,`issued_at`);--> statement-breakpoint
CREATE TABLE `__new_interconsultation` (
	`id` text PRIMARY KEY NOT NULL,
	`encounter_id` text NOT NULL,
	`requested_specialty` text NOT NULL,
	`requested_by` text NOT NULL,
	`requested_at` integer NOT NULL,
	`reason_text` text NOT NULL,
	`response_document_id` text,
	`status` text NOT NULL,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requested_by`) REFERENCES `practitioner`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`response_document_id`) REFERENCES `clinical_document`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_interconsultation`("id", "encounter_id", "requested_specialty", "requested_by", "requested_at", "reason_text", "response_document_id", "status") SELECT "id", "encounter_id", "requested_specialty", "requested_by", "requested_at", "reason_text", "response_document_id", "status" FROM `interconsultation`;--> statement-breakpoint
DROP TABLE `interconsultation`;--> statement-breakpoint
ALTER TABLE `__new_interconsultation` RENAME TO `interconsultation`;--> statement-breakpoint
CREATE INDEX `interconsultation_encounter_status_idx` ON `interconsultation` (`encounter_id`,`status`);--> statement-breakpoint
CREATE TABLE `__new_medication_administration` (
	`id` text PRIMARY KEY NOT NULL,
	`medication_order_id` text NOT NULL,
	`administered_at` integer NOT NULL,
	`administered_by` text NOT NULL,
	`dose_administered` text,
	`status` text NOT NULL,
	`reason_not_administered` text,
	FOREIGN KEY (`medication_order_id`) REFERENCES `medication_order`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`administered_by`) REFERENCES `practitioner`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_medication_administration`("id", "medication_order_id", "administered_at", "administered_by", "dose_administered", "status", "reason_not_administered") SELECT "id", "medication_order_id", "administered_at", "administered_by", "dose_administered", "status", "reason_not_administered" FROM `medication_administration`;--> statement-breakpoint
DROP TABLE `medication_administration`;--> statement-breakpoint
ALTER TABLE `__new_medication_administration` RENAME TO `medication_administration`;--> statement-breakpoint
CREATE INDEX `med_admin_order_time_idx` ON `medication_administration` (`medication_order_id`,`administered_at`);--> statement-breakpoint
CREATE TABLE `__new_medication_order` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`encounter_id` text NOT NULL,
	`diagnosis_id` text,
	`prescriber_id` text NOT NULL,
	`generic_name` text NOT NULL,
	`atc_code` text,
	`concentration` text NOT NULL,
	`dosage_form` text NOT NULL,
	`dose` text NOT NULL,
	`dose_unit` text,
	`route_code` text NOT NULL,
	`frequency_text` text NOT NULL,
	`duration_text` text NOT NULL,
	`quantity_total` text NOT NULL,
	`valid_until` integer,
	`indications` text,
	`status` text NOT NULL,
	`signed_at` integer NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`diagnosis_id`) REFERENCES `diagnosis`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prescriber_id`) REFERENCES `practitioner`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_medication_order`("id", "patient_id", "encounter_id", "diagnosis_id", "prescriber_id", "generic_name", "atc_code", "concentration", "dosage_form", "dose", "dose_unit", "route_code", "frequency_text", "duration_text", "quantity_total", "valid_until", "indications", "status", "signed_at") SELECT "id", "patient_id", "encounter_id", "diagnosis_id", "prescriber_id", "generic_name", "atc_code", "concentration", "dosage_form", "dose", "dose_unit", "route_code", "frequency_text", "duration_text", "quantity_total", "valid_until", "indications", "status", "signed_at" FROM `medication_order`;--> statement-breakpoint
DROP TABLE `medication_order`;--> statement-breakpoint
ALTER TABLE `__new_medication_order` RENAME TO `medication_order`;--> statement-breakpoint
CREATE INDEX `medication_order_encounter_prescriber_idx` ON `medication_order` (`encounter_id`,`prescriber_id`,`signed_at`);--> statement-breakpoint
CREATE TABLE `__new_observation` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`encounter_id` text NOT NULL,
	`document_version_id` text,
	`observation_type` text NOT NULL,
	`code_system` text,
	`code` text,
	`value_text` text,
	`value_num` integer,
	`value_unit` text,
	`observed_at` integer NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`document_version_id`) REFERENCES `clinical_document_version`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_observation`("id", "patient_id", "encounter_id", "document_version_id", "observation_type", "code_system", "code", "value_text", "value_num", "value_unit", "observed_at", "status") SELECT "id", "patient_id", "encounter_id", "document_version_id", "observation_type", "code_system", "code", "value_text", "value_num", "value_unit", "observed_at", "status" FROM `observation`;--> statement-breakpoint
DROP TABLE `observation`;--> statement-breakpoint
ALTER TABLE `__new_observation` RENAME TO `observation`;--> statement-breakpoint
CREATE INDEX `observation_encounter_type_time_idx` ON `observation` (`encounter_id`,`observation_type`,`observed_at`);--> statement-breakpoint
CREATE TABLE `__new_patient_contact` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`contact_type` text NOT NULL,
	`full_name` text,
	`relationship_code` text,
	`phone` text,
	`email` text,
	`address` text,
	`is_primary` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_patient_contact`("id", "patient_id", "contact_type", "full_name", "relationship_code", "phone", "email", "address", "is_primary") SELECT "id", "patient_id", "contact_type", "full_name", "relationship_code", "phone", "email", "address", "is_primary" FROM `patient_contact`;--> statement-breakpoint
DROP TABLE `patient_contact`;--> statement-breakpoint
ALTER TABLE `__new_patient_contact` RENAME TO `patient_contact`;--> statement-breakpoint
CREATE INDEX `patient_contact_primary_idx` ON `patient_contact` (`patient_id`,`is_primary`);--> statement-breakpoint
CREATE TABLE `__new_patient_identifier` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`identifier_system` text NOT NULL,
	`identifier_type` text NOT NULL,
	`identifier_value` text NOT NULL,
	`is_current` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_patient_identifier`("id", "patient_id", "identifier_system", "identifier_type", "identifier_value", "is_current", "created_at") SELECT "id", "patient_id", "identifier_system", "identifier_type", "identifier_value", "is_current", "created_at" FROM `patient_identifier`;--> statement-breakpoint
DROP TABLE `patient_identifier`;--> statement-breakpoint
ALTER TABLE `__new_patient_identifier` RENAME TO `patient_identifier`;--> statement-breakpoint
CREATE UNIQUE INDEX `patient_identifier_system_value_idx` ON `patient_identifier` (`identifier_system`,`identifier_value`);--> statement-breakpoint
CREATE TABLE `__new_procedure_record` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`encounter_id` text NOT NULL,
	`cups_code` text NOT NULL,
	`description` text NOT NULL,
	`rips_reference_name` text,
	`performed_at` integer,
	`performer_id` text,
	`status` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`performer_id`) REFERENCES `practitioner`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_procedure_record`("id", "patient_id", "encounter_id", "cups_code", "description", "rips_reference_name", "performed_at", "performer_id", "status") SELECT "id", "patient_id", "encounter_id", "cups_code", "description", "rips_reference_name", "performed_at", "performer_id", "status" FROM `procedure_record`;--> statement-breakpoint
DROP TABLE `procedure_record`;--> statement-breakpoint
ALTER TABLE `__new_procedure_record` RENAME TO `procedure_record`;--> statement-breakpoint
CREATE INDEX `procedure_encounter_cups_idx` ON `procedure_record` (`encounter_id`,`cups_code`);--> statement-breakpoint
CREATE TABLE `__new_service_request` (
	`id` text PRIMARY KEY NOT NULL,
	`patient_id` text NOT NULL,
	`encounter_id` text NOT NULL,
	`request_type` text NOT NULL,
	`request_code` text NOT NULL,
	`priority` text NOT NULL,
	`requested_by` text NOT NULL,
	`requested_at` integer NOT NULL,
	`status` text NOT NULL,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`encounter_id`) REFERENCES `encounter`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`requested_by`) REFERENCES `practitioner`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_service_request`("id", "patient_id", "encounter_id", "request_type", "request_code", "priority", "requested_by", "requested_at", "status") SELECT "id", "patient_id", "encounter_id", "request_type", "request_code", "priority", "requested_by", "requested_at", "status" FROM `service_request`;--> statement-breakpoint
DROP TABLE `service_request`;--> statement-breakpoint
ALTER TABLE `__new_service_request` RENAME TO `service_request`;--> statement-breakpoint
CREATE INDEX `service_request_encounter_type_status_idx` ON `service_request` (`encounter_id`,`request_type`,`status`);