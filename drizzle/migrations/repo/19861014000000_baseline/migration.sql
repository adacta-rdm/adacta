CREATE TABLE `InventoryEntry` (
	`inventory_entry_id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`location_building_identifier` text,
	`location_room_identifier` text,
	`location_label` text,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer
);
--> statement-breakpoint
CREATE TABLE `Sample` (
	`sample_id` integer PRIMARY KEY AUTOINCREMENT,
	`sample_batch_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`prepared_by` text NOT NULL,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_Sample_sample_batch_id_SampleBatch_sample_batch_id_fk` FOREIGN KEY (`sample_batch_id`) REFERENCES `SampleBatch`(`sample_batch_id`)
);
--> statement-breakpoint
CREATE TABLE `SampleBatch` (
	`sample_batch_id` integer PRIMARY KEY AUTOINCREMENT,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`preparation_date` text NOT NULL,
	`prepared_by` text NOT NULL,
	`active_material` text,
	`support` text,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer
);
--> statement-breakpoint
CREATE TABLE `SourceArtifact` (
	`source_artifact_id` text PRIMARY KEY,
	`source_bundle_id` text NOT NULL,
	`original_name` text NOT NULL,
	`media_type` text,
	`byte_size` integer NOT NULL,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_SourceArtifact_source_bundle_id_SourceBundle_source_bundle_id_fk` FOREIGN KEY (`source_bundle_id`) REFERENCES `SourceBundle`(`source_bundle_id`)
);
--> statement-breakpoint
CREATE TABLE `SourceBundle` (
	`source_bundle_id` text PRIMARY KEY,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `Sample_batch_name_unique` ON `Sample` (`sample_batch_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `Sample_batch_slug_unique` ON `Sample` (`sample_batch_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `SampleBatch_slug_unique` ON `SampleBatch` (`slug`);