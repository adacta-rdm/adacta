CREATE TABLE `InventoryEntry` (
	`inventory_entry_id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL,
	`kind` text NOT NULL,
	`location_building_identifier` text,
	`location_room_identifier` text,
	`location_label` text,
	`metadata_creator_id` integer,
	`metadata_creation_timestamp` integer NOT NULL,
	`metadata_deleted_at` integer
);
