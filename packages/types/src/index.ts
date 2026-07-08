import { z } from 'zod';

export const TaskSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable().optional(),
  status: z.string().default('todo'),
  extraFields: z.record(z.string(), z.unknown()).nullable().optional(),
  tenantId: z.string().uuid(),
  createdAt: z.date(),
  createdBy: z.string().uuid(),
  updatedAt: z.date(),
  updatedBy: z.string().uuid(),
  archivedAt: z.date().nullable().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  tenantId: true,
  createdBy: true,
  updatedBy: true,
});
export type CreateTask = z.infer<typeof CreateTaskSchema>;

export const HouseholdSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  appId: z.string().min(1),
  createdAt: z.date(),
  createdBy: z.string().uuid(),
  updatedAt: z.date(),
  updatedBy: z.string().uuid(),
  archivedAt: z.date().nullable().optional(),
});
export type Household = z.infer<typeof HouseholdSchema>;

export const CreateHouseholdSchema = HouseholdSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  archivedAt: true,
  createdBy: true,
  updatedBy: true,
});
export type CreateHousehold = z.infer<typeof CreateHouseholdSchema>;
