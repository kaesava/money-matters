import { pgTable, uuid, numeric, pgEnum, date, varchar } from "drizzle-orm/pg-core";
import { transferSources } from "./transfer_source.js";
import { envelopes } from "./envelope.js";
import { tenantAndTimestamps } from "./base.js";

export const transferEventStatusEnum = pgEnum("transfer_event_status_enum", ["PENDING", "CONFIRMED"]);

export const transferEvents = pgTable("transfer_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  transferSourceId: uuid("transfer_source_id").references(() => transferSources.id),
  sourceEnvelopeId: uuid("source_envelope_id").references(() => envelopes.id).notNull(),
  destinationEnvelopeId: uuid("destination_envelope_id").references(() => envelopes.id).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  expectedDate: date("expected_date").notNull(),
  expectedAmount: numeric("expected_amount", { precision: 12, scale: 2 }).notNull(),
  actualAmount: numeric("actual_amount", { precision: 12, scale: 2 }),
  status: transferEventStatusEnum("status").notNull().default("PENDING"),
  ...tenantAndTimestamps,
});

export type TransferEvent = typeof transferEvents.$inferSelect;
export type NewTransferEvent = typeof transferEvents.$inferInsert;
