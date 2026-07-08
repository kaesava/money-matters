import { pgTable, uuid, varchar, text, jsonb } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base";

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("todo"),
  extraFields: jsonb("extra_fields").$type<Record<string, unknown>>(),
  ...tenantAndTimestamps,
});
