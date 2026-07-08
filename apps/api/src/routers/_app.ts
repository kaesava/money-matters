import { router } from '../trpc/trpc';
import { tasksRouter } from './tasks';

export const appRouter = router({
  tasks: tasksRouter,
});

export type AppRouter = typeof appRouter;
