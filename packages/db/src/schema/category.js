"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categories = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const base_1 = require("./base");
exports.categories = (0, pg_core_1.pgTable)("categories", {
    id: (0, pg_core_1.uuid)("id").primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)("name", { length: 255 }).notNull(),
    type: (0, pg_core_1.varchar)("type", { length: 50 }).notNull(), // 'major', 'bills', 'everyday'
    priorityWeight: (0, pg_core_1.integer)("priority_weight").notNull().default(3), // 1 to 5
    componentFieldsData: (0, pg_core_1.jsonb)("component_fields_data"),
    ...base_1.tenantAndTimestamps,
});
//# sourceMappingURL=category.js.map