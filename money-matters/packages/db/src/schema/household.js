"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bankAccounts = exports.users = exports.households = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const base_1 = require("./base");
exports.households = (0, pg_core_1.pgTable)("households", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    ...base_1.timestamps // Household is the tenant, so it doesn't have a tenantId pointing to something else
});
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.uuid)("id").primaryKey(), // ID coming from Neon Auth
    email: (0, pg_core_1.varchar)("email", { length: 255 }).notNull().unique(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    // Multi-tenant: User belongs to a single household (for now, 1:1 or M:1)
    householdId: (0, pg_core_1.uuid)("household_id").references(() => exports.households.id).notNull(),
    ...base_1.timestamps
});
exports.bankAccounts = (0, pg_core_1.pgTable)("bank_accounts", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 50 }).notNull(), // 'everyday', 'major', 'bills'
    balance: (0, pg_core_1.varchar)("balance", { length: 255 }).notNull().default("0"), // Stored as string to avoid precision loss, or numeric
    ...base_1.tenantAndTimestamps,
});
//# sourceMappingURL=household.js.map