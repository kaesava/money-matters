import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import { createFileNoteHandler } from "./index.js";

describe("file-notes handlers", () => {
  it("rejects creating a file note when the target entity is private to another user", async () => {
    let callIdx = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockImplementation(() => {
          callIdx += 1;
          if (callIdx === 1) {
            return Promise.resolve([{ featureFlags: { fileNotes: true } }]);
          }
          return Promise.resolve([{ id: "env-bob", isPrivate: true, userId: "user-bob" }]);
        }),
      })),
    };

    await expect(
      createFileNoteHandler(
        mockDb as unknown as DbOrTx,
        { tenantId: "t-1", userId: "user-alice", appId: "money-matters" },
        { entityType: "ENVELOPE", entityId: "env-bob", comment: "Test" }
      )
    ).rejects.toThrow("private_entity_unauthorized");
  });

  it("rejects creating a file note when fileNotes feature flag is disabled", async () => {
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ featureFlags: { fileNotes: false } }]),
      })),
    };

    await expect(
      createFileNoteHandler(
        mockDb as unknown as DbOrTx,
        { tenantId: "t-1", userId: "user-alice", appId: "money-matters" },
        { entityType: "ENVELOPE", entityId: "env-1", comment: "Test" }
      )
    ).rejects.toThrow("file_notes_disabled");
  });
});
