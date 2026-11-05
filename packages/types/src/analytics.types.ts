import { z } from "zod";

export const SpendingTimeframeEnum = z.enum(["30D", "90D", "1Y"]);
export type SpendingTimeframe = z.infer<typeof SpendingTimeframeEnum>;

export const SpendingFlowTypeEnum = z.enum(["ALL", "DEBIT", "CREDIT", "TRANSFER"]);
export type SpendingFlowType = z.infer<typeof SpendingFlowTypeEnum>;

export const GetSpendingAnalyticsQuery = z.object({
  timeframe: SpendingTimeframeEnum.default("90D"),
  envelopeId: z.string().optional(),
  bankAccountId: z.string().optional(),
  searchQuery: z.string().optional(),
  flowType: SpendingFlowTypeEnum.default("ALL"),
}).strict();
export type GetSpendingAnalyticsQuery = z.infer<typeof GetSpendingAnalyticsQuery>;

export const GetIncomeSplitAnalyticsQuerySchema = z.object({
  timeframe: SpendingTimeframeEnum.default("90D"),
  bankAccountId: z.string().optional(),
  searchQuery: z.string().optional(),
  envelopeId: z.string().optional(),
}).strict();
export type GetIncomeSplitAnalyticsQuery = z.infer<typeof GetIncomeSplitAnalyticsQuerySchema>;

export const HorizonBreakdownDTOSchema = z.object({
  everyday: z.number(),
  bills: z.number(),
  goals: z.number(),
  totalOutflow: z.number(),
  percentages: z.object({
    everyday: z.number(),
    bills: z.number(),
    goals: z.number(),
  }).strict(),
}).strict();
export type HorizonBreakdownDTO = z.infer<typeof HorizonBreakdownDTOSchema>;

export const MonthlyCashFlowPointDTOSchema = z.object({
  monthKey: z.string(),
  label: z.string(),
  income: z.number(),
  outflow: z.number(),
  net: z.number(),
}).strict();
export type MonthlyCashFlowPointDTO = z.infer<typeof MonthlyCashFlowPointDTOSchema>;

export const TopOutflowPoolDTOSchema = z.object({
  id: z.string(),
  name: z.string(),
  amount: z.number(),
  percentage: z.number(),
}).strict();
export type TopOutflowPoolDTO = z.infer<typeof TopOutflowPoolDTOSchema>;

export const TopPayeeItemDTOSchema = z.object({
  name: z.string(),
  amount: z.number(),
  percentage: z.number(),
}).strict();
export type TopPayeeItemDTO = z.infer<typeof TopPayeeItemDTOSchema>;

export const SpendingAnalyticsDTOSchema = z.object({
  timeframe: SpendingTimeframeEnum,
  totalOutflow: z.number(),
  totalIncome: z.number(),
  horizonBreakdown: HorizonBreakdownDTOSchema,
  monthlyCashFlow: z.array(MonthlyCashFlowPointDTOSchema),
  topPools: z.array(TopOutflowPoolDTOSchema),
  otherPoolsAmount: z.number(),
  isEmpty: z.boolean(),
  // Filter-aware adaptive fields
  isFiltered: z.boolean().default(false),
  filteredEnvelopeName: z.string().optional(),
  filteredSharePercentage: z.number().default(0),
  topPayees: z.array(TopPayeeItemDTOSchema).default([]),
  isTransferOnly: z.boolean().default(false),
}).strict();
export type SpendingAnalyticsDTO = z.infer<typeof SpendingAnalyticsDTOSchema>;

export const IncomeSplitAnalyticsDTOSchema = SpendingAnalyticsDTOSchema;
export type IncomeSplitAnalyticsDTO = SpendingAnalyticsDTO;

/**
 * DTO summarizing monthly income, spending, savings, and remaining everyday cash balance.
 */
export const MonthlySummaryDto = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  totalIncome: z.string(),
  totalSpent: z.string(),
  totalSaved: z.string(),
  everydayRemaining: z.string(),
}).strict();
export type MonthlySummaryType = z.infer<typeof MonthlySummaryDto>;
