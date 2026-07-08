"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoryBudgets = exports.categories = exports.categoryGroups = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const base_1 = require("./base");
exports.categoryGroups = (0, pg_core_1.pgTable)("category_groups", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    ...base_1.tenantAndTimestamps
});
exports.categories = (0, pg_core_1.pgTable)("categories", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 50 }).notNull(), // 'major', 'bills', 'everyday'
    groupId: (0, pg_core_1.uuid)("group_id").references(() => exports.categoryGroups.id),
    isDefaultExcess: (0, pg_core_1.boolean)("is_default_excess").default(false), // e.g. Emergency Fund
    ...base_1.tenantAndTimestamps
});
exports.categoryBudgets = (0, pg_core_1.pgTable)("category_budgets", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    categoryId: (0, pg_core_1.uuid)("category_id").references(() => exports.categories.id).notNull(),
    annualAmount: (0, pg_core_1.varchar)("annual_amount", { length: 255 }), // Can be null if it's dynamic
    priority: (0, pg_core_1.varchar)("priority", { length: 50 }).notNull(), // for everyday: 50%, 75%, 100%. for others: ranks
    recurrenceRule: (0, pg_core_1.text)("recurrence_rule"), // RRULE string
    nextDueDate: (0, pg_core_1.timestamp)("next_due_date"),
    ...base_1.tenantAndTimestamps
});
//# sourceMappingURL=category.js.map