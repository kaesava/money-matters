import { pgTable, uuid, varchar, boolean } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  fyEndMonthDay: varchar("fy_end_month_day", { length: 5 }).notNull().default("06-30"),
  premiumEnabled: boolean("premium_enabled").notNull().default(false),
  ...tenantAndTimestamps
});
