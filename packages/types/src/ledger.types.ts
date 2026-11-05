import { z } from "zod";
import { BaseSchema } from "./tenant.types.js";

/**
 * Schema for double-entry or single-entry transaction ledger events.
 */
export const TransactionLedgerSchema = BaseSchema.extend({
  envelopeId: z.string().uuid(),
  bankAccountId: z.string().uuid().nullable(),
  planLineId: z.string().uuid().nullable(),
  transferGroupId: z.string().uuid().nullable().optional(),
  flowType: z.enum(["DEBIT", "CREDIT"]),
  amount: z.string(),
  idempotencyKey: z.string(),
  note: z.string().nullable(),
  source: z.enum(["MANUAL", "AUTO", "IMPORT"]).default("MANUAL"),
  recordedAt: z.date(),
}).strict();

export type TransactionLedgerType = z.infer<typeof TransactionLedgerSchema>;

/**
 * Query schema for listing transaction ledger entries with pagination.
 */
export const ListTransactionsQuery = z.object({
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().default(0),
  envelopeId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
}).strict();

/**
 * Query schema for global search across historical transaction ledger entries.
 */
export const SearchTransactionsQuery = z.object({
  query: z.string().trim().min(1).max(100),
  limit: z.number().int().min(1).max(50).default(10),
  envelopeId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
}).strict();
export type SearchTransactionsQuery = z.infer<typeof SearchTransactionsQuery>;

/**
 * Query schema for listing transactions scoped to a specific envelope.
 */
export const ListEnvelopeTransactionsQuery = z.object({
  envelopeId: z.string().uuid().optional(),
  limit: z.number().int().max(100).default(30),
  offset: z.number().int().default(0),
}).strict();
