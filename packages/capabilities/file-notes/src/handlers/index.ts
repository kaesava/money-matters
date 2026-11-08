import { TRPCError } from "@trpc/server";
import { eq, and, isNull, isNotNull, desc, sql } from "drizzle-orm";
import { fileNotes, bankAccounts, envelopes, users, apps, DbOrTx } from "@money-matters/db";
import {
  CreatePreSignedUrlInput,
  CreateFileNoteInput,
  UpdateFileNoteCommentInput,
  FileNotesListInput,
  FileNoteDto,
  StorageQuotaDto,
  DEFAULT_APP_FEATURE_FLAGS,
  AppFeatureFlags,
} from "@money-matters/types";
import { getPresignedUploadUrl, getPresignedDownloadUrl, deleteFileFromBucket } from "../storage.js";

export interface FileNotesContext {
  tenantId: string;
  userId: string;
  appId: string;
}

async function getAppFlags(db: DbOrTx, appId: string): Promise<AppFeatureFlags> {
  const [appRecord] = await db
    .select({ featureFlags: apps.featureFlags })
    .from(apps)
    .where(eq(apps.id, appId))
    .limit(1);

  return appRecord?.featureFlags || DEFAULT_APP_FEATURE_FLAGS;
}

async function resolveEntityPrivacy(
  db: DbOrTx,
  ctx: FileNotesContext,
  entityType: "ENVELOPE" | "BANK_ACCOUNT",
  entityId: string
): Promise<{ exists: boolean; isPrivate: boolean; ownerUserId: string | null }> {
  if (entityType === "BANK_ACCOUNT") {
    const [acc] = await db
      .select({ id: bankAccounts.id, isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, entityId), eq(bankAccounts.tenantId, ctx.tenantId), isNull(bankAccounts.archivedAt)))
      .limit(1);

    if (!acc) return { exists: false, isPrivate: false, ownerUserId: null };
    return { exists: true, isPrivate: acc.isPrivate, ownerUserId: acc.userId };
  } else {
    const [env] = await db
      .select({ id: envelopes.id, isPrivate: envelopes.isPrivate, userId: envelopes.userId })
      .from(envelopes)
      .where(and(eq(envelopes.id, entityId), eq(envelopes.tenantId, ctx.tenantId), isNull(envelopes.archivedAt)))
      .limit(1);

    if (!env) return { exists: false, isPrivate: false, ownerUserId: null };
    return { exists: true, isPrivate: env.isPrivate, ownerUserId: env.userId };
  }
}

export async function createPreSignedUrlHandler(
  db: DbOrTx,
  ctx: FileNotesContext,
  input: CreatePreSignedUrlInput
): Promise<{ fileKey: string; uploadUrl: string }> {
  const flags = await getAppFlags(db, ctx.appId);
  if (!flags.fileNotes) {
    throw new TRPCError({ code: "FORBIDDEN", message: "file_notes_disabled" });
  }

  const maxFileBytes = flags.fileNotesMaxFileMb * 1024 * 1024;
  if (input.fileSize > maxFileBytes) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `File size exceeds the limit of ${flags.fileNotesMaxFileMb}MB`,
    });
  }

  // Quota enforcement: compute tenant storage
  const [usage] = await db
    .select({
      totalBytes: sql<string>`COALESCE(SUM(CAST(${fileNotes.fileSize} AS BIGINT)), 0)`,
    })
    .from(fileNotes)
    .where(and(eq(fileNotes.tenantId, ctx.tenantId), isNotNull(fileNotes.fileKey)));

  const currentBytes = Number(usage?.totalBytes || 0);
  const maxStorageBytes = flags.fileNotesMaxStorageMb * 1024 * 1024;
  if (currentBytes + input.fileSize > maxStorageBytes) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "storage_quota_exceeded",
    });
  }

  // Verify entity access
  const entityInfo = await resolveEntityPrivacy(db, ctx, input.entityType, input.entityId);
  if (!entityInfo.exists) {
    throw new TRPCError({ code: "NOT_FOUND", message: "target_entity_not_found" });
  }
  if (entityInfo.isPrivate && entityInfo.ownerUserId && entityInfo.ownerUserId !== ctx.userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "private_entity_unauthorized" });
  }

  const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueId = crypto.randomUUID();
  const fileKey = `tenants/${ctx.tenantId}/${input.entityType.toLowerCase()}/${input.entityId}/${uniqueId}-${sanitizedFileName}`;

  const uploadUrl = await getPresignedUploadUrl(fileKey, input.fileMimeType);
  return { fileKey, uploadUrl };
}

