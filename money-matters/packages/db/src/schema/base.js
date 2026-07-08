"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantAndTimestamps = exports.timestamps = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.timestamps = {
    createdAt: (0, pg_core_1.timestamp)("created_at").notNull().defaultNow(),
    createdBy: (0, pg_core_1.uuid)("created_by").notNull(),
    updatedAt: (0, pg_core_1.timestamp)("updated_at").notNull().defaultNow(),
    updatedBy: (0, pg_core_1.uuid)("updated_by").notNull(),
    archivedAt: (0, pg_core_1.timestamp)("archived_at"),
};
exports.tenantAndTimestamps = {
    tenantId: (0, pg_core_1.uuid)("tenant_id").notNull(),
    ...exports.timestamps
};
//# sourceMappingURL=base.js.map