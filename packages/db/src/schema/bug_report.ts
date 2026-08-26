import { pgTable, uuid, varchar, text, boolean, integer } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

export const bugReports = pgTable("bug_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  category: varchar("category", { length: 50 }).notNull().default("other"),
  severity: varchar("severity", { length: 20 }).notNull().default("medium"),
  frustrationLevel: integer("frustration_level").notNull().default(2),
  contactConsent: boolean("contact_consent").notNull().default(true),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  appVersion: varchar("app_version", { length: 50 }).notNull().default("1.0.0-beta"),
  platform: varchar("platform", { length: 20 }).notNull(),
  pageUrl: varchar("page_url", { length: 512 }),
  deviceInfo: text("device_info"),
  ...tenantAndTimestamps,
});
