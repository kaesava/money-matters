import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const processedWebhooks = pgTable("processed_webhooks", {
  eventId: varchar("event_id", { length: 255 }).primaryKey(),
  eventType: varchar("event_type", { length: 255 }).notNull(),
  processedAt: timestamp("processed_at", { mode: "date" }).defaultNow().notNull(),
});
