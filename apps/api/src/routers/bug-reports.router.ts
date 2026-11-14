import { privateTenantProcedure } from '../trpc/trpc.js';
import { submitFeedbackCommand, SubmitFeedbackInputSchema } from "@money-matters/capability-bug-reports";

export const bugReportsRouter = {
  submitFeedback: privateTenantProcedure
    .input(SubmitFeedbackInputSchema)
    .mutation(async ({ ctx, input }) => {
      // NOTE: Intentionally do NOT call requiresWriteAccess(ctx) so users in read-only / grace-period states can submit feedback and report bugs.
      return await submitFeedbackCommand(input, {
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        userEmail: ctx.email,
      });
    }),
};
