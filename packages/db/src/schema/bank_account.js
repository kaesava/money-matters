"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankAccounts = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const base_1 = require("./base");
exports.bankAccounts = (0, pg_core_1.pgTable)("bank_accounts", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    accountName: (0, pg_core_1.varchar)("account_name", { length: 255 }).notNull(),
    accountType: (0, pg_core_1.varchar)("account_type", { length: 50 }).notNull(), // 'everyday', 'bills', 'major', 'offset'
    lastKnownBalance: (0, pg_core_1.numeric)("last_known_balance", { precision: 12, scale: 2 }).notNull().default("0"),
    ...base_1.tenantAndTimestamps,
});
//# sourceMappingURL=bank_account.js.map