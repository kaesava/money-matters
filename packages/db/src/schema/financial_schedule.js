"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.financialSchedules = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const base_1 = require("./base");
const category_1 = require("./category");
exports.financialSchedules = (0, pg_core_1.pgTable)("financial_schedules", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    categoryId: (0, pg_core_1.uuid)("category_id").references(() => category_1.categories.id),
    direction: (0, pg_core_1.varchar)("direction", { length: 10 }).notNull(), // 'IN' or 'OUT'
    incomeType: (0, pg_core_1.varchar)("income_type", { length: 20 }), // 'recurring', 'one_off', 'uncertain'
    amount: (0, pg_core_1.numeric)("amount", { precision: 12, scale: 2 }).notNull(),
    frequencyCron: (0, pg_core_1.text)("frequency_cron"),
    startDate: (0, pg_core_1.date)("start_date").notNull(),
    endDate: (0, pg_core_1.date)("end_date"),
    ...base_1.tenantAndTimestamps,
});
//# sourceMappingURL=financial_schedule.js.map