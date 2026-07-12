import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

export const deviceTokens = pgTable("device_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(), // 'ios' | 'android' | 'web'
  token: varchar("token", { length: 255 }).notNull(),
  ...tenantAndTimestamps
});
