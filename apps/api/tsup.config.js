"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tsup_1 = require("tsup");
exports.default = (0, tsup_1.defineConfig)({
    entry: ["src/index.ts"],
    format: ["esm"],
    clean: true,
    platform: "node",
    shims: true,
    // Make third-party dependencies external so they are resolved from node_modules at runtime
    external: [
        "pino",
        "drizzle-orm",
        "@neondatabase/serverless",
        "fastify",
        "@fastify/cors",
        "inngest",
        "zod",
        "jose",
        "better-auth",
        "uuid"
    ],
    // Force tsup to inline internal workspace modules so the output is self-contained
    noExternal: [
        "@money-matters/capability-tenant",
        "@money-matters/capability-notifications",
        "@money-matters/capability-file-notes",
        "@money-matters/capability-budgeting",
        "@money-matters/capability-transactions",
        "@money-matters/config",
        "@money-matters/core",
        "@money-matters/db",
        "@money-matters/types"
    ],
});
//# sourceMappingURL=tsup.config.js.map