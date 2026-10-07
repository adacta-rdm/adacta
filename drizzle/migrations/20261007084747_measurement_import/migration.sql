CREATE TABLE `MeasurementColumn` (
	`measurement_column_id` integer PRIMARY KEY AUTOINCREMENT,
	`measurement_dataset_id` integer NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`field_name` text NOT NULL,
	`parquet_type` text NOT NULL,
	`axis` text,
	`symbol_key` text,
	`inventory_entry_id` integer,
	`inventory_name` text,
	`channel_id` integer,
	`channel_key` text,
	`channel_role` text,
	`quantity_kind_id` text,
	`gas_name` text,
	`unit` text,
	`pid_node_id` text,
	`source_column` text NOT NULL,
	CONSTRAINT `fk_MeasurementColumn_measurement_dataset_id_MeasurementDataset_measurement_dataset_id_fk` FOREIGN KEY (`measurement_dataset_id`) REFERENCES `MeasurementDataset`(`measurement_dataset_id`),
	CONSTRAINT `fk_MeasurementColumn_inventory_entry_id_InventoryEntry_inventory_entry_id_fk` FOREIGN KEY (`inventory_entry_id`) REFERENCES `InventoryEntry`(`inventory_entry_id`),
	CONSTRAINT `fk_MeasurementColumn_channel_id_Channel_channel_id_fk` FOREIGN KEY (`channel_id`) REFERENCES `Channel`(`channel_id`)
);
--> statement-breakpoint
CREATE TABLE `MeasurementDataset` (
	`measurement_dataset_id` integer PRIMARY KEY,
	`rig_id` integer NOT NULL,
	`upload_id` integer NOT NULL,
	`csv_file_id` integer NOT NULL,
	`sidecar_file_id` integer NOT NULL,
	`operator_id` text NOT NULL,
	`operator_email` text NOT NULL,
	`row_count` integer NOT NULL,
	`start_time` integer,
	`end_time` integer,
	`sidecar_snapshot` text NOT NULL,
	`analysis_snapshot` text,
	`data_path` text NOT NULL,
	`metadata_creator_id` text NOT NULL,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_archived_at` integer,
	CONSTRAINT `fk_MeasurementDataset_measurement_dataset_id_Id_id_fk` FOREIGN KEY (`measurement_dataset_id`) REFERENCES `Id`(`id`),
	CONSTRAINT `fk_MeasurementDataset_rig_id_InventoryEntry_inventory_entry_id_fk` FOREIGN KEY (`rig_id`) REFERENCES `InventoryEntry`(`inventory_entry_id`),
	CONSTRAINT `fk_MeasurementDataset_csv_file_id_OriginalFile_original_file_id_fk` FOREIGN KEY (`csv_file_id`) REFERENCES `OriginalFile`(`original_file_id`),
	CONSTRAINT `fk_MeasurementDataset_sidecar_file_id_OriginalFile_original_file_id_fk` FOREIGN KEY (`sidecar_file_id`) REFERENCES `OriginalFile`(`original_file_id`),
	CONSTRAINT `fk_MeasurementDataset_operator_id_User_id_fk` FOREIGN KEY (`operator_id`) REFERENCES `User`(`id`),
	CONSTRAINT `fk_MeasurementDataset_metadata_creator_id_User_id_fk` FOREIGN KEY (`metadata_creator_id`) REFERENCES `User`(`id`) ON DELETE RESTRICT
);
--> statement-breakpoint
CREATE TABLE `MeasurementSample` (
	`measurement_dataset_id` integer NOT NULL,
	`position` integer NOT NULL,
	`sample_id` integer NOT NULL,
	`sample_name` text NOT NULL,
	`sample_batch_name` text,
	`symbol_key` text NOT NULL,
	`identifier` text NOT NULL,
	`pid_node_id` text NOT NULL,
	`anchor_node_id` text,
	`inlet_node_ids` text NOT NULL,
	`outlet_node_ids` text NOT NULL,
	CONSTRAINT `fk_MeasurementSample_measurement_dataset_id_MeasurementDataset_measurement_dataset_id_fk` FOREIGN KEY (`measurement_dataset_id`) REFERENCES `MeasurementDataset`(`measurement_dataset_id`),
	CONSTRAINT `fk_MeasurementSample_sample_id_Sample_sample_id_fk` FOREIGN KEY (`sample_id`) REFERENCES `Sample`(`sample_id`)
);
--> statement-breakpoint
ALTER TABLE `InventoryEntry` ADD `product_id` integer REFERENCES Product(product_id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `InventoryEntry` ADD `serial_number` text;--> statement-breakpoint
ALTER TABLE `PIDNode` ADD `symbol_key` text;--> statement-breakpoint
ALTER TABLE `PIDNode` ADD `equipment_entry_id` integer REFERENCES InventoryEntry(inventory_entry_id) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `PIDNode` ADD `sample_id` integer REFERENCES Sample(sample_id) ON DELETE SET NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `InventoryEntry_serial_number_unique` ON `InventoryEntry` (`serial_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `MeasurementColumn_dataset_position_unique` ON `MeasurementColumn` (`measurement_dataset_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `MeasurementDataset_source_pair_unique` ON `MeasurementDataset` (`csv_file_id`,`sidecar_file_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `MeasurementSample_dataset_position_unique` ON `MeasurementSample` (`measurement_dataset_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `PIDNode_inventory_entry_symbol_key_unique` ON `PIDNode` (`inventory_entry_id`,`symbol_key`);