import { pgTable, uuid, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
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
  ...tenantAndTimestamps,
});


