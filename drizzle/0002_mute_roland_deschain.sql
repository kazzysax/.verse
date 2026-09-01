ALTER TABLE `domain_orders` ADD `quote_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `domain_orders_quote_unique` ON `domain_orders` (`quote_id`);--> statement-breakpoint
ALTER TABLE `users` ADD `free_domain_claimed_at` text;