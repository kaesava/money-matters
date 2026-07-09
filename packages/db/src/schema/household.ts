import { pgTable, uuid, varchar, jsonb } from "drizzle-orm/pg-core";
import { tenantAndTimestamps, timestamps } from "./base";

export const households = pgTable("households", {
  id: uuid("id").primaryKey().defaultRandom(),
  fyEndMonthDay: varchar("fy_end_month_day", { length: 5 }).notNull().default("06-30"),
  customFields: jsonb("custom_fields"),
  appId: uuid("app_id").notNull(),
  ...timestamps
});
