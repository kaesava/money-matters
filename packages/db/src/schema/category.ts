import { pgTable, uuid, varchar, integer, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base";

export const categoryTypeEnum = pgEnum("category_type_enum", ["major", "bills", "everyday"]);

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: categoryTypeEnum("type").notNull(),
  priorityWeight: integer("priority_weight").notNull().default(3),
  componentFieldsData: jsonb("component_fields_data"),
  ...tenantAndTimestamps,
});
