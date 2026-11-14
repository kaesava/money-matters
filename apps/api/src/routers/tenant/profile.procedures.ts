import { privateTenantProcedure, authenticatedProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { MONEY_MATTERS_APP_ID } from '../../trpc/edge-context.js';
import {
  getUserPreferencesHandler,
  updateUserPreferencesHandler,
  getUserProfileHandler,
  updateUserProfileHandler,
} from "@money-matters/capability-tenant";
import { z } from 'zod';

export const profileProcedures = {
  getUserPreferences: privateTenantProcedure
    .query(({ ctx }) =>
      getUserPreferencesHandler(ctx.userId!, ctx.tenantId!, ctx.appId || MONEY_MATTERS_APP_ID, ctx.db)
    ),

  updateUserPreferences: privateTenantProcedure
    .input(
      z.object({
        timezone: z.string().optional(),
        language: z.enum(["en"]).optional(),
        theme: z.string().optional(),
        showIcons: z.boolean().optional(),
        setupCompleted: z.boolean().optional(),
        appPreferences: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
      }).strict()
    )
    .mutation(({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return updateUserPreferencesHandler(input, ctx.userId!, ctx.tenantId!, ctx.appId || MONEY_MATTERS_APP_ID, ctx.db);
    }),

  getUserProfile: authenticatedProcedure
    .query(({ ctx }) => getUserProfileHandler(ctx.userId!, ctx.tenantId, ctx.db)),

  updateUserProfile: authenticatedProcedure
    .input(
      z.object({
        displayName: z.string().min(1, "Name is required"),
        notificationEmail: z.string().email("Invalid email address"),
        phoneCountryCode: z.string().optional(),
        phoneNumber: z.string().optional(),
        avatarUrl: z.string().max(300_000, "Avatar payload exceeds maximum allowed size of 200KB").optional(),
      }).strict()
    )
    .mutation(({ input, ctx }) => updateUserProfileHandler(input, ctx.userId!, ctx.db)),
};
