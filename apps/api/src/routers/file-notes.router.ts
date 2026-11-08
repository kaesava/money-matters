import { z } from "zod";
import { router, privateTenantProcedure } from "../trpc/trpc.js";
import {
  CreatePreSignedUrlInput,
  CreateFileNoteInput,
  UpdateFileNoteCommentInput,
  FileNotesListInput,
  FileNoteDto,
  StorageQuotaDto,
} from "@money-matters/types";
import {
  createPreSignedUrlHandler,
  createFileNoteHandler,
  listFileNotesHandler,
  getDownloadUrlHandler,
  updateFileNoteCommentHandler,
  archiveFileNoteHandler,
  purgeFileNoteHandler,
  getStorageQuotaHandler,
} from "@money-matters/capability-file-notes";

export const fileNotesRouter = router({
  createPreSignedUrl: privateTenantProcedure
    .input(CreatePreSignedUrlInput)
    .mutation(async ({ ctx, input }) => {
      return createPreSignedUrlHandler(ctx.db, {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        appId: ctx.appId,
      }, input);
    }),

  create: privateTenantProcedure
    .input(CreateFileNoteInput)
    .output(FileNoteDto)
    .mutation(async ({ ctx, input }) => {
      return createFileNoteHandler(ctx.db, {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        appId: ctx.appId,
      }, input);
    }),

  list: privateTenantProcedure
    .input(FileNotesListInput)
    .output(z.array(FileNoteDto))
    .query(async ({ ctx, input }) => {
      return listFileNotesHandler(ctx.db, {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        appId: ctx.appId,
      }, input);
    }),

  getDownloadUrl: privateTenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .query(async ({ ctx, input }) => {
      return getDownloadUrlHandler(ctx.db, {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        appId: ctx.appId,
      }, input.id);
    }),

  updateComment: privateTenantProcedure
    .input(UpdateFileNoteCommentInput)
    .output(FileNoteDto)
    .mutation(async ({ ctx, input }) => {
      return updateFileNoteCommentHandler(ctx.db, {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        appId: ctx.appId,
      }, input);
    }),

  archive: privateTenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      return archiveFileNoteHandler(ctx.db, {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        appId: ctx.appId,
      }, input.id);
    }),

  purge: privateTenantProcedure
    .input(z.object({ id: z.string().uuid() }).strict())
    .mutation(async ({ ctx, input }) => {
      return purgeFileNoteHandler(ctx.db, {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        appId: ctx.appId,
      }, input.id);
    }),

  getStorageQuota: privateTenantProcedure
    .output(StorageQuotaDto)
    .query(async ({ ctx }) => {
      return getStorageQuotaHandler(ctx.db, {
        tenantId: ctx.tenantId,
        userId: ctx.userId,
        appId: ctx.appId,
      });
    }),
});
