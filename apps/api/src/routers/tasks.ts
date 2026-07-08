import { z } from 'zod';
import { router, tenantProcedure } from '../trpc/trpc';
import { tasks } from '@money-matters/db';
import { eq } from 'drizzle-orm';
import { CreateTaskSchema } from '@money-matters/types';
import { getAppConfig } from '@money-matters/config';
import { TRPCError } from '@trpc/server';

export const tasksRouter = router({
  list: tenantProcedure
    .input(z.object({ appId: z.string() }))
    .query(async ({ ctx, input }) => {
      const appConfig = getAppConfig(input.appId);
      if (!appConfig) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'App configuration not found' });
      }

      const allTasks = await ctx.db.query.tasks.findMany({
        where: eq(tasks.tenantId, ctx.tenantId),
        orderBy: (tasks, { desc }) => [desc(tasks.createdAt)],
      });
      return allTasks;
    }),

  create: tenantProcedure
    .input(z.object({
      appId: z.string(),
      task: CreateTaskSchema
    }))
    .mutation(async ({ ctx, input }) => {
      const appConfig = getAppConfig(input.appId);
      if (!appConfig) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'App configuration not found' });
      }

      // Dynamic validation of extraFields based on the App Shell configuration
      const componentConfig = appConfig.components['tasks'];
      if (componentConfig && componentConfig.extraFields && input.task.extraFields) {
        for (const [key, fieldConfig] of Object.entries(componentConfig.extraFields)) {
          const val = (input.task.extraFields as Record<string, unknown>)[key];
          if (fieldConfig.required && (val === undefined || val === null)) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: `Missing required extra field: ${key}` });
          }
          if (val !== undefined && fieldConfig.options && !fieldConfig.options.includes(val as string)) {
             throw new TRPCError({ code: 'BAD_REQUEST', message: `Invalid option for field: ${key}` });
          }
        }
      }

      const [newTask] = await ctx.db.insert(tasks).values({
        ...input.task,
        tenantId: ctx.tenantId,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      }).returning();

      return newTask;
    }),
});
