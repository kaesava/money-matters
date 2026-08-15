import { pgTable, uuid, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const earlyAccessSubscribers = pgTable(
  "early_access_subscribers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    appId: uuid("app_id").notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    lastSubscribedAt: timestamp("last_subscribed_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    appIdEmailIdx: uniqueIndex("early_access_app_id_email_idx").on(table.appId, table.email),
  })
);

