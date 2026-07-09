"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.households = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const base_1 = require("./base");
exports.households = (0, pg_core_1.pgTable)("households", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    fyEndMonthDay: (0, pg_core_1.varchar)("fy_end_month_day", { length: 5 }).notNull().default("06-30"),
    customFields: (0, pg_core_1.jsonb)("custom_fields"),
    appId: (0, pg_core_1.uuid)("app_id").notNull(),
    ...base_1.timestamps
});
//# sourceMappingURL=household.js.map