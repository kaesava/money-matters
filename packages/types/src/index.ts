import { z } from "zod";

export const HouseholdSchema = z.object({
  id: z.string().uuid(),
  fyEndMonthDay: z.string().regex(/^\d{2}-\d{2}$/).default("06-30"),
  appId: z.string().uuid(),
  customFields: z.record(z.any()).default({}),
}).strict();

export const BankAccountSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  appId: z.string().uuid(),
  accountName: z.string().min(1),
  accountType: z.enum(["everyday", "bills", "major", "offset"]),
  lastKnownBalance: z.string().default("0"),
}).strict();

export const CategorySchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  appId: z.string().uuid(),
  name: z.string().min(1),
  type: z.enum(["major", "bills", "everyday"]),
  priorityWeight: z.number().int().min(1).max(5).default(3),
  componentFieldsData: z.record(z.any()).default({}),
}).strict();

export type HouseholdType = z.infer<typeof HouseholdSchema>;
export type BankAccountType = z.infer<typeof BankAccountSchema>;
export type CategoryType = z.infer<typeof CategorySchema>;
