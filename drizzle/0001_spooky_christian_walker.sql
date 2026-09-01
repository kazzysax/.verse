CREATE TABLE `api_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`bucket` text NOT NULL,
	`subject_hash` text NOT NULL,
	`window_start` integer NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `api_rate_limits_expiry_idx` ON `api_rate_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_user_id` text,
	`action` text NOT NULL,
	`resource_type` text NOT NULL,
	`resource_id` text,
	`outcome` text NOT NULL,
	`metadata_json` text,
	`request_fingerprint` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `audit_events_actor_created_idx` ON `audit_events` (`actor_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_events_resource_idx` ON `audit_events` (`resource_type`,`resource_id`);--> statement-breakpoint
CREATE INDEX `audit_events_action_created_idx` ON `audit_events` (`action`,`created_at`);--> statement-breakpoint
CREATE TABLE `chain_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`kind` text NOT NULL,
	`aggregate_id` text NOT NULL,
	`wallet_id` text NOT NULL,
	`provider_request_id` text NOT NULL,
	`provider_transaction_id` text,
	`tx_hash` text,
	`status` text DEFAULT 'created' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`failure_code` text,
	`failure_message` text,
	`created_at` text NOT NULL,
	`submitted_at` text,
	`confirmed_at` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chain_operations_provider_request_unique` ON `chain_operations` (`provider_request_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `chain_operations_tx_hash_unique` ON `chain_operations` (`tx_hash`);--> statement-breakpoint
CREATE INDEX `chain_operations_aggregate_idx` ON `chain_operations` (`kind`,`aggregate_id`);--> statement-breakpoint
CREATE INDEX `chain_operations_status_updated_idx` ON `chain_operations` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `domain_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`domain_id` text NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`status` text DEFAULT 'reserved' NOT NULL,
	`price_verse_atomic` text,
	`verse_usd_micros` integer,
	`quote_expires_at` text,
	`payment_operation_id` text,
	`mint_operation_id` text,
	`failure_code` text,
	`failure_message` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`domain_id`) REFERENCES `domains`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`payment_operation_id`) REFERENCES `chain_operations`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`mint_operation_id`) REFERENCES `chain_operations`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domain_orders_domain_unique` ON `domain_orders` (`domain_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `domain_orders_payment_operation_unique` ON `domain_orders` (`payment_operation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `domain_orders_mint_operation_unique` ON `domain_orders` (`mint_operation_id`);--> statement-breakpoint
CREATE INDEX `domain_orders_user_created_idx` ON `domain_orders` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `domain_orders_status_updated_idx` ON `domain_orders` (`status`,`updated_at`);--> statement-breakpoint
CREATE TABLE `gas_sponsorships` (
	`operation_id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`day_key` text NOT NULL,
	`status` text DEFAULT 'reserved' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`operation_id`) REFERENCES `chain_operations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `gas_sponsorships_user_day_idx` ON `gas_sponsorships` (`user_id`,`day_key`,`status`);--> statement-breakpoint
CREATE TRIGGER `gas_sponsorships_daily_limit_insert`
BEFORE INSERT ON `gas_sponsorships`
WHEN NEW.status != 'released' AND (
	SELECT COUNT(*) FROM `gas_sponsorships`
	WHERE `user_id` = NEW.user_id
		AND `day_key` = NEW.day_key
		AND `status` != 'released'
) >= 20
BEGIN
	SELECT RAISE(ABORT, 'DAILY_SPONSORED_LIMIT');
END;--> statement-breakpoint
CREATE TRIGGER `gas_sponsorships_daily_limit_reactivate`
BEFORE UPDATE OF `status` ON `gas_sponsorships`
WHEN OLD.status = 'released' AND NEW.status != 'released' AND (
	SELECT COUNT(*) FROM `gas_sponsorships`
	WHERE `user_id` = NEW.user_id
		AND `day_key` = NEW.day_key
		AND `status` != 'released'
) >= 20
BEGIN
	SELECT RAISE(ABORT, 'DAILY_SPONSORED_LIMIT');
END;--> statement-breakpoint
ALTER TABLE `payments` ADD `chain_operation_id` text REFERENCES chain_operations(id);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_chain_operation_unique` ON `payments` (`chain_operation_id`);
