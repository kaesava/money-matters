import { tenantProcedure, authenticatedProcedure, privateOwnerProcedure, publicProcedure, privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { MONEY_MATTERS_APP_ID, clearEdgeContextCache } from '../../trpc/edge-context.js';
import { db, tenants, tenantUsers, earlyAccessSubscribers, apps } from "@money-matters/db";
import { and, eq, sql, asc, isNull } from "drizzle-orm";
import { inngest } from '../../inngest/client.js';
import { 
  createTenantHandler,
  cancelSetupHandler,
  getTenantHandler,
  exportDataHandler,
  deleteMyAccountHandler,
} from "@money-matters/capability-tenant";
import { CreateTenantCommand, DEFAULT_APP_FEATURE_FLAGS } from "@money-matters/types";
import { z } from 'zod';
import { posthog } from '../../lib/posthog.js';

export const tenantCoreProcedures = {
  createTenant: authenticatedProcedure
    .input(CreateTenantCommand)
    .mutation(async ({ input, ctx }) => {
      const appId = ctx.appId || ctx.session?.appId || MONEY_MATTERS_APP_ID;
      const handler = createTenantHandler(ctx.db || db);
      const result = await handler(input, appId, ctx.userId, ctx.email);
      clearEdgeContextCache();

      inngest.send({
        name: 'auth/user.signup',
        data: {
          userId: ctx.userId,
          email: ctx.email ?? '',
          displayName: undefined,
        },
      }).catch(() => {});

      if (posthog && ctx.userId) {
        posthog.identify({
          distinctId: ctx.userId,
          properties: {
            app_id: appId,
            has_tenant: true,
          },
        });
        posthog.capture({
          distinctId: ctx.userId,
          event: 'tenant_created',
          properties: {
            app_id: appId,
            has_tenant: true,
          },
        });
        await posthog.flush();
      }
      return result;
    }),

  getTenantStatus: authenticatedProcedure
    .query(async ({ ctx }) => {
      let setupCompleted = false;
      let setupStatus: "PENDING" | "CANCELLED" | "COMPLETED" = "PENDING";
      const appId = ctx.appId || MONEY_MATTERS_APP_ID;

      if (ctx.tenantId) {
        const [tenant] = await ctx.db
          .select({
            setupStatus: tenants.setupStatus,
            setupCompletedAt: tenants.setupCompletedAt,
          })
          .from(tenants)
          .where(eq(tenants.id, ctx.tenantId))
          .limit(1);

        setupStatus = (tenant?.setupStatus as "PENDING" | "CANCELLED" | "COMPLETED") || "PENDING";
        setupCompleted =
          setupStatus === "COMPLETED" ||
          setupStatus === "CANCELLED" ||
          Boolean(tenant?.setupCompletedAt);
      }

      const [appRecord] = await ctx.db
        .select({
          featureFlags: apps.featureFlags,
        })
        .from(apps)
        .where(eq(apps.id, appId))
        .limit(1);

      return {
        hasTenant: ctx.tenantId !== null,
        tenantId: ctx.tenantId,
        setupCompleted,
        setupStatus,
        features: {
          ...DEFAULT_APP_FEATURE_FLAGS,
          ...(appRecord?.featureFlags ?? {}),
        },
      };
    }),

  cancelSetup: privateTenantProcedure
    .mutation(async ({ ctx }) => {
      requiresWriteAccess(ctx);
      const appId = ctx.appId || MONEY_MATTERS_APP_ID;
      const handler = cancelSetupHandler(ctx.db);
      return await handler(ctx.tenantId!, appId, ctx.userId!);
    }),

  getTenant: tenantProcedure
    .query(async ({ ctx }) => {
      const handler = getTenantHandler(ctx.db);
      return await handler(ctx.tenantId!, ctx.appId!);
    }),

  exportMyData: privateTenantProcedure
    .query(async ({ ctx }) => {
      const handler = exportDataHandler(ctx.db);
      return await handler(ctx.tenantId!, ctx.userId!, ctx.appId!);
    }),

  deleteMyAccount: privateOwnerProcedure
    .mutation(async ({ ctx }) => {
      const handler = deleteMyAccountHandler(ctx.db);
      const result = await handler(ctx.tenantId!, ctx.userId!, ctx.email!, ctx.appId!);

      inngest.send({
        name: 'user/account.delete-requested',
        data: {
          userId: ctx.userId!,
          tenantId: ctx.tenantId ?? undefined,
          email: ctx.email ?? undefined,
        },
      }).catch(() => {});

      return result;
    }),

  listUserTenants: authenticatedProcedure
    .query(async ({ ctx }) => {
      const records = await ctx.db
        .select({
          id: tenants.id,
          name: tenants.name,
          role: tenantUsers.role,
        })
        .from(tenantUsers)
        .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
        .where(
          and(
            eq(tenantUsers.userId, ctx.userId!),
            eq(tenants.appId, ctx.appId || MONEY_MATTERS_APP_ID),
            eq(tenantUsers.inviteStatus, "ACCEPTED"),
            isNull(tenantUsers.archivedAt)
          )
        )
        .orderBy(
          sql`CASE WHEN ${tenantUsers.role} = 'OWNER' THEN 0 ELSE 1 END`,
          asc(tenantUsers.createdAt)
        );

      return records.map((r) => ({
        ...r,
        isCurrent: r.id === ctx.tenantId,
      }));
    }),

  switchTenant: authenticatedProcedure
    .input(z.object({ tenantId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      const [membership] = await ctx.db
        .select()
        .from(tenantUsers)
        .where(
          and(
            eq(tenantUsers.tenantId, input.tenantId),
            eq(tenantUsers.userId, ctx.userId!),
            eq(tenantUsers.inviteStatus, "ACCEPTED")
          )
        )
        .limit(1);

      if (!membership) {
        throw new Error("You do not have access to switch to this household.");
      }

      return { success: true, activeTenantId: input.tenantId };
    }),

  subscribeEarlyAccess: publicProcedure
    .input(z.object({ email: z.string().email() }).strict())
    .mutation(async ({ input, ctx }) => {
      const appId = ctx.appId ?? MONEY_MATTERS_APP_ID;
      const normalizedEmail = input.email.trim().toLowerCase();
      const now = new Date();

      await ctx.db
        .insert(earlyAccessSubscribers)
        .values({
          appId,
          email: normalizedEmail,
          lastSubscribedAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [earlyAccessSubscribers.appId, earlyAccessSubscribers.email],
          set: {
            lastSubscribedAt: now,
            updatedAt: now,
          },
        });

      return { success: true };
    }),

  checkEmailRegistered: publicProcedure
    .input(z.object({ email: z.string().email() }).strict())
    .mutation(async ({ input, ctx }) => {
      const normalizedEmail = input.email.trim().toLowerCase();
      const result = await ctx.db.execute<{ count: string | number }>(
        sql`SELECT count(*)::int as count FROM neon_auth.user WHERE LOWER(email) = ${normalizedEmail}`
      );
      const rows = Array.isArray(result) ? result : (result as { rows?: { count: string | number }[] }).rows ?? [];
      const count = Number(rows[0]?.count ?? 0);
      return { registered: count > 0 };
    }),
};
