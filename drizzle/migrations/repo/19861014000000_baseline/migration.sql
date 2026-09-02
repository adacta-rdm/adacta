CREATE TABLE `InventoryEntry` (
	`inventory_entry_id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`location_building_identifier` text,
	`location_room_identifier` text,
	`location_label` text,
	`metadata_creator_id` text,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_deleted_at` integer
);
--> statement-breakpoint
CREATE TABLE `SourceArtifact` (
	`source_artifact_id` text PRIMARY KEY,
	`source_bundle_id` text NOT NULL,
	`original_name` text NOT NULL,
	`media_type` text,
	`byte_size` integer NOT NULL,
	`metadata_creator_id` text,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_deleted_at` integer,
	CONSTRAINT `fk_SourceArtifact_source_bundle_id_SourceBundle_source_bundle_id_fk` FOREIGN KEY (`source_bundle_id`) REFERENCES `SourceBundle`(`source_bundle_id`)
);
--> statement-breakpoint
CREATE TABLE `SourceBundle` (
	`source_bundle_id` text PRIMARY KEY,
	`metadata_creator_id` text,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_deleted_at` integer
);
