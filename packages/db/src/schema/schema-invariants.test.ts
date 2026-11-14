import { describe, it, expect } from "vitest";
import * as schema from "./index.js";

const GLOBAL_TABLES = new Set(["apps", "users", "userPreferences", "earlyAccessSubscribers", "processedWebhooks"]);

describe("Database Schema Audit & Multi-Tenancy Invariants", () => {
  it("enforces standard audit columns across all domain tables", () => {
    const entries = Object.entries(schema).filter(([key, val]) => {
      if (key === "timestamps" || key === "tenantAndTimestamps") return false;
      if (key === "processedWebhooks") return false; // global Stripe idempotency table
      return val !== null && typeof val === "object" && "id" in val;
    });

    expect(entries.length).toBeGreaterThanOrEqual(21);

    for (const [name, table] of entries) {
      const cols = table as Record<string, unknown>;
      expect(cols, `${name} missing id`).toHaveProperty("id");
      expect(cols, `${name} missing createdAt`).toHaveProperty("createdAt");
      expect(cols, `${name} missing createdBy`).toHaveProperty("createdBy");
      expect(cols, `${name} missing updatedAt`).toHaveProperty("updatedAt");
      expect(cols, `${name} missing updatedBy`).toHaveProperty("updatedBy");
      expect(cols, `${name} missing archivedAt`).toHaveProperty("archivedAt");
      expect(cols, `${name} missing archivedBy`).toHaveProperty("archivedBy");

      if (!GLOBAL_TABLES.has(name)) {
        if (name !== "tenants") {
          expect(cols, `${name} missing tenantId`).toHaveProperty("tenantId");
        }
        expect(cols, `${name} missing appId`).toHaveProperty("appId");
      }
    }
  });
});
