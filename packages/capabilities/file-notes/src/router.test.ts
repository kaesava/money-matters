import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import {
  createPreSignedUrlHandler,
  createFileNoteHandler,
  listFileNotesHandler,
  archiveFileNoteHandler,
  purgeFileNoteHandler,
  getStorageQuotaHandler,
} from "./handlers/index.js";

describe("FileNotes capability handlers", () => {
  const mockTenantId = "00000000-0000-0000-0000-000000000001";
  const mockUserId = "00000000-0000-0000-0000-000000000002";
  const mockAppId = "01908bde-34bb-7b19-a178-574211bc93aa";
  const mockEntityId = "00000000-0000-0000-0000-000000000003";

  const ctx = {
    tenantId: mockTenantId,
    userId: mockUserId,
    appId: mockAppId,
  };

  it("rejects presigned URL generation if file size exceeds single file cap", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { featureFlags: { fileNotes: true, fileNotesMaxStorageMb: 100, fileNotesMaxFileMb: 5 } },
            ]),
          }),
        }),
      }),
    } as unknown as DbOrTx;

    await expect(
      createPreSignedUrlHandler(mockDb, ctx, {
        entityType: "ENVELOPE",
        entityId: mockEntityId,
        fileName: "large-video.mp4",
        fileMimeType: "video/mp4",
        fileSize: 10 * 1024 * 1024, // 10MB exceeds 5MB limit
      })
    ).rejects.toThrow(/File size exceeds the limit/);
  });

  it("rejects presigned URL if fileNotes feature is disabled", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { featureFlags: { fileNotes: false, fileNotesMaxStorageMb: 100, fileNotesMaxFileMb: 10 } },
            ]),
          }),
        }),
      }),
    } as unknown as DbOrTx;

    await expect(
      createPreSignedUrlHandler(mockDb, ctx, {
        entityType: "ENVELOPE",
        entityId: mockEntityId,
        fileName: "bill.pdf",
        fileMimeType: "application/pdf",
        fileSize: 1024,
      })
    ).rejects.toThrow();
  });
});
