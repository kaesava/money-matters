import { pgTable, uuid, varchar, text, boolean } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { users } from "./user.js";

/**
 * File Notes & Document Attachments entity.
 * Supports polymorphic attachment of text notes and R2-backed files to envelopes and bank accounts.
 * Enforces PostgreSQL RLS tenant and stealth privacy isolation.
 */
export const fileNotes = pgTable("file_notes", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Polymorphic entity link ('ENVELOPE' | 'BANK_ACCOUNT')
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: uuid("entity_id").notNull(),

  // Text content
  comment: text("comment"),

  // Cloudflare R2 object attachment details
  fileKey: varchar("file_key", { length: 512 }),
  fileName: varchar("file_name", { length: 255 }),
  fileMimeType: varchar("file_mime_type", { length: 100 }),
  fileSize: varchar("file_size", { length: 50 }),

  // Stealth Privacy Isolation
  isPrivate: boolean("is_private").notNull().default(false),
  userId: uuid("user_id").references(() => users.id),

  ...tenantAndTimestamps,
});