export async function createFileNoteHandler(
  db: DbOrTx,
  ctx: FileNotesContext,
  input: CreateFileNoteInput
): Promise<FileNoteDto> {
  const flags = await getAppFlags(db, ctx.appId);
  if (!flags.fileNotes) {
    throw new TRPCError({ code: "FORBIDDEN", message: "file_notes_disabled" });
  }

  const entityInfo = await resolveEntityPrivacy(db, ctx, input.entityType, input.entityId);
  if (!entityInfo.exists) {
    throw new TRPCError({ code: "NOT_FOUND", message: "target_entity_not_found" });
  }
  if (entityInfo.isPrivate && entityInfo.ownerUserId && entityInfo.ownerUserId !== ctx.userId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "private_entity_unauthorized" });
  }

  const isPrivate = entityInfo.isPrivate;
  const noteUserId = isPrivate ? ctx.userId : null;
  const now = new Date();

  const [created] = await db
    .insert(fileNotes)
    .values({
      id: crypto.randomUUID(),
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      entityType: input.entityType,
      entityId: input.entityId,
      comment: input.comment || null,
      fileKey: input.attachment?.fileKey || null,
      fileName: input.attachment?.fileName || null,
      fileMimeType: input.attachment?.fileMimeType || null,
      fileSize: input.attachment?.fileSize ? String(input.attachment.fileSize) : null,
      isPrivate,
      userId: noteUserId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();

  return {
    id: created.id,
    tenantId: created.tenantId,
    appId: created.appId,
    entityType: created.entityType as "ENVELOPE" | "BANK_ACCOUNT",
    entityId: created.entityId,
    comment: created.comment,
    fileKey: created.fileKey,
    fileName: created.fileName,
    fileMimeType: created.fileMimeType,
    fileSize: created.fileSize,
    isPrivate: created.isPrivate,
    userId: created.userId,
    createdAt: created.createdAt,
    createdBy: created.createdBy,
    updatedAt: created.updatedAt,
    updatedBy: created.updatedBy,
    archivedAt: created.archivedAt,
  };
}

export async function listFileNotesHandler(
  db: DbOrTx,
  ctx: FileNotesContext,
  input: FileNotesListInput
): Promise<FileNoteDto[]> {
  const flags = await getAppFlags(db, ctx.appId);
  if (!flags.fileNotes) {
    return [];
  }

  const conditions = [
    eq(fileNotes.tenantId, ctx.tenantId),
    eq(fileNotes.entityType, input.entityType),
    eq(fileNotes.entityId, input.entityId),
  ];

  if (input.status === "ACTIVE") {
    conditions.push(isNull(fileNotes.archivedAt));
  } else if (input.status === "ARCHIVED") {
    conditions.push(isNotNull(fileNotes.archivedAt));
  }

  const rows = await db
    .select({
      note: fileNotes,
      creatorName: users.displayName,
      creatorEmail: users.email,
    })
    .from(fileNotes)
    .leftJoin(users, eq(fileNotes.createdBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(fileNotes.createdAt));

  return rows.map(({ note, creatorName, creatorEmail }) => ({
    id: note.id,
    tenantId: note.tenantId,
    appId: note.appId,
    entityType: note.entityType as "ENVELOPE" | "BANK_ACCOUNT",
    entityId: note.entityId,
    comment: note.comment,
    fileKey: note.fileKey,
    fileName: note.fileName,
    fileMimeType: note.fileMimeType,
    fileSize: note.fileSize,
    isPrivate: note.isPrivate,
    userId: note.userId,
    createdAt: note.createdAt,
    createdBy: note.createdBy,
    updatedAt: note.updatedAt,
    updatedBy: note.updatedBy,
    archivedAt: note.archivedAt,
    creatorName: creatorName || creatorEmail || "Household Member",
  }));
}

export async function getDownloadUrlHandler(
  db: DbOrTx,
  ctx: FileNotesContext,
  id: string
): Promise<{ downloadUrl: string }> {
  const [note] = await db
    .select()
    .from(fileNotes)
    .where(and(eq(fileNotes.id, id), eq(fileNotes.tenantId, ctx.tenantId)))
    .limit(1);

  if (!note || !note.fileKey) {
    throw new TRPCError({ code: "NOT_FOUND", message: "attachmentNotFound" });
  }

  const downloadUrl = await getPresignedDownloadUrl(note.fileKey);
  return { downloadUrl };
}

export async function updateFileNoteCommentHandler(
  db: DbOrTx,
  ctx: FileNotesContext,
  input: UpdateFileNoteCommentInput
): Promise<FileNoteDto> {
  const [existing] = await db
    .select()
    .from(fileNotes)
    .where(and(eq(fileNotes.id, input.id), eq(fileNotes.tenantId, ctx.tenantId), isNull(fileNotes.archivedAt)))
    .limit(1);

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "fileNoteNotFound" });
  }

  const [updated] = await db
    .update(fileNotes)
    .set({
      comment: input.comment,
      updatedAt: new Date(),
      updatedBy: ctx.userId,
    })
    .where(eq(fileNotes.id, input.id))
    .returning();

  return {
    id: updated.id,
    tenantId: updated.tenantId,
    appId: updated.appId,
    entityType: updated.entityType as "ENVELOPE" | "BANK_ACCOUNT",
    entityId: updated.entityId,
    comment: updated.comment,
    fileKey: updated.fileKey,
    fileName: updated.fileName,
    fileMimeType: updated.fileMimeType,
    fileSize: updated.fileSize,
    isPrivate: updated.isPrivate,
    userId: updated.userId,
    createdAt: updated.createdAt,
    createdBy: updated.createdBy,
    updatedAt: updated.updatedAt,
    updatedBy: updated.updatedBy,
    archivedAt: updated.archivedAt,
  };
}

