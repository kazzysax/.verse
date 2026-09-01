// Intentionally empty by default.
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    privyUserId: text("privy_user_id").notNull(),
    email: text("email"),
    status: text("status", { enum: ["active", "suspended"] })
      .notNull()
      .default("active"),
    privyWalletId: text("privy_wallet_id"),
    walletAddress: text("wallet_address"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("users_privy_user_id_unique").on(table.privyUserId),
    uniqueIndex("users_wallet_address_unique").on(table.walletAddress),
  ],
);

export const identities = sqliteTable(
  "identities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider", {
      enum: ["verse", "x", "telegram", "email"],
    }).notNull(),
    normalizedHandle: text("normalized_handle").notNull(),
    displayHandle: text("display_handle").notNull(),
    providerSubject: text("provider_subject"),
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    verifiedAt: text("verified_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("identities_provider_handle_unique").on(
      table.provider,
      table.normalizedHandle,
    ),
    index("identities_user_provider_idx").on(table.userId, table.provider),
    index("identities_verified_lookup_idx").on(
      table.provider,
      table.verified,
      table.normalizedHandle,
    ),
  ],
);

export const domains = sqliteTable(
  "domains",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    ownerWalletAddress: text("owner_wallet_address").notNull(),
    tokenId: text("token_id"),
    status: text("status", {
      enum: ["reserved", "pending", "active", "transferred", "failed"],
    })
      .notNull()
      .default("reserved"),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    acquiredKind: text("acquired_kind", {
      enum: ["free", "paid", "transfer"],
    }).notNull(),
    priceVerseAtomic: text("price_verse_atomic"),
    mintedTxHash: text("minted_tx_hash"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("domains_name_unique").on(table.name),
    index("domains_owner_status_idx").on(table.ownerUserId, table.status),
    index("domains_primary_idx").on(table.ownerUserId, table.isPrimary),
  ],
);

export const payments = sqliteTable(
  "payments",
  {
    id: text("id").primaryKey(),
    senderUserId: text("sender_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    recipientUserId: text("recipient_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    recipientIdentityId: text("recipient_identity_id").references(
      () => identities.id,
      { onDelete: "set null" },
    ),
    recipientDisplay: text("recipient_display").notNull(),
    fromWallet: text("from_wallet").notNull(),
    toWallet: text("to_wallet").notNull(),
    asset: text("asset", { enum: ["USDC", "VERSE"] }).notNull(),
    tokenAddress: text("token_address").notNull(),
    amountAtomic: text("amount_atomic").notNull(),
    amountDisplay: text("amount_display").notNull(),
    chainId: integer("chain_id").notNull(),
    status: text("status", {
      enum: ["created", "authorized", "submitted", "confirmed", "failed"],
    })
      .notNull()
      .default("created"),
    sponsored: integer("sponsored", { mode: "boolean" }).notNull().default(true),
    idempotencyKey: text("idempotency_key").notNull(),
    providerReferenceId: text("provider_reference_id"),
    txHash: text("tx_hash"),
    failureCode: text("failure_code"),
    failureMessage: text("failure_message"),
    createdAt: text("created_at").notNull(),
    submittedAt: text("submitted_at"),
    confirmedAt: text("confirmed_at"),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("payments_sender_idempotency_unique").on(
      table.senderUserId,
      table.idempotencyKey,
    ),
    index("payments_sender_created_idx").on(table.senderUserId, table.createdAt),
    index("payments_recipient_created_idx").on(
      table.recipientUserId,
      table.createdAt,
    ),
    index("payments_status_updated_idx").on(table.status, table.updatedAt),
    uniqueIndex("payments_tx_hash_unique").on(table.txHash),
  ],
);

export const gasUsage = sqliteTable(
  "gas_usage",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayKey: text("day_key").notNull(),
    count: integer("count").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("gas_usage_user_day_unique").on(table.userId, table.dayKey),
  ],
);

export const contacts = sqliteTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    ownerUserId: text("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    contactUserId: text("contact_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    alias: text("alias"),
    favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("contacts_owner_contact_unique").on(
      table.ownerUserId,
      table.contactUserId,
    ),
    index("contacts_owner_favorite_idx").on(table.ownerUserId, table.favorite),
  ],
);

export const paymentLinks = sqliteTable(
  "payment_links",
  {
    id: text("id").primaryKey(),
    publicToken: text("public_token").notNull(),
    creatorUserId: text("creator_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipientDisplay: text("recipient_display").notNull(),
    asset: text("asset", { enum: ["USDC", "VERSE"] }),
    amountDisplay: text("amount_display"),
    memo: text("memo"),
    status: text("status", { enum: ["active", "disabled", "expired"] })
      .notNull()
      .default("active"),
    expiresAt: text("expires_at"),
    useCount: integer("use_count").notNull().default(0),
    maxUses: integer("max_uses"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("payment_links_public_token_unique").on(table.publicToken),
    index("payment_links_creator_created_idx").on(table.creatorUserId, table.createdAt),
    index("payment_links_status_expiry_idx").on(table.status, table.expiresAt),
  ],
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    paymentId: text("payment_id").references(() => payments.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    channel: text("channel", { enum: ["in_app", "email"] }).notNull(),
    status: text("status", { enum: ["pending", "sent", "failed", "read"] })
      .notNull()
      .default("pending"),
    createdAt: text("created_at").notNull(),
    sentAt: text("sent_at"),
    readAt: text("read_at"),
  },
  (table) => [
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
    index("notifications_delivery_idx").on(table.channel, table.status),
  ],
);

export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    id: text("id").primaryKey(),
    providerEventId: text("provider_event_id").notNull(),
    provider: text("provider").notNull(),
    type: text("type").notNull(),
    payloadHash: text("payload_hash").notNull(),
    status: text("status", { enum: ["received", "processed", "failed"] })
      .notNull()
      .default("received"),
    errorMessage: text("error_message"),
    createdAt: text("created_at").notNull(),
    processedAt: text("processed_at"),
  },
  (table) => [
    uniqueIndex("webhook_events_provider_id_unique").on(
      table.provider,
      table.providerEventId,
    ),
    index("webhook_events_status_idx").on(table.status, table.createdAt),
  ],
);
