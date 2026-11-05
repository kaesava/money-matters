import { privateTenantProcedure, privateOwnerProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { bankAccounts, envelopes, transactionLedger } from "@money-matters/db";
import { and, eq, sql, or, inArray } from "drizzle-orm";
import { 
  createBankAccountHandler,
  updateBankAccountHandler,
  archiveBankAccountHandler,
  getBankAccountsWithMappingsHandler,
} from "@money-matters/capability-tenant";
import { listEnvelopesQuery } from "@money-matters/capability-budgeting";
import { 
  CreateBankAccountCommand,
  UpdateBankAccountCommand,
} from "@money-matters/types";
import { z } from 'zod';
import { posthog } from '../../lib/posthog.js';

export const bankAccountsProcedures = {
  createBankAccount: privateTenantProcedure
    .input(CreateBankAccountCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const handler = createBankAccountHandler(ctx.db);
      const result = await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
      if (posthog && ctx.userId) {
        posthog.capture({
          distinctId: ctx.userId,
          event: 'bank_account_created',
          properties: {
            tenant_id: ctx.tenantId,
            account_name: input.name,
          },
        });
        await posthog.flush();
      }
      return result;
    }),

  updateBankAccount: privateTenantProcedure
    .input(z.object({
      accountId: z.string().uuid(),
      data: UpdateBankAccountCommand
    }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const handler = updateBankAccountHandler(ctx.db);
      return await handler(input.accountId, input.data, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  archiveBankAccount: privateOwnerProcedure
    .input(z.object({ accountId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const handler = archiveBankAccountHandler(ctx.db);
      return await handler(input.accountId, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  getBankAccountsWithMappings: privateTenantProcedure
    .query(async ({ ctx }) => {
      const handler = getBankAccountsWithMappingsHandler(ctx.db);
      return await handler(ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  listBankAccounts: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select()
        .from(bankAccounts)
        .where(
          and(
            eq(bankAccounts.tenantId, ctx.tenantId!),
            eq(bankAccounts.appId, ctx.appId!),
            sql`${bankAccounts.archivedAt} IS NULL`,
            or(eq(bankAccounts.isPrivate, false), eq(bankAccounts.userId, ctx.userId!))!
          )
        );
    }),

  listBankAccountsWithExpected: privateTenantProcedure
    .query(async ({ ctx }) => {
      const accounts = await ctx.db
        .select()
        .from(bankAccounts)
        .where(
          and(
            eq(bankAccounts.tenantId, ctx.tenantId!),
            eq(bankAccounts.appId, ctx.appId!),
            sql`${bankAccounts.archivedAt} IS NULL`,
            or(eq(bankAccounts.isPrivate, false), eq(bankAccounts.userId, ctx.userId!))!
          )
        );

      const allEnvelopes = await listEnvelopesQuery(ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId!);

      return accounts.map((acc) => {
        const linkedEnvelopes = allEnvelopes.filter((p) => p.bankAccountId === acc.id);
        const buffer = parseFloat(acc.unbudgetedBuffer || "0");
        const expectedBalance = linkedEnvelopes.reduce((sum, p) => sum + (p.currentBalance || 0), 0) + buffer;
        return {
          ...acc,
          expectedBalance: expectedBalance.toFixed(2),
          linkedPoolCount: linkedEnvelopes.length,
          linkedEnvelopeCount: linkedEnvelopes.length,
        };
      });
    }),

  reconcileBankBalance: privateTenantProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        actualBalance: z.string().regex(/^\d+(\.\d{1,2})?$/),
        clientIdempotencyToken: z.string().uuid(),
        note: z.string().optional(),
        splits: z.array(
          z.object({
            envelopeId: z.string().uuid().optional(),
            poolId: z.string().uuid().optional(),
            adjustment: z.string(),
          }).strict()
        ),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const accountId = input.accountId;

      return await ctx.db.transaction(async (tx) => {
        await tx
          .update(bankAccounts)
          .set({
            lastKnownBalance: input.actualBalance,
            lastBalanceMatchedAt: new Date(),
            updatedAt: new Date(),
            updatedBy: ctx.userId!,
          })
          .where(eq(bankAccounts.id, accountId));

        const txValues = [];
        const alignmentNote = input.note?.trim() || "Balance Alignment";
        for (const split of input.splits) {
          const adj = parseFloat(split.adjustment);
          if (Math.abs(adj) < 0.01) continue;

          const targetEnvId = (split.envelopeId || split.poolId)!;
          txValues.push({
            tenantId: ctx.tenantId!,
            appId: ctx.appId!,
            envelopeId: targetEnvId,
            bankAccountId: accountId,
            flowType: (adj > 0 ? "CREDIT" : "DEBIT") as "CREDIT" | "DEBIT",
            transactionType: "ACCOUNT_ALIGNMENT" as const,
            amount: Math.abs(adj).toFixed(2),
            idempotencyKey: `reconcile-${accountId}-${targetEnvId}-${input.clientIdempotencyToken}`,
            note: alignmentNote,
            source: "MANUAL" as const,
            createdBy: ctx.userId!,
            updatedBy: ctx.userId!,
          });
        }

        if (txValues.length > 0) {
          await tx.insert(transactionLedger).values(txValues);
        }

        return { success: true };
      });
    }),
};
