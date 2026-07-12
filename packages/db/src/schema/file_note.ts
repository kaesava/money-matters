import { pgTable, uuid, varchar, text } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

export const fileNotes = pgTable("file_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityType: varchar("entity_type", { length: 50 }).notNull(), // 'expenses' | 'categories' etc.
  entityId: uuid("entity_id").notNull(),
  comment: text("comment"),
  fileKey: varchar("file_key", { length: 512 }),
  fileName: varchar("file_name", { length: 255 }),
  fileMimeType: varchar("file_mime_type", { length: 100 }),
  fileSize: varchar("file_size", { length: 50 }),
  ...tenantAndTimestamps
});
