CREATE TABLE `CatalogSource` (
	`catalog_source_id` integer PRIMARY KEY AUTOINCREMENT,
	`manufacturer_id` integer,
	`product_series_id` integer,
	`product_id` integer,
	`url` text NOT NULL,
	`title` text,
	`retrieved_at` integer NOT NULL,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_CatalogSource_manufacturer_id_Manufacturer_manufacturer_id_fk` FOREIGN KEY (`manufacturer_id`) REFERENCES `Manufacturer`(`manufacturer_id`),
	CONSTRAINT `fk_CatalogSource_product_series_id_ProductSeries_product_series_id_fk` FOREIGN KEY (`product_series_id`) REFERENCES `ProductSeries`(`product_series_id`),
	CONSTRAINT `fk_CatalogSource_product_id_Product_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `Product`(`product_id`)
);
--> statement-breakpoint
CREATE TABLE `Channel` (
	`channel_id` integer PRIMARY KEY AUTOINCREMENT,
	`product_id` integer NOT NULL,
	`position` integer NOT NULL,
	`key` text NOT NULL,
	`role` text NOT NULL,
	`quantity_kind` text,
	`description` text,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_Channel_product_id_Product_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `Product`(`product_id`)
);
--> statement-breakpoint
CREATE TABLE `InventoryEntry` (
	`inventory_entry_id` integer PRIMARY KEY AUTOINCREMENT,
	`slug` text NOT NULL,
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
CREATE TABLE `Manufacturer` (
	`manufacturer_id` integer PRIMARY KEY AUTOINCREMENT,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`website` text,
	`description` text,
	`logo_path` text,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer
);
--> statement-breakpoint
CREATE TABLE `Product` (
	`product_id` integer PRIMARY KEY AUTOINCREMENT,
	`manufacturer_id` integer NOT NULL,
	`product_series_id` integer,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`product_number` text NOT NULL,
	`subtitle` text NOT NULL,
	`description` text,
	`image_path` text,
	`series_position` integer,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_Product_manufacturer_id_Manufacturer_manufacturer_id_fk` FOREIGN KEY (`manufacturer_id`) REFERENCES `Manufacturer`(`manufacturer_id`),
	CONSTRAINT `fk_Product_product_series_id_ProductSeries_product_series_id_fk` FOREIGN KEY (`product_series_id`) REFERENCES `ProductSeries`(`product_series_id`)
);
--> statement-breakpoint
CREATE TABLE `ProductSeries` (
	`product_series_id` integer PRIMARY KEY AUTOINCREMENT,
	`manufacturer_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`subtitle` text,
	`description` text,
	`website` text,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_ProductSeries_manufacturer_id_Manufacturer_manufacturer_id_fk` FOREIGN KEY (`manufacturer_id`) REFERENCES `Manufacturer`(`manufacturer_id`)
);
--> statement-breakpoint
CREATE TABLE `ProductSpecification` (
	`product_specification_id` integer PRIMARY KEY AUTOINCREMENT,
	`product_id` integer NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`value` text NOT NULL,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_ProductSpecification_product_id_Product_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `Product`(`product_id`)
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
CREATE UNIQUE INDEX `Channel_key_role_unique` ON `Channel` (`product_id`,`key`,`role`);--> statement-breakpoint
CREATE UNIQUE INDEX `InventoryEntry_slug_unique` ON `InventoryEntry` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `Manufacturer_slug_unique` ON `Manufacturer` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `Product_slug_unique` ON `Product` (`manufacturer_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `ProductSeries_slug_unique` ON `ProductSeries` (`manufacturer_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `Sample_batch_name_unique` ON `Sample` (`sample_batch_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `Sample_batch_slug_unique` ON `Sample` (`sample_batch_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `SampleBatch_slug_unique` ON `SampleBatch` (`slug`);