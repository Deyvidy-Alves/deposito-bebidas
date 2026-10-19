CREATE TABLE `clients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`nickname` text,
	`phone` text,
	`created_at` text DEFAULT (datetime('now', 'localtime')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `copa_ingredients` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`recipe_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`ml_used` real DEFAULT 0 NOT NULL,
	`proportional_cost` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `copa_recipes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_copa_ing_recipe` ON `copa_ingredients` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `copa_recipes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`total_ml` real DEFAULT 0 NOT NULL,
	`cost_price` real DEFAULT 0 NOT NULL,
	`sale_price` real DEFAULT 0 NOT NULL,
	`margin_pct` real,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now', 'localtime')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `credit_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`client_id` integer NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`table_id` integer,
	`type` text NOT NULL,
	`description` text,
	`operator` text,
	`created_at` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_credit_client` ON `credit_transactions` (`client_id`);--> statement-breakpoint
CREATE INDEX `idx_credit_table` ON `credit_transactions` (`table_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`description` text NOT NULL,
	`category` text,
	`amount` real DEFAULT 0 NOT NULL,
	`date` text NOT NULL,
	`created_at` text DEFAULT (datetime('now', 'localtime')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_id` integer,
	`client_id` integer,
	`method` text NOT NULL,
	`amount` real DEFAULT 0 NOT NULL,
	`breakdown` text,
	`created_at` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_payments_table` ON `payments` (`table_id`);--> statement-breakpoint
CREATE INDEX `idx_payments_client` ON `payments` (`client_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`unit` text DEFAULT 'un' NOT NULL,
	`volume_per_unit` real DEFAULT 0 NOT NULL,
	`cost_price` real DEFAULT 0 NOT NULL,
	`sale_price` real DEFAULT 0 NOT NULL,
	`min_stock` real DEFAULT 0 NOT NULL,
	`current_stock` real DEFAULT 0 NOT NULL,
	`barcode` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (datetime('now', 'localtime')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`type` text NOT NULL,
	`quantity` real DEFAULT 0 NOT NULL,
	`reason` text,
	`reference_id` integer,
	`unit_cost` real,
	`supplier` text,
	`operator` text,
	`created_at` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_stock_product` ON `stock_movements` (`product_id`);--> statement-breakpoint
CREATE TABLE `table_clients` (
	`table_id` integer NOT NULL,
	`client_id` integer NOT NULL,
	`settled` integer DEFAULT false NOT NULL,
	PRIMARY KEY(`table_id`, `client_id`),
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `table_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`table_id` integer NOT NULL,
	`product_id` integer,
	`recipe_id` integer,
	`description` text NOT NULL,
	`quantity` real DEFAULT 1 NOT NULL,
	`unit_price` real DEFAULT 0 NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`client_id` integer,
	`created_at` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
	FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recipe_id`) REFERENCES `copa_recipes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_table_items_table` ON `table_items` (`table_id`);--> statement-breakpoint
CREATE TABLE `tables` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`label` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
	`closed_at` text
);
