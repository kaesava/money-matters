"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionLedger = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const base_1 = require("./base");
const category_1 = require("./category");
const income_allocation_1 = require("./income_allocation");
exports.transactionLedger = (0, pg_core_1.pgTable)("transaction_ledger", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    categoryId: (0, pg_core_1.uuid)("category_id").references(() => category_1.categories.id).notNull(),
    snapshotId: (0, pg_core_1.uuid)("snapshot_id").references(() => income_allocation_1.incomeAllocationSnapshots.id),
    flowType: (0, pg_core_1.varchar)("flow_type", { length: 20 }).notNull(), // 'actual' or 'expected'
    amount: (0, pg_core_1.numeric)("amount", { precision: 12, scale: 2 }).notNull(),
    idempotencyKey: (0, pg_core_1.text)("idempotency_key").unique().notNull(),
    note: (0, pg_core_1.text)("note"),
    recordedAt: (0, pg_core_1.timestamp)("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    ...base_1.tenantAndTimestamps,
});
//# sourceMappingURL=transaction_ledger.js.map