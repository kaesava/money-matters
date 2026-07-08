"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incomeSources = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const base_1 = require("./base");
const household_1 = require("./household");
exports.incomeSources = (0, pg_core_1.pgTable)("income_sources", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    amount: (0, pg_core_1.varchar)("amount", { length: 255 }).notNull(),
    recurrenceRule: (0, pg_core_1.text)("recurrence_rule"),
    nextExpectedDate: (0, pg_core_1.timestamp)("next_expected_date"),
    receivingAccountId: (0, pg_core_1.uuid)("receiving_account_id").references(() => household_1.bankAccounts.id),
    ...base_1.tenantAndTimestamps
});
//# sourceMappingURL=income.js.map