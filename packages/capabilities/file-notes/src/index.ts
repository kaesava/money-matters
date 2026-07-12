import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { PgDatabase } from "drizzle-orm/pg-core";
import { fileNotes } from "@money-matters/db";
import { getPresignedUploadUrl, getPresignedDownloadUrl, deleteFileFromBucket } from "./storage.js";
import { randomUUID } from "crypto";

const GLOBAL_MAX_FILE_SIZE_MB = parseInt(process.env.GLOBAL_MAX_FILE_SIZE_MB || '10', 10);

export function listFileNotesHandler(db: PgDatabase<any, any, any>) {
  return async (
    input: { entityType: string; entityId: string; status: 'ACTIVE' | 'ARCHIVED' | 'ALL' },
    tenantId: string
  ) => {
    const { entityType, entityId, status } = input;

    const filters = [
      eq(fileNotes.tenantId, tenantId),
      eq(fileNotes.entityType, entityType),
      eq(fileNotes.entityId, entityId),
    ];

    if (status === 'ACTIVE') {
      filters.push(isNull(fileNotes.archivedAt));
    } else if (status === 'ARCHIVED') {
      filters.push(isNotNull(fileNotes.archivedAt));
    }

    return db
      .select()
      .from(fileNotes)
      .where(and(...filters))
      .orderBy(desc(fileNotes.createdAt));
  };
}

export function getFileNoteDownloadUrlHandler() {
  return async (id: string, tenantId: string, db: PgDatabase<any, any, any>) => {
    const [note] = await db
      .select()
      .from(fileNotes)
      .where(
        and(
          eq(fileNotes.id, id),
          eq(fileNotes.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!note || !note.fileKey) {
      throw new Error("Attachment not found");
    }

    const downloadUrl = await getPresignedDownloadUrl(note.fileKey);

    return {
      downloadUrl,
    };
  };
}

export function createPreSignedUploadUrlHandler() {
  return async (
    input: { entityType: string; entityId: string; fileName: string; fileMimeType: string; fileSize: number },
    tenantId: string
  ) => {
    const { entityType, entityId, fileName, fileMimeType, fileSize } = input;

    const maxBytes = GLOBAL_MAX_FILE_SIZE_MB * 1024 * 1024;
    if (fileSize > maxBytes) {
      throw new Error(`File size exceeds the limit of ${GLOBAL_MAX_FILE_SIZE_MB}MB.`);
    }

    const allowedFileTypes = [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif',
    ];

    const isAllowed = allowedFileTypes.some((pattern) => {
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -2);
        return fileMimeType.startsWith(prefix);
      }
      return fileMimeType === pattern;
    });

    if (!isAllowed) {
      throw new Error(`File type '${fileMimeType}' is not allowed.`);
    }

    const uuid = randomUUID();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `tenants/${tenantId}/${entityType.toLowerCase()}/${entityId}/${uuid}-${sanitizedFileName}`;

    const uploadUrl = await getPresignedUploadUrl(fileKey, fileMimeType);

    return {
      fileKey,
      uploadUrl,
    };
  };
}

export function createFileNoteHandler(db: PgDatabase<any, any, any>) {
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

export function updateFileNoteCommentHandler(db: PgDatabase<any, any, any>) {
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

export function archiveFileNoteHandler(db: PgDatabase<any, any, any>) {
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

export function restoreFileNoteHandler(db: PgDatabase<any, any, any>) {
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

export function purgeFileNoteHandler(db: PgDatabase<any, any, any>) {
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