export async function archiveFileNoteHandler(
  db: DbOrTx,
  ctx: FileNotesContext,
  id: string
): Promise<{ success: boolean }> {
  const [existing] = await db
    .select()
    .from(fileNotes)
    .where(and(eq(fileNotes.id, id), eq(fileNotes.tenantId, ctx.tenantId), isNull(fileNotes.archivedAt)))
    .limit(1);

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "fileNoteNotFound" });
  }

  await db
    .update(fileNotes)
    .set({
      archivedAt: new Date(),
      archivedBy: ctx.userId,
    })
    .where(eq(fileNotes.id, id));

  return { success: true };
}

export async function purgeFileNoteHandler(
  db: DbOrTx,
  ctx: FileNotesContext,
  id: string
): Promise<{ success: boolean; purgedId: string }> {
  const [existing] = await db
    .select()
    .from(fileNotes)
    .where(and(eq(fileNotes.id, id), eq(fileNotes.tenantId, ctx.tenantId)))
    .limit(1);

  if (!existing) {
    throw new TRPCError({ code: "NOT_FOUND", message: "fileNoteNotFound" });
  }

  if (existing.fileKey) {
    await deleteFileFromBucket(existing.fileKey);
  }

  await db.delete(fileNotes).where(eq(fileNotes.id, id));
  return { success: true, purgedId: id };
}

export async function getStorageQuotaHandler(
  db: DbOrTx,
  ctx: FileNotesContext
): Promise<StorageQuotaDto> {
  const flags = await getAppFlags(db, ctx.appId);

  const [usage] = await db
    .select({
      totalBytes: sql<string>`COALESCE(SUM(CAST(${fileNotes.fileSize} AS BIGINT)), 0)`,
    })
    .from(fileNotes)
    .where(and(eq(fileNotes.tenantId, ctx.tenantId), isNotNull(fileNotes.fileKey)));

  return {
    usedBytes: Number(usage?.totalBytes || 0),
    maxBytes: flags.fileNotesMaxStorageMb * 1024 * 1024,
    maxFileBytes: flags.fileNotesMaxFileMb * 1024 * 1024,
  };
}
