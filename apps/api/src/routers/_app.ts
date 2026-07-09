import { router, tenantProcedure } from '../trpc/trpc';
import { calculatePaydayCascade } from '@money-matters/capability-money';
import { z } from 'zod';

export const appRouter = router({
  executeCascade: tenantProcedure
    .input(
      z.object({
        incomeAmount: z.number().positive(),
        scheduleId: z.string().uuid(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      return await calculatePaydayCascade(
        ctx.tenantId,
        ctx.appId,
        input.incomeAmount,
        input.scheduleId
      );
    }),
});

export type AppRouter = typeof appRouter;
