import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  // Force tsup to inline internal workspace modules so the output is self-contained
  noExternal: [
    "@money-matters/capability-tenant",
    "@money-matters/capability-money",
    "@money-matters/capability-notifications",
    "@money-matters/capability-file-notes",
    "@money-matters/capability-geo",
    "@money-matters/config",
    "@money-matters/core",
    "@money-matters/db",
    "@money-matters/types"
  ],
});
