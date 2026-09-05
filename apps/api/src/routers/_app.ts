import { router } from '../trpc/trpc.js';
import { tenantRouter } from './tenant.router.js';
import { budgetingRouter } from './budgeting.router.js';
import { incomeRouter } from './income.router.js';
import { expensesRouter } from './expenses.router.js';
import { paydayRouter } from './payday.router.js';
import { transactionsRouter } from './transactions.router.js';
import { notificationsRouter } from './notifications.router.js';
import { billingRouter } from './billing.router.js';
import { transfersRouter } from './transfers.router.js';

export const appRouter = router({
  ...tenantRouter,
  ...budgetingRouter,
  ...incomeRouter,
  ...expensesRouter,
  ...paydayRouter,
  ...transactionsRouter,
  ...notificationsRouter,
  ...billingRouter,
  ...transfersRouter,
});


export type AppRouter = typeof appRouter;
