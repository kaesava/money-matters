import { pgTable, uuid, varchar, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { apps } from "./app.js";
import { timestamps } from "./base.js";

/**
 * Root tenant entity. Represents one household/workspace scoped to exactly one app.
 *
 * DESIGN: tenants IS the isolation boundary — it must NOT reference itself.
 * Therefore it uses `timestamps` (audit-only mixin) not `tenantAndTimestamps`.
 * appId is declared explicitly with a FK to apps.id, not via the base mixin.
 *
 * A user can belong to multiple tenants. If a user needs two apps, they get
 * two separate tenant IDs — one per app. There is no multi-app tenant join table.
 */
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Every tenant belongs to exactly one app. FK enforces referential integrity.
  appId: uuid("app_id").notNull().references(() => apps.id),
  name: varchar("name", { length: 255 }).notNull(),
  country: varchar("country", { length: 2 }).notNull().default("AU"),
  state: varchar("state", { length: 50 }),
  postcode: varchar("postcode", { length: 20 }),
  fyEndMonthDay: varchar("fy_end_month_day", { length: 5 }).notNull().default("06-30"),
  premiumEnabled: boolean("premium_enabled").notNull().default(false),
  subscriptionStatus: varchar("subscription_status", { length: 30 })
    .notNull()
    .default("TRIAL_ACTIVE"),
  trialStartedAt: timestamp("trial_started_at", { withTimezone: true }),
  trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),
  trialGraceEndsAt: timestamp("trial_grace_ends_at", { withTimezone: true }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripePriceId: varchar("stripe_price_id", { length: 255 }),
  subscribedAt: timestamp("subscribed_at", { withTimezone: true }),
  subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true }),
  sweepEverydayLeftover: boolean("sweep_everyday_leftover").notNull().default(true),
  lastSweepProcessedMonth: varchar("last_sweep_processed_month", { length: 7 }), // e.g. "2026-07"
  merchantRules: jsonb("merchant_rules").$type<Record<string, string>>().notNull().default({}),
  ...timestamps,
});
