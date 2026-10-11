import { pgTable, uuid, varchar, numeric, date } from "drizzle-orm/pg-core";
import { envelopes } from "./envelope.js";
import { tenantAndTimestamps } from "./base.js";

export const transferSources = pgTable("transfer_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  sourceEnvelopeId: uuid("source_envelope_id").references(() => envelopes.id).notNull(),
  destinationEnvelopeId: uuid("destination_envelope_id").references(() => envelopes.id).notNull(),
  startDate: date("start_date"),
  ...tenantAndTimestamps,
});

export type TransferSource = typeof transferSources.$inferSelect;
export type NewTransferSource = typeof transferSources.$inferInsert;
