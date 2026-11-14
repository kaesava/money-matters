import { z } from "zod";
import { EnvelopeType, FundingMode } from "./envelope.types.js";

export const HousingTypeSchema = z.enum(["OWN_MORTGAGE", "OWN_OUTRIGHT", "RENT_SOLO", "RENT_SHARE"]);
export type HousingType = z.infer<typeof HousingTypeSchema>;

export const CarSizeSchema = z.enum(["SMALL", "MID_SUV", "LUXURY"]);
export type CarSize = z.infer<typeof CarSizeSchema>;

export const SchoolTypeSchema = z.enum(["PUBLIC", "CATHOLIC", "PRIVATE"]);
export type SchoolType = z.infer<typeof SchoolTypeSchema>;

export const SchoolStageSchema = z.enum(["CHILDCARE", "PRIMARY", "SECONDARY"]);
export type SchoolStage = z.infer<typeof SchoolStageSchema>;

export const IncomeItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]).default("FORTNIGHTLY"),
  interval: z.number().int().min(1).max(365).default(1).optional(),
  rrule: z.string().optional().nullable(),
  type: z.enum(["SALARY", "BUSINESS", "BENEFIT", "OTHER"]).default("SALARY"),
  receivingAccountId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
}).strict();
export type IncomeItem = z.infer<typeof IncomeItemSchema>;

export const VehicleConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: CarSizeSchema,
}).strict();
export type VehicleConfig = z.infer<typeof VehicleConfigSchema>;

export const ChildConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  stage: SchoolStageSchema,
  type: SchoolTypeSchema,
}).strict();
export type ChildConfig = z.infer<typeof ChildConfigSchema>;

export const QuizAnswersSchema = z.object({
  // Step 1: Income Engine (Dynamic income list)
  incomes: z.array(IncomeItemSchema).min(1),

  // Step 2: Life-Builder Questionnaire
  housingType: HousingTypeSchema.default("RENT_SOLO"),
  
  // Transport (Per-vehicle configuration)
  hasCars: z.boolean().default(true),
  vehicles: z.array(VehicleConfigSchema).default([{ id: "veh-1", name: "Vehicle 1", size: "MID_SUV" }]),
  usePublicTransport: z.boolean().default(true),
  useRideshare: z.boolean().default(false),

  // Family (Per-child configuration)
  hasKids: z.boolean().default(false),
  children: z.array(ChildConfigSchema).default([]),

  // Health
  hasPrivateHealth: z.boolean().default(true),
  hasGym: z.boolean().default(false),
  hasMedicalOutofPocket: z.boolean().default(true),

  // Debt & Pets
  hasPets: z.boolean().default(false),
  petsCount: z.number().int().nonnegative().default(0),
  activeDebtMonthlyRepayment: z.number().nonnegative().default(0),

  // Obligations
  givesCharity: z.boolean().default(false),
  familySupportMonthlyAmount: z.number().nonnegative().default(0),

  // Country / Region configuration
  country: z.enum(["AU", "NZ", "OTHER"]).default("AU"),

  // Everyday Sliders (Weekly)
  weeklyGroceries: z.number().nonnegative().default(270),
  weeklyDining: z.number().nonnegative().default(240),
  weeklyPersonal: z.number().nonnegative().default(100),
}).strict();

export type QuizAnswers = z.infer<typeof QuizAnswersSchema>;

export interface EstimatedCategoryItem {
  id?: string;
  name: string;
  type: EnvelopeType;
  envelopeType?: EnvelopeType;
  fundingMode?: FundingMode;
  isPriority?: boolean;
  isSurplusTarget?: boolean;
  isPrivate?: boolean;
  bankAccountId?: string | null;
  safetyBufferFloor?: number | null;
  targetAmount?: number | null;
  enteredAmount?: number | null;
  currentBalance?: number;
  monthlyAud: number;
  icon?: string;
  colour?: string;
  rationale?: string;
  startDate?: string | null;
  endDate?: string | null;
  rrule?: string | null;
  budgetFrequency?: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "ANNUALLY" | null;
  generateEvents?: boolean;
  hasScheduledEvents?: boolean;
}

export interface EstimationResult {
  regularBills: EstimatedCategoryItem[];
  goalSinkingFunds: EstimatedCategoryItem[];
  everydayCategories: EstimatedCategoryItem[];
  everydayPool: EstimatedCategoryItem;
  totalMonthlyIncomeAud: number;
  totalMonthlyAllocatedAud: number;
}

export { calculateQuizEstimates } from "./onboarding-quiz-estimates.js";


export const UserGoalItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  monthlyAmount: z.number().nonnegative(),
  icon: z.string().default("target"),
  fundingMode: z.enum(["TARGET_BALANCE", "RECURRING"]).optional().default("TARGET_BALANCE"),
  isPriority: z.boolean().optional().default(false),
  isSurplusTarget: z.boolean().optional(),
  bankAccountId: z.string().optional().nullable(),
  currentBalance: z.number().optional(),
  targetAmount: z.number().nonnegative().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  enteredAmount: z.number().nonnegative().optional().nullable(),
  budgetFrequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "QUARTERLY", "ANNUALLY"]).optional(),
  startDate: z.string().optional().nullable(),
  rrule: z.string().optional().nullable(),
  isPrivate: z.boolean().optional(),
}).strict();
export type UserGoalItem = z.infer<typeof UserGoalItemSchema>;

