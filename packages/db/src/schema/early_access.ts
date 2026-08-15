import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

export const earlyAccessSubscribers = pgTable("early_access_subscribers", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  ...tenantAndTimestamps,
});
