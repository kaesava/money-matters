"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incomeAllocationSnapshots = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const base_1 = require("./base");
const financial_schedule_1 = require("./financial_schedule");
exports.incomeAllocationSnapshots = (0, pg_core_1.pgTable)("income_allocation_snapshots", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    scheduleId: (0, pg_core_1.uuid)("schedule_id").references(() => financial_schedule_1.financialSchedules.id).notNull(),
    incomeAmount: (0, pg_core_1.numeric)("income_amount", { precision: 12, scale: 2 }).notNull(),
    status: (0, pg_core_1.varchar)("status", { length: 20 }).notNull().default("draft"), // 'draft', 'user_confirmed'
    allocationSplitsManifest: (0, pg_core_1.jsonb)("allocation_splits_manifest").notNull(),
    calculatedAt: (0, pg_core_1.timestamp)("calculated_at", { withTimezone: true }).notNull().defaultNow(),
    ...base_1.tenantAndTimestamps,
});
//# sourceMappingURL=income_allocation.js.map