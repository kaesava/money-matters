import { tenantProcedure, requiresWriteAccess, requiresPaidTier } from '../trpc/trpc.js';
import {
  listFileNotesHandler,
  getFileNoteDownloadUrlHandler,
  createPreSignedUploadUrlHandler,
  createFileNoteHandler,
  updateFileNoteCommentHandler,
  archiveFileNoteHandler,
  restoreFileNoteHandler,
  purgeFileNoteHandler
} from "@money-matters/capability-file-notes";
import { z } from 'zod';

export const fileNotesRouter = {
  listFileNotes: tenantProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string().uuid(),
        status: z.enum(['ACTIVE', 'ARCHIVED', 'ALL']).default('ACTIVE'),
      }).strict()
    )
    .query(async ({ ctx, input }) => {
      const handler = listFileNotesHandler(ctx.db);
      return await handler(input, ctx.tenantId!);
    }),

  getFileNoteDownloadUrl: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .query(async ({ ctx, input }) => {
      const handler = getFileNoteDownloadUrlHandler();
      return await handler(input.id, ctx.tenantId!, ctx.db);
    }),

  createPreSignedUploadUrl: tenantProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string().uuid(),
        fileName: z.string(),
        fileMimeType: z.string(),
        fileSize: z.number().int().min(1),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      requiresPaidTier(ctx, 'file_notes');
      const handler = createPreSignedUploadUrlHandler();
      return await handler(input, ctx.tenantId!);
    }),

  createFileNote: tenantProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string().uuid(),
        comment: z.string().max(2048).optional(),
        attachment: z
          .object({
            fileKey: z.string(),
            fileName: z.string(),
            fileMimeType: z.string(),
            fileSize: z.number().int(),
          }).strict()
          .optional(),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      requiresPaidTier(ctx, 'file_notes');
      const handler = createFileNoteHandler(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  updateFileNoteComment: tenantProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        comment: z.string().max(2048),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      const handler = updateFileNoteCommentHandler(ctx.db);
      return await handler(input, ctx.tenantId!, ctx.userId!);
    }),

  archiveFileNote: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      const handler = archiveFileNoteHandler(ctx.db);
      return await handler(input.id, ctx.tenantId!, ctx.userId!);
    }),

  restoreFileNote: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      const handler = restoreFileNoteHandler(ctx.db);
      return await handler(input.id, ctx.tenantId!, ctx.userId!);
    }),

  purgeFileNote: tenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      const handler = purgeFileNoteHandler(ctx.db);
      return await handler(input.id, ctx.tenantId!);
    }),
};
