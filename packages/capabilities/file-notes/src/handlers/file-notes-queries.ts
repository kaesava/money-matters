import { eq, and, isNull, isNotNull, desc } from "drizzle-orm";
import { DbOrTx, fileNotes } from "@money-matters/db";
import { getPresignedUploadUrl, getPresignedDownloadUrl } from "../storage.js";
import { randomUUID } from "crypto";

const GLOBAL_MAX_FILE_SIZE_MB = parseInt(process.env.GLOBAL_MAX_FILE_SIZE_MB || "10", 10);

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
];

export function listFileNotesHandler(db: DbOrTx) {
  return async (
    input: { entityType: string; entityId: string; status: "ACTIVE" | "ARCHIVED" | "ALL" },
    tenantId: string
  ) => {
    const { entityType, entityId, status } = input;

    const filters = [
      eq(fileNotes.tenantId, tenantId),
      eq(fileNotes.entityType, entityType),
      eq(fileNotes.entityId, entityId),
    ];

    if (status === "ACTIVE") {
      filters.push(isNull(fileNotes.archivedAt));
    } else if (status === "ARCHIVED") {
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
  return async (id: string, tenantId: string, db: DbOrTx) => {
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

    const isAllowed = ALLOWED_FILE_TYPES.some((pattern) => {
      if (pattern.endsWith("/*")) {
        const prefix = pattern.slice(0, -2);
        return fileMimeType.startsWith(prefix);
      }
      return fileMimeType === pattern;
    });

    if (!isAllowed) {
      throw new Error(`File type '${fileMimeType}' is not allowed.`);
    }

    const uuid = randomUUID();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileKey = `tenants/${tenantId}/${entityType.toLowerCase()}/${entityId}/${uuid}-${sanitizedFileName}`;

    const uploadUrl = await getPresignedUploadUrl(fileKey, fileMimeType);

    return {
      fileKey,
      uploadUrl,
    };
  };
}
