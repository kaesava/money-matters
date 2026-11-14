import { tenantProcedure, authenticatedProcedure, ownerProcedure, privateOwnerProcedure, privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { apps } from "@money-matters/db";
import { eq } from "drizzle-orm";
import { inngest } from '../../inngest/client.js';
import { logAuditEvent, sendEmail } from '@money-matters/core';
import { t } from '@money-matters/i18n';
import {
  invitePartnerHandler,
  acceptInviteHandler,
  leaveTenantHandler,
  updateHouseholdMemberRoleHandler,
  getHouseholdGovernanceInfoHandler,
  removeHouseholdMemberHandler,
  updateHouseholdHandler,
} from "@money-matters/capability-tenant";
import { UpdateHouseholdMemberRoleCommand, DEFAULT_APP_FEATURE_FLAGS } from "@money-matters/types";
import { clearEdgeContextCache } from '../../trpc/edge-context.js';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { posthog } from '../../lib/posthog.js';

export const householdProcedures = {
  invitePartner: ownerProcedure
    .input(z.object({ email: z.string().email() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

      const [appRecord] = await ctx.db.select({ featureFlags: apps.featureFlags }).from(apps).where(eq(apps.id, ctx.appId!)).limit(1);
      const flags = appRecord?.featureFlags || DEFAULT_APP_FEATURE_FLAGS;
      if (!flags.privateMode) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Partner invitations are disabled for this application." });
      }

      const handler = invitePartnerHandler(ctx.db);
      const result = await handler(input, ctx.tenantId!, ctx.userId!);

      inngest.send({
        name: 'partner/invited',
        data: { email: input.email, inviteToken: result.inviteToken, tenantId: ctx.tenantId!, senderUserId: ctx.userId! },
      }).catch(() => {});

      const inviteUrl = `https://moneymatters.kaesava.au/invite/${result.inviteToken}`;
      const inviteHtml = `
        <div style="font-family: sans-serif; background-color: #0b132b; color: #ffffff; padding: 40px; border-radius: 16px;">
          <h2 style="color: #ffffff;">${t('notifications.inngest.inviteSubject')}</h2>
          <p style="font-size: 16px; line-height: 1.6;">${t('notifications.inngest.inviteBody')}</p>
          <div style="margin-top: 30px;">
            <a href="${inviteUrl}" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; display: inline-block;">${t('notifications.inngest.joinHouseholdCta')}</a>
          </div>
        </div>
      `;

      sendEmail({ to: input.email, subject: t('notifications.inngest.inviteSubject'), html: inviteHtml }).catch((err) => {
        console.error('Direct partner invite email send failed:', err);
      });

      logAuditEvent('partner_invited', ctx.tenantId!, ctx.userId!, { inviteEmail: input.email });
      if (posthog && ctx.userId) {
        posthog.capture({ distinctId: ctx.userId, event: 'partner_invited', properties: { tenant_id: ctx.tenantId } });
        await posthog.flush();
      }

      return { success: true, email: input.email, inviteEmail: input.email, inviteToken: result.inviteToken, expiresAt: result.expiresAt };
    }),

  acceptInvite: authenticatedProcedure
    .input(z.object({ inviteToken: z.string().min(1) }).strict())
    .mutation(async ({ input, ctx }) => {
      const handler = acceptInviteHandler(ctx.db);
      const result = await handler(input, ctx.userId!, ctx.email ?? undefined);
      if (posthog && ctx.userId) {
        posthog.capture({ distinctId: ctx.userId, event: 'partner_invite_accepted', properties: {} });
        await posthog.flush();
      }
      return result;
    }),

  leaveMyHousehold: privateTenantProcedure
    .mutation(async ({ ctx }) => {
      const handler = leaveTenantHandler(ctx.db);
      return await handler(ctx.tenantId!, ctx.userId!, ctx.email!, ctx.appId!);
    }),

  getHouseholdGovernanceInfo: tenantProcedure
    .query(({ ctx }) => getHouseholdGovernanceInfoHandler(ctx.tenantId!, ctx.userId!, ctx.db)),

  removeHouseholdMember: privateOwnerProcedure
    .input(z.object({ targetUserId: z.string().optional(), memberId: z.string().optional() }).strict())
    .mutation(({ ctx, input }) => removeHouseholdMemberHandler(input, ctx.tenantId!, ctx.userId!, ctx.db)),

  updateHousehold: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1, "Household name is required"),
        country: z.string().optional(),
        currency: z.string().length(3).optional(),
        timezone: z.string().optional(),
        state: z.string().optional(),
        postcode: z.string().optional(),
      }).strict()
    )
    .mutation(({ ctx, input }) => updateHouseholdHandler(input, ctx.tenantId!, ctx.userId!, ctx.db)),

  updateHouseholdMemberRole: privateOwnerProcedure
    .input(UpdateHouseholdMemberRoleCommand)
    .mutation(async ({ ctx, input }) => {
      requiresWriteAccess(ctx);
      const handler = updateHouseholdMemberRoleHandler(ctx.db);
      const result = await handler(input, ctx.tenantId!, ctx.userId!);
      clearEdgeContextCache();
      return result;
    }),
};
