CREATE TABLE `sync_outbox` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity` text NOT NULL,
	`row_uuid` text NOT NULL,
	`op` text NOT NULL,
	`created_at` text DEFAULT (datetime('now', 'localtime')) NOT NULL,
	`synced_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_outbox_pending` ON `sync_outbox` (`synced_at`);--> statement-breakpoint
ALTER TABLE `clients` ADD `uuid` text;--> statement-breakpoint
ALTER TABLE `copa_recipes` ADD `uuid` text;--> statement-breakpoint
ALTER TABLE `credit_transactions` ADD `uuid` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `uuid` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `uuid` text;--> statement-breakpoint
ALTER TABLE `products` ADD `uuid` text;--> statement-breakpoint
ALTER TABLE `stock_movements` ADD `uuid` text;--> statement-breakpoint
ALTER TABLE `table_items` ADD `uuid` text;--> statement-breakpoint
ALTER TABLE `tables` ADD `uuid` text;