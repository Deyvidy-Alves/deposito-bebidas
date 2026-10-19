CREATE TABLE `table_item_consumers` (
	`item_id` integer NOT NULL,
	`client_id` integer NOT NULL,
	PRIMARY KEY(`item_id`, `client_id`),
	FOREIGN KEY (`item_id`) REFERENCES `table_items`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
