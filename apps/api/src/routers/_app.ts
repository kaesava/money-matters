import { router } from '../trpc/trpc.js';
import { tenantRouter } from './tenant.router.js';
import { categoriesRouter } from './categories.router.js';
import { incomeRouter } from './income.router.js';
import { expensesRouter } from './expenses.router.js';
import { paydayRouter } from './payday.router.js';
import { transactionsRouter } from './transactions.router.js';
import { notificationsRouter } from './notifications.router.js';
import { fileNotesRouter } from './file-notes.router.js';
import { geoRouter } from './geo.router.js';

export const appRouter = router({
  ...tenantRouter,
  ...categoriesRouter,
  ...incomeRouter,
  ...expensesRouter,
  ...paydayRouter,
  ...transactionsRouter,
  ...notificationsRouter,
  ...fileNotesRouter,
  ...geoRouter,
});

export type AppRouter = typeof appRouter;
