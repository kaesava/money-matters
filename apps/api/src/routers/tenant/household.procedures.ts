import { tenantProcedure, authenticatedProcedure, ownerProcedure, privateOwnerProcedure, privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { tenants, tenantUsers, users, bankAccounts, envelopes, tenantUserPreferences } from "@money-matters/db";
import { and, eq, sql, inArray } from "drizzle-orm";
import { inngest } from '../../inngest/client.js';
import { logAuditEvent, sendEmail } from '@money-matters/core';
import { t } from '@money-matters/i18n';
import { 
  invitePartnerHandler,
  acceptInviteHandler,
  leaveTenantHandler,
} from "@money-matters/capability-tenant";
import { z } from 'zod';
import { posthog } from '../../lib/posthog.js';

interface DbMember {
  id: string;
  userId: string | null;
  role: string | null;
  inviteEmail: string | null;
  inviteStatus: string | null;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
}

function resolveLeaveWarning(
  myMember: DbMember | undefined,
  otherMembers: DbMember[],
  partnerMember: DbMember | undefined,
  tenantName: string
) {
  if (myMember?.role !== "OWNER") {
    return {
      key: "privacy.leaveMemberWarning",
      params: {
        householdName: tenantName,
        email: partnerMember?.inviteEmail ?? partnerMember?.email ?? "the owner",
      },
    };
  }
  if (otherMembers.length <= 1) {
    const targetEmail =
      otherMembers[0]?.email ||
      otherMembers[0]?.displayName ||
      partnerMember?.inviteEmail ||
      partnerMember?.email ||
      "your partner";
    return {
      key: "privacy.leaveOwnerSingleMemberWarning",
      params: { email: targetEmail },
    };
  }
  const successor = otherMembers[0]?.email || otherMembers[0]?.displayName || "the next member";
  return {
    key: "privacy.leaveOwnerMultiMemberWarning",
    params: {
      successor,
      count: otherMembers.length,
    },
  };
}

function resolveDeleteWarning(partnerMember: DbMember | undefined, otherMembersCount: number) {
  if (!partnerMember) return null;
  if (otherMembersCount > 1) {
    return { key: "privacy.deleteMultiPartnerWarning" };
  }
  return {
    key: "privacy.deletePartnerWarning",
    params: { email: partnerMember.inviteEmail ?? partnerMember.email ?? "" },
  };
}

export const householdProcedures = {
  invitePartner: ownerProcedure
    .input(z.object({ email: z.string().email() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const handler = invitePartnerHandler(ctx.db);
      const result = await handler(input, ctx.tenantId!, ctx.userId!);

      inngest.send({
        name: 'partner/invited',
        data: {
          email: input.email,
          inviteToken: result.inviteToken,
          tenantId: ctx.tenantId!,
          senderUserId: ctx.userId!,
        },
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

      sendEmail({
        to: input.email,
        subject: t('notifications.inngest.inviteSubject'),
        html: inviteHtml,
      }).catch((err) => {
        console.error('Direct partner invite email send failed:', err);
      });

      logAuditEvent('partner_invited', ctx.tenantId!, ctx.userId!, { inviteEmail: input.email });

      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'partner_invited',
          properties: {
            tenant_id: ctx.tenantId,
          },
        });
        await posthog.flush();
      }

      return {
        success: true,
        email: input.email,
        inviteEmail: input.email,
        inviteToken: result.inviteToken,
        expiresAt: result.expiresAt,
      };
    }),

  acceptInvite: authenticatedProcedure
    .input(z.object({ inviteToken: z.string().min(1) }).strict())
    .mutation(async ({ input, ctx }) => {
      const handler = acceptInviteHandler(ctx.db);
      const result = await handler(input, ctx.userId!, ctx.email ?? undefined);
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'partner_invite_accepted',
          properties: {},
        });
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
    .query(async ({ ctx }) => {
      const [tenant] = await ctx.db
        .select()
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId!))
        .limit(1);

      const dbMembers = await ctx.db
        .select({
          id: tenantUsers.id,
          userId: tenantUsers.userId,
          role: tenantUsers.role,
          inviteEmail: tenantUsers.inviteEmail,
          inviteStatus: tenantUsers.inviteStatus,
          displayName: users.displayName,
          email: users.email,
          avatarUrl: users.avatarUrl,
        })
        .from(tenantUsers)
        .leftJoin(users, eq(tenantUsers.userId, users.id))
        .where(and(eq(tenantUsers.tenantId, ctx.tenantId!), sql`${tenantUsers.archivedAt} IS NULL`));

      const myMember = dbMembers.find((m) => m.userId === ctx.userId);
      const partnerMember = dbMembers.find((m) => m.userId !== ctx.userId);

      const membersList = dbMembers.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.displayName || m.email || m.inviteEmail || "Household Member",
        email: m.email || m.inviteEmail || "",
        avatarUrl: m.avatarUrl || null,
        role: m.role || "MEMBER",
        isOwner: m.role === "OWNER",
        inviteStatus: m.inviteStatus || "ACCEPTED",
        isPending: m.inviteStatus === "PENDING",
      }));

      const otherMembers = dbMembers.filter((m) => m.userId !== ctx.userId && m.role !== "OWNER");
      const leaveWarning = resolveLeaveWarning(myMember, otherMembers, partnerMember, tenant?.name ?? "Household");
      const deleteWarning = resolveDeleteWarning(partnerMember, otherMembers.length);

      return {
        householdId: ctx.tenantId!,
        householdName: tenant?.name ?? "Household",
        userRole: myMember?.role ?? "MEMBER",
        isOwner: myMember?.role === "OWNER",
        isSoleOwner: myMember?.role === "OWNER" && dbMembers.length <= 1,
        memberCount: dbMembers.length,
        partnerEmail: partnerMember?.inviteEmail ?? partnerMember?.email ?? null,
        country: tenant?.country ?? "AU",
        currency: tenant?.currency ?? "AUD",
        timezone: tenant?.timezone ?? "Australia/Sydney",
        state: tenant?.state ?? null,
        postcode: tenant?.postcode ?? null,
        membersList,
        leaveWarning,
        deleteWarning,
      };
    }),

  removeHouseholdMember: privateOwnerProcedure
    .input(
      z.object({
        targetUserId: z.string().optional(),
        memberId: z.string().optional(),
      }).strict()
    )
    .mutation(async ({ ctx, input }) => {
      const [caller] = await ctx.db
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, ctx.tenantId!), eq(tenantUsers.userId, ctx.userId!), sql`${tenantUsers.archivedAt} IS NULL`));

      if (caller?.role !== "OWNER") {
        throw new Error("Only the household owner can remove members.");
      }

      if (input.targetUserId && input.targetUserId === ctx.userId) {
        throw new Error("You cannot remove yourself using member removal.");
      }

      const memberFilter = input.memberId
        ? eq(tenantUsers.id, input.memberId)
        : input.targetUserId
        ? eq(tenantUsers.userId, input.targetUserId)
        : null;

      if (!memberFilter) {
        throw new Error("Target member ID or User ID is required.");
      }

      const [targetMember] = await ctx.db
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, ctx.tenantId!), memberFilter));

      if (targetMember?.userId) {
        const targetUserId = targetMember.userId;
        const privateBankAccs = await ctx.db
          .select({ id: bankAccounts.id })
          .from(bankAccounts)
          .where(and(eq(bankAccounts.tenantId, ctx.tenantId!), eq(bankAccounts.userId, targetUserId), eq(bankAccounts.isPrivate, true)));

        const privateBankAccIds = privateBankAccs.map((b) => b.id);

        if (privateBankAccIds.length > 0) {
          const privateEnvelopesList = await ctx.db
            .select({ id: envelopes.id })
            .from(envelopes)
            .where(inArray(envelopes.bankAccountId, privateBankAccIds));

          const privateEnvIds = privateEnvelopesList.map((p) => p.id);

          if (privateEnvIds.length > 0) {
            await ctx.db
              .update(envelopes)
              .set({ archivedAt: new Date(), updatedAt: new Date(), updatedBy: ctx.userId! })
              .where(inArray(envelopes.id, privateEnvIds));
          }
          await ctx.db
            .update(bankAccounts)
            .set({ archivedAt: new Date(), updatedAt: new Date(), updatedBy: ctx.userId! })
            .where(inArray(bankAccounts.id, privateBankAccIds));
        }

        await ctx.db.delete(tenantUserPreferences).where(and(eq(tenantUserPreferences.tenantId, ctx.tenantId!), eq(tenantUserPreferences.userId, targetUserId)));
      }

      await ctx.db
        .update(tenantUsers)
        .set({ archivedAt: new Date(), updatedAt: new Date() })
        .where(and(eq(tenantUsers.tenantId, ctx.tenantId!), memberFilter));

      return { success: true };
    }),

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
    .mutation(async ({ ctx, input }) => {
      const members = await ctx.db
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, ctx.tenantId!), eq(tenantUsers.userId, ctx.userId!), sql`${tenantUsers.archivedAt} IS NULL`));

      const myMember = members[0];
      if (myMember?.role !== "OWNER") {
        throw new Error("Only the owner can update household settings");
      }

      const [currentTenant] = await ctx.db
        .select({ currency: tenants.currency, country: tenants.country })
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId!))
        .limit(1);

      if (input.currency && currentTenant && input.currency !== currentTenant.currency) {
        throw new Error("Household currency is permanently locked and cannot be changed.");
      }

      if (input.country && currentTenant && input.country !== currentTenant.country) {
        throw new Error("Household country is permanently locked and cannot be changed.");
      }

      await ctx.db
        .update(tenants)
        .set({
          name: input.name,
          country: currentTenant?.country ?? input.country ?? "AU",
          ...(input.timezone ? { timezone: input.timezone } : {}),
          state: input.state || null,
          postcode: input.postcode || null,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, ctx.tenantId!));

      return { success: true };
    }),
};
