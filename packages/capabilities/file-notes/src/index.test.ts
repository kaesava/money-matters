import { describe, it, expect, vi } from "vitest";
import {
  listFileNotesHandler,
  createFileNoteHandler,
  updateFileNoteCommentHandler,
  archiveFileNoteHandler,
  purgeFileNoteHandler,
} from "./index.js";

vi.mock("@money-matters/db", () => {
  return {
    fileNotes: {
      id: "file-notes-id",
      tenantId: "tenant-id",
      appId: "app-id",
      entityType: "entity-type",
      entityId: "entity-id",
      comment: "comment",
      fileKey: "file-key",
      fileName: "file-name",
      fileMimeType: "file-mime-type",
      fileSize: "file-size",
      createdAt: "created-at",
      createdBy: "created-by",
      updatedAt: "updated-at",
      updatedBy: "updated-by",
      archivedAt: "archived-at",
    },
  };
});

describe("file-notes capability handlers", () => {
  const mockDb = {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    returning: vi.fn().mockImplementation(() => [{ id: "mock-note-id" }]),
    then: vi.fn().mockImplementation((onFulfilled) => {
      return Promise.resolve([{ id: "mock-note-id", fileKey: "mock-file-key" }]).then(onFulfilled);
    }),
  } as any;

  it("exports handler initializers correctly", () => {
    expect(listFileNotesHandler).toBeDefined();
    expect(createFileNoteHandler).toBeDefined();
    expect(updateFileNoteCommentHandler).toBeDefined();
    expect(archiveFileNoteHandler).toBeDefined();
    expect(purgeFileNoteHandler).toBeDefined();
  });

  it("can list file notes", async () => {
    const listHandler = listFileNotesHandler(mockDb);
    mockDb.returning.mockImplementationOnce(() => []);
    const result = await listHandler(
      { entityType: "EXPENSE", entityId: "some-uuid", status: "ACTIVE" },
      "tenant-123"
    );
    expect(mockDb.select).toHaveBeenCalled();
    expect(mockDb.from).toHaveBeenCalled();
  });
});
