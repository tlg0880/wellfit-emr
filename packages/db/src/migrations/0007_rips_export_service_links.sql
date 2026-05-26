--> statement-breakpoint
DROP INDEX IF EXISTS `ree_export_encounter_unique_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `ree_export_encounter_service_unique_idx` ON `rips_export_encounter` (`rips_export_id`,`encounter_id`,`service_type`,`service_consecutive`);
