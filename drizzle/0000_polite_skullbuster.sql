CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`contact_user_id` text NOT NULL,
	`alias` text,
	`favorite` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contact_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_owner_contact_unique` ON `contacts` (`owner_user_id`,`contact_user_id`);--> statement-breakpoint
CREATE INDEX `contacts_owner_favorite_idx` ON `contacts` (`owner_user_id`,`favorite`);--> statement-breakpoint
CREATE TABLE `domains` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`owner_user_id` text NOT NULL,
	`owner_wallet_address` text NOT NULL,
	`token_id` text,
	`status` text DEFAULT 'reserved' NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`acquired_kind` text NOT NULL,
	`price_verse_atomic` text,
	`minted_tx_hash` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `domains_name_unique` ON `domains` (`name`);--> statement-breakpoint
CREATE INDEX `domains_owner_status_idx` ON `domains` (`owner_user_id`,`status`);--> statement-breakpoint
CREATE INDEX `domains_primary_idx` ON `domains` (`owner_user_id`,`is_primary`);--> statement-breakpoint
CREATE TABLE `gas_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`day_key` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `gas_usage_user_day_unique` ON `gas_usage` (`user_id`,`day_key`);--> statement-breakpoint
CREATE TABLE `identities` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`provider` text NOT NULL,
	`normalized_handle` text NOT NULL,
	`display_handle` text NOT NULL,
	`provider_subject` text,
	`verified` integer DEFAULT false NOT NULL,
	`verified_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `identities_provider_handle_unique` ON `identities` (`provider`,`normalized_handle`);--> statement-breakpoint
CREATE INDEX `identities_user_provider_idx` ON `identities` (`user_id`,`provider`);--> statement-breakpoint
CREATE INDEX `identities_verified_lookup_idx` ON `identities` (`provider`,`verified`,`normalized_handle`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text NOT NULL,
	`payment_id` text,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`channel` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	`sent_at` text,
	`read_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user_created_idx` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_delivery_idx` ON `notifications` (`channel`,`status`);--> statement-breakpoint
CREATE TABLE `payment_links` (
	`id` text PRIMARY KEY NOT NULL,
	`public_token` text NOT NULL,
	`creator_user_id` text NOT NULL,
	`recipient_display` text NOT NULL,
	`asset` text,
	`amount_display` text,
	`memo` text,
	`status` text DEFAULT 'active' NOT NULL,
	`expires_at` text,
	`use_count` integer DEFAULT 0 NOT NULL,
	`max_uses` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`creator_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payment_links_public_token_unique` ON `payment_links` (`public_token`);--> statement-breakpoint
CREATE INDEX `payment_links_creator_created_idx` ON `payment_links` (`creator_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `payment_links_status_expiry_idx` ON `payment_links` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`sender_user_id` text NOT NULL,
	`recipient_user_id` text NOT NULL,
	`recipient_identity_id` text,
	`recipient_display` text NOT NULL,
	`from_wallet` text NOT NULL,
	`to_wallet` text NOT NULL,
	`asset` text NOT NULL,
	`token_address` text NOT NULL,
	`amount_atomic` text NOT NULL,
	`amount_display` text NOT NULL,
	`chain_id` integer NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`sponsored` integer DEFAULT true NOT NULL,
	`idempotency_key` text NOT NULL,
	`provider_reference_id` text,
	`tx_hash` text,
	`failure_code` text,
	`failure_message` text,
	`created_at` text NOT NULL,
	`submitted_at` text,
	`confirmed_at` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`sender_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recipient_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recipient_identity_id`) REFERENCES `identities`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payments_sender_idempotency_unique` ON `payments` (`sender_user_id`,`idempotency_key`);--> statement-breakpoint
CREATE INDEX `payments_sender_created_idx` ON `payments` (`sender_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `payments_recipient_created_idx` ON `payments` (`recipient_user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `payments_status_updated_idx` ON `payments` (`status`,`updated_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `payments_tx_hash_unique` ON `payments` (`tx_hash`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`privy_user_id` text NOT NULL,
	`email` text,
	`status` text DEFAULT 'active' NOT NULL,
	`privy_wallet_id` text,
	`wallet_address` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_privy_user_id_unique` ON `users` (`privy_user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_wallet_address_unique` ON `users` (`wallet_address`);--> statement-breakpoint
CREATE TABLE `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider_event_id` text NOT NULL,
	`provider` text NOT NULL,
	`type` text NOT NULL,
	`payload_hash` text NOT NULL,
	`status` text DEFAULT 'received' NOT NULL,
	`error_message` text,
	`created_at` text NOT NULL,
	`processed_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_events_provider_id_unique` ON `webhook_events` (`provider`,`provider_event_id`);--> statement-breakpoint
CREATE INDEX `webhook_events_status_idx` ON `webhook_events` (`status`,`created_at`);