ALTER TABLE `clients` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `copa_recipes` ADD `recipe_type` text DEFAULT 'copao' NOT NULL;--> statement-breakpoint
ALTER TABLE `copa_recipes` ADD `description` text;--> statement-breakpoint
ALTER TABLE `copa_recipes` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `expenses` ADD `active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `expenses` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `products` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `table_items` ADD `updated_at` text;--> statement-breakpoint
ALTER TABLE `tables` ADD `updated_at` text;