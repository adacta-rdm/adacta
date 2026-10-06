CREATE TABLE `Account` (
	`id` text PRIMARY KEY,
	`issuer` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_Account_user_id_User_id_fk` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `Session` (
	`id` text PRIMARY KEY,
	`expires_at` integer NOT NULL,
	`token` text NOT NULL UNIQUE,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` text NOT NULL,
	CONSTRAINT `fk_Session_user_id_User_id_fk` FOREIGN KEY (`user_id`) REFERENCES `User`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `User` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text NOT NULL UNIQUE,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `Verification` (
	`id` text PRIMARY KEY,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
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
	CONSTRAINT `fk_CatalogSource_product_id_Product_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `Product`(`product_id`),
	CONSTRAINT `fk_CatalogSource_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `Channel` (
	`channel_id` integer PRIMARY KEY AUTOINCREMENT,
	`product_id` integer NOT NULL,
	`position` integer NOT NULL,
	`key` text NOT NULL,
	`role` text NOT NULL,
	`quantity_kind_id` text,
	`description` text,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_Channel_product_id_Product_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `Product`(`product_id`),
	CONSTRAINT `fk_Channel_quantity_kind_id_QuantityKind_quantity_kind_id_fk` FOREIGN KEY (`quantity_kind_id`) REFERENCES `QuantityKind`(`quantity_kind_id`) ON UPDATE CASCADE,
	CONSTRAINT `fk_Channel_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `Id` (
	`id` integer PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE `InventoryEntry` (
	`inventory_entry_id` integer PRIMARY KEY,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`location_building_identifier` text,
	`location_room_identifier` text,
	`location_label` text,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_InventoryEntry_inventory_entry_id_Id_id_fk` FOREIGN KEY (`inventory_entry_id`) REFERENCES `Id`(`id`),
	CONSTRAINT `fk_InventoryEntry_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT
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
	`metadata_archived_at` integer,
	CONSTRAINT `fk_Manufacturer_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `Note` (
	`note_id` integer PRIMARY KEY,
	`note_subject_id` integer NOT NULL,
	`body` text NOT NULL,
	`observed_at` integer,
	`supersedes_id` integer,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_Note_note_subject_id_Id_id_fk` FOREIGN KEY (`note_subject_id`) REFERENCES `Id`(`id`),
	CONSTRAINT `fk_Note_supersedes_id_Note_note_id_fk` FOREIGN KEY (`supersedes_id`) REFERENCES `Note`(`note_id`),
	CONSTRAINT `fk_Note_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `NoteAttachment` (
	`note_id` integer NOT NULL,
	`original_file_id` integer NOT NULL,
	`position` integer NOT NULL,
	CONSTRAINT `NoteAttachment_pk` PRIMARY KEY(`note_id`, `original_file_id`),
	CONSTRAINT `fk_NoteAttachment_note_id_Note_note_id_fk` FOREIGN KEY (`note_id`) REFERENCES `Note`(`note_id`),
	CONSTRAINT `fk_NoteAttachment_original_file_id_OriginalFile_original_file_id_fk` FOREIGN KEY (`original_file_id`) REFERENCES `OriginalFile`(`original_file_id`)
);
--> statement-breakpoint
CREATE TABLE `OriginalFile` (
	`original_file_id` integer PRIMARY KEY,
	`upload_id` integer NOT NULL,
	`original_name` text NOT NULL,
	`media_type` text,
	`byte_size` integer NOT NULL,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_OriginalFile_original_file_id_Id_id_fk` FOREIGN KEY (`original_file_id`) REFERENCES `Id`(`id`),
	CONSTRAINT `fk_OriginalFile_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `PIDEdge` (
	`pid_edge_id` text PRIMARY KEY,
	`inventory_entry_id` integer NOT NULL,
	`source_node_id` text NOT NULL,
	`target_node_id` text NOT NULL,
	`kind` text NOT NULL,
	`weight` integer NOT NULL,
	`end_arrow` integer NOT NULL,
	`arrow_positions` text NOT NULL,
	`material` text,
	`inner_diameter_value` real,
	`inner_diameter_unit` text,
	`outer_diameter_value` real,
	`outer_diameter_unit` text,
	`length_value` real,
	`length_unit` text,
	`source_handle` text,
	`target_handle` text,
	`drawing_order` integer NOT NULL,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_PIDEdge_inventory_entry_id_InventoryEntry_inventory_entry_id_fk` FOREIGN KEY (`inventory_entry_id`) REFERENCES `InventoryEntry`(`inventory_entry_id`) ON DELETE CASCADE,
	CONSTRAINT `fk_PIDEdge_source_node_id_PIDNode_pid_node_id_fk` FOREIGN KEY (`source_node_id`) REFERENCES `PIDNode`(`pid_node_id`) ON DELETE CASCADE,
	CONSTRAINT `fk_PIDEdge_target_node_id_PIDNode_pid_node_id_fk` FOREIGN KEY (`target_node_id`) REFERENCES `PIDNode`(`pid_node_id`) ON DELETE CASCADE,
	CONSTRAINT `fk_PIDEdge_kind_PIDEdgeKind_pid_edge_kind_id_fk` FOREIGN KEY (`kind`) REFERENCES `PIDEdgeKind`(`pid_edge_kind_id`) ON UPDATE CASCADE,
	CONSTRAINT `fk_PIDEdge_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
	CONSTRAINT "PIDEdge_weight_check" CHECK("weight" between 1 and 3),
	CONSTRAINT "PIDEdge_inner_diameter_check" CHECK(("inner_diameter_value" is null) = ("inner_diameter_unit" is null)),
	CONSTRAINT "PIDEdge_outer_diameter_check" CHECK(("outer_diameter_value" is null) = ("outer_diameter_unit" is null)),
	CONSTRAINT "PIDEdge_length_check" CHECK(("length_value" is null) = ("length_unit" is null))
);
--> statement-breakpoint
CREATE TABLE `PIDEdgeKind` (
	`pid_edge_kind_id` text PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE `PIDNode` (
	`pid_node_id` text PRIMARY KEY,
	`inventory_entry_id` integer NOT NULL,
	`kind` text NOT NULL,
	`label` text NOT NULL,
	`secondary_label` text,
	`parent_node_id` text,
	`drawing_order` integer NOT NULL,
	`inlet_count` integer DEFAULT 1 NOT NULL,
	`orientation` integer NOT NULL,
	`position_x` real NOT NULL,
	`position_y` real NOT NULL,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_PIDNode_inventory_entry_id_InventoryEntry_inventory_entry_id_fk` FOREIGN KEY (`inventory_entry_id`) REFERENCES `InventoryEntry`(`inventory_entry_id`) ON DELETE CASCADE,
	CONSTRAINT `fk_PIDNode_parent_node_id_PIDNode_pid_node_id_fk` FOREIGN KEY (`parent_node_id`) REFERENCES `PIDNode`(`pid_node_id`) ON DELETE CASCADE,
	CONSTRAINT `fk_PIDNode_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
	CONSTRAINT "PIDNode_inlet_count_check" CHECK("inlet_count" between 1 and 2),
	CONSTRAINT "PIDNode_orientation_check" CHECK("orientation" between 0 and 3)
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
	CONSTRAINT `fk_Product_product_series_id_ProductSeries_product_series_id_fk` FOREIGN KEY (`product_series_id`) REFERENCES `ProductSeries`(`product_series_id`),
	CONSTRAINT `fk_Product_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT
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
	CONSTRAINT `fk_ProductSeries_manufacturer_id_Manufacturer_manufacturer_id_fk` FOREIGN KEY (`manufacturer_id`) REFERENCES `Manufacturer`(`manufacturer_id`),
	CONSTRAINT `fk_ProductSeries_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT
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
	CONSTRAINT `fk_ProductSpecification_product_id_Product_product_id_fk` FOREIGN KEY (`product_id`) REFERENCES `Product`(`product_id`),
	CONSTRAINT `fk_ProductSpecification_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `QuantityKind` (
	`quantity_kind_id` text PRIMARY KEY
);
--> statement-breakpoint
CREATE TABLE `Sample` (
	`sample_id` integer PRIMARY KEY,
	`sample_batch_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`prepared_by` text NOT NULL,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_Sample_sample_id_Id_id_fk` FOREIGN KEY (`sample_id`) REFERENCES `Id`(`id`),
	CONSTRAINT `fk_Sample_sample_batch_id_SampleBatch_sample_batch_id_fk` FOREIGN KEY (`sample_batch_id`) REFERENCES `SampleBatch`(`sample_batch_id`),
	CONSTRAINT `fk_Sample_prepared_by_User_id_fk` FOREIGN KEY (`prepared_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_Sample_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `SampleBatch` (
	`sample_batch_id` integer PRIMARY KEY,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`preparation_date` text NOT NULL,
	`prepared_by` text NOT NULL,
	`active_material` text,
	`support` text,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_SampleBatch_sample_batch_id_Id_id_fk` FOREIGN KEY (`sample_batch_id`) REFERENCES `Id`(`id`),
	CONSTRAINT `fk_SampleBatch_prepared_by_User_id_fk` FOREIGN KEY (`prepared_by`) REFERENCES `User`(`id`) ON DELETE RESTRICT,
	CONSTRAINT `fk_SampleBatch_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_issuer_accountId_uidx` ON `Account` (`issuer`,`account_id`);--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `Account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `Session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `Verification` (`identifier`);--> statement-breakpoint
CREATE UNIQUE INDEX `Channel_key_role_unique` ON `Channel` (`product_id`,`key`,`role`);--> statement-breakpoint
CREATE UNIQUE INDEX `InventoryEntry_slug_unique` ON `InventoryEntry` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `Manufacturer_slug_unique` ON `Manufacturer` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `Note_supersedes_id_unique` ON `Note` (`supersedes_id`);--> statement-breakpoint
CREATE INDEX `PIDEdge_inventory_entry_idx` ON `PIDEdge` (`inventory_entry_id`);--> statement-breakpoint
CREATE INDEX `PIDNode_inventory_entry_idx` ON `PIDNode` (`inventory_entry_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `Product_slug_unique` ON `Product` (`manufacturer_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `ProductSeries_slug_unique` ON `ProductSeries` (`manufacturer_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `Sample_batch_name_unique` ON `Sample` (`sample_batch_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `Sample_batch_slug_unique` ON `Sample` (`sample_batch_id`,`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `SampleBatch_slug_unique` ON `SampleBatch` (`slug`);
--> statement-breakpoint
INSERT INTO `QuantityKind` (`quantity_kind_id`) VALUES
('Mass'),
('Power'),
('Pressure'),
('Temperature'),
('TemperatureDifference'),
('VolumeFlowRate');
--> statement-breakpoint
INSERT INTO `PIDEdgeKind` (`pid_edge_kind_id`) VALUES
('pipe'),
('jacketed'),
('traced'),
('electrical'),
('caption');
