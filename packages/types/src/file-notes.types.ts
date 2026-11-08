import { z } from "zod";
import { BaseSchema } from "./tenant.types.js";

export const AppFeatureFlagsSchema = z.object({
  aiAssistant: z.boolean(),
  privateMode: z.boolean(),
  fileNotes: z.boolean(),
  fileNotesMaxStorageMb: z.number().int().positive(),
  fileNotesMaxFileMb: z.number().int().positive(),
}).strict();

export type AppFeatureFlags = z.infer<typeof AppFeatureFlagsSchema>;

export const DEFAULT_APP_FEATURE_FLAGS: AppFeatureFlags = {
  aiAssistant: true,
  privateMode: true,
  fileNotes: true,
  fileNotesMaxStorageMb: 100,
  fileNotesMaxFileMb: 10,
};

export const StorageQuotaDto = z.object({
  usedBytes: z.number().int().nonnegative(),
  maxBytes: z.number().int().positive(),
  maxFileBytes: z.number().int().positive(),
}).strict();

export type StorageQuotaDto = z.infer<typeof StorageQuotaDto>;

export const FileNoteEntityTypeEnum = z.enum(["ENVELOPE", "BANK_ACCOUNT"]);
export type FileNoteEntityType = z.infer<typeof FileNoteEntityTypeEnum>;

export const CreatePreSignedUrlInput = z.object({
  entityType: FileNoteEntityTypeEnum,
  entityId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  fileMimeType: z.string().min(1).max(100),
  fileSize: z.number().int().positive(),
}).strict();

export type CreatePreSignedUrlInput = z.infer<typeof CreatePreSignedUrlInput>;

export const FileNoteAttachmentInput = z.object({
  fileKey: z.string().min(1).max(512),
  fileName: z.string().min(1).max(255),
  fileMimeType: z.string().min(1).max(100),
  fileSize: z.number().int().positive(),
}).strict();

export type FileNoteAttachmentInput = z.infer<typeof FileNoteAttachmentInput>;

export const CreateFileNoteInput = z.object({
  entityType: FileNoteEntityTypeEnum,
  entityId: z.string().uuid(),
  comment: z.string().max(2048).optional(),
  attachment: FileNoteAttachmentInput.optional(),
}).strict().refine((data) => Boolean(data.comment || data.attachment), {
  message: "Either comment or attachment must be provided",
});

export type CreateFileNoteInput = z.infer<typeof CreateFileNoteInput>;

export const UpdateFileNoteCommentInput = z.object({
  id: z.string().uuid(),
  comment: z.string().min(1).max(2048),
}).strict();

export type UpdateFileNoteCommentInput = z.infer<typeof UpdateFileNoteCommentInput>;

export const FileNotesListInput = z.object({
  entityType: FileNoteEntityTypeEnum,
  entityId: z.string().uuid(),
  status: z.enum(["ACTIVE", "ARCHIVED", "ALL"]).default("ACTIVE"),
}).strict();

export type FileNotesListInput = z.infer<typeof FileNotesListInput>;

export const FileNoteDto = BaseSchema.extend({
  tenantId: z.string().uuid(),
  appId: z.string().uuid(),
  entityType: FileNoteEntityTypeEnum,
  entityId: z.string().uuid(),
  comment: z.string().nullable().optional(),
  fileKey: z.string().nullable().optional(),
  fileName: z.string().nullable().optional(),
  fileMimeType: z.string().nullable().optional(),
  fileSize: z.string().nullable().optional(),
  isPrivate: z.boolean(),
  userId: z.string().uuid().nullable().optional(),
  creatorName: z.string().optional(),
}).strict();

export type FileNoteDto = z.infer<typeof FileNoteDto>;
