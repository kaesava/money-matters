import { pgTable, uuid, varchar, integer, jsonb } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base";

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'major', 'bills', 'everyday'
  priorityWeight: integer("priority_weight").notNull().default(3), // 1 to 5
  componentFieldsData: jsonb("component_fields_data"),
  ...tenantAndTimestamps,
});
