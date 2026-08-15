import { eq, and } from "drizzle-orm";
import { DbOrTx, fileNotes } from "@money-matters/db";
import { deleteFileFromBucket } from "../storage.js";

export function createFileNoteHandler(db: DbOrTx) {
  return async (
    input: {
      entityType: string;
      entityId: string;
      comment?: string;
      attachment?: {
        fileKey: string;
        fileName: string;
        fileMimeType: string;
        fileSize: number;
      };
    },
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    const { entityType, entityId, comment, attachment } = input;

    if (!comment && !attachment) {
      throw new Error("Empty notes are not allowed");
    }

    const now = new Date();

    const [newNote] = await db
      .insert(fileNotes)
      .values({
        tenantId,
        appId,
        entityType,
        entityId,
        comment: comment || null,
        fileKey: attachment?.fileKey || null,
        fileName: attachment?.fileName || null,
        fileMimeType: attachment?.fileMimeType || null,
        fileSize: attachment?.fileSize ? String(attachment.fileSize) : null,
        createdAt: now,
        createdBy: userId,
        updatedAt: now,
        updatedBy: userId,
      })
      .returning();

    return newNote;
  };
}

export function updateFileNoteCommentHandler(db: DbOrTx) {
  return async (
    input: { id: string; comment: string },
    tenantId: string,
    userId: string
  ) => {
    const [existing] = await db
      .select()
      .from(fileNotes)
      .where(
        and(
          eq(fileNotes.id, input.id),
          eq(fileNotes.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error("File note not found");
    }

    const [updated] = await db
      .update(fileNotes)
      .set({
        comment: input.comment,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(fileNotes.id, input.id))
      .returning();

    return updated;
  };
}

export function archiveFileNoteHandler(db: DbOrTx) {
  return async (id: string, tenantId: string, userId: string) => {
    const [existing] = await db
      .select()
      .from(fileNotes)
      .where(
        and(
          eq(fileNotes.id, id),
          eq(fileNotes.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error("File note not found");
    }

    const [archived] = await db
      .update(fileNotes)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(fileNotes.id, id))
      .returning();

    return { success: true, archived };
  };
}

export function restoreFileNoteHandler(db: DbOrTx) {
  return async (id: string, tenantId: string, userId: string) => {
    const [existing] = await db
      .select()
      .from(fileNotes)
      .where(
        and(
          eq(fileNotes.id, id),
          eq(fileNotes.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error("File note not found");
    }

    const [restored] = await db
      .update(fileNotes)
      .set({
        archivedAt: null,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(fileNotes.id, id))
      .returning();

    return { success: true, restored };
  };
}

export function purgeFileNoteHandler(db: DbOrTx) {
  return async (id: string, tenantId: string) => {
    const [existing] = await db
      .select()
      .from(fileNotes)
      .where(
        and(
          eq(fileNotes.id, id),
          eq(fileNotes.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!existing) {
      throw new Error("File note not found");
    }

    if (existing.fileKey) {
      await deleteFileFromBucket(existing.fileKey);
    }

    await db.delete(fileNotes).where(eq(fileNotes.id, id));

    return { success: true, purgedId: id };
  };
}
