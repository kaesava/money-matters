#!/usr/bin/env node
import { spawnSync } from "node:child_process";

console.log("🔍 Checking lockfile synchronization with pnpm-lock.yaml...");

const result = spawnSync("pnpm", ["install", "--frozen-lockfile", "--prefer-offline"], {
  stdio: "inherit",
  shell: true,
});

if (result.status !== 0) {
  console.error("\n" + "=".repeat(80));
  console.error("❌ ERR_PNPM_OUTDATED_LOCKFILE: pnpm-lock.yaml is out of sync with workspace package.json files.");
  console.error("   This will fail Cloudflare and CI deployments.");
  console.error("   Please run:");
  console.error("     pnpm install");
  console.error("   and commit the updated pnpm-lock.yaml.");
  console.error("=".repeat(80) + "\n");
  process.exit(1);
}

console.log("✔ Lockfile is up to date with all workspace package.json files.");
