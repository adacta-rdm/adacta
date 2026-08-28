CREATE TABLE `Repository` (
	`repository_id` integer PRIMARY KEY AUTOINCREMENT,
	`slug` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
