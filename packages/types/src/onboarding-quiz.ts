import { z } from "zod";

export const HousingTypeSchema = z.enum(["OWN_MORTGAGE", "OWN_OUTRIGHT", "RENT_SOLO", "RENT_SHARE"]);
export type HousingType = z.infer<typeof HousingTypeSchema>;

export const CarSizeSchema = z.enum(["SMALL", "MID_SUV", "LUXURY"]);
export type CarSize = z.infer<typeof CarSizeSchema>;

export const SchoolTypeSchema = z.enum(["PUBLIC", "CATHOLIC", "PRIVATE"]);
export type SchoolType = z.infer<typeof SchoolTypeSchema>;

export const SchoolStageSchema = z.enum(["CHILDCARE", "PRIMARY", "SECONDARY"]);
export type SchoolStage = z.infer<typeof SchoolStageSchema>;

export const QuizAnswersSchema = z.object({
  // Step 1: Income Engine
  incomeAmount: z.number().positive(),
  incomeFrequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY"]).default("FORTNIGHTLY"),
  incomeType: z.enum(["SALARY", "BUSINESS", "BENEFIT"]).default("SALARY"),
  partnerIncomeAmount: z.number().nonnegative().optional(),
  partnerIncomeFrequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY"]).optional(),

  // Step 2: Life-Builder Questionnaire
  housingType: HousingTypeSchema.default("RENT_SOLO"),
  
  // Transport
  hasCars: z.boolean().default(true),
  cars: z.array(z.object({ size: CarSizeSchema })).default([{ size: "MID_SUV" }]),
  usePublicTransport: z.boolean().default(true),
  useRideshare: z.boolean().default(false),

  // Family
  hasKids: z.boolean().default(false),
  kidsCount: z.number().int().nonnegative().default(0),
  schoolStage: SchoolStageSchema.optional(),
  schoolType: SchoolTypeSchema.optional(),

  // Health
  hasPrivateHealth: z.boolean().default(true),
  hasGym: z.boolean().default(false),

  // Debt & Pets
  hasPets: z.boolean().default(false),
  petsCount: z.number().int().nonnegative().default(0),
  activeDebtMonthlyRepayment: z.number().nonnegative().default(0),

  // Obligations
  givesCharity: z.boolean().default(false),
  familySupportMonthlyAmount: z.number().nonnegative().default(0),

  // Everyday Sliders (Weekly)
  weeklyGroceries: z.number().nonnegative().default(270),
  weeklyDining: z.number().nonnegative().default(240),
  weeklyPersonal: z.number().nonnegative().default(100),
}).strict();

export type QuizAnswers = z.infer<typeof QuizAnswersSchema>;

export interface EstimatedCategoryItem {
  name: string;
  type: "REGULAR" | "GOAL" | "EVERYDAY";
  monthlyAud: number;
  icon: string;
  isCommitted?: boolean;
}

export interface EstimationResult {
  regularBills: EstimatedCategoryItem[];
  goalSinkingFunds: EstimatedCategoryItem[];
  everydayPool: EstimatedCategoryItem;
  totalMonthlyIncomeAud: number;
  totalMonthlyAllocatedAud: number;
}

/**
 * 2025/2026 ABS & RACQ Australian Benchmark Estimation Engine
 */
export function calculateQuizEstimates(answers: QuizAnswers): EstimationResult {
  const regularBills: EstimatedCategoryItem[] = [];
  const goalSinkingFunds: EstimatedCategoryItem[] = [];

  // --- 1. HOUSING & UTILITIES (REGULAR) ---
  let rentMortgageAmount = 2750;
  if (answers.housingType === "RENT_SHARE") rentMortgageAmount = 1375;
  if (answers.housingType === "OWN_MORTGAGE") rentMortgageAmount = 3500;
  if (answers.housingType === "OWN_OUTRIGHT") rentMortgageAmount = 0;

  if (rentMortgageAmount > 0) {
    regularBills.push({
      name: answers.housingType.startsWith("OWN") ? "Mortgage Payment" : "Rent",
      type: "REGULAR",
      monthlyAud: rentMortgageAmount,
      icon: "🏡",
    });
  }

  const utilitiesAmount = answers.housingType === "RENT_SHARE" ? 140 : answers.housingType.startsWith("OWN") ? 320 : 280;
  regularBills.push({ name: "Utilities (Electricity, Gas, Water)", type: "REGULAR", monthlyAud: utilitiesAmount, icon: "⚡" });

  const homeInsuranceAmount = answers.housingType.startsWith("OWN") ? 180 : 50;
  regularBills.push({ name: "Home & Contents Insurance", type: "REGULAR", monthlyAud: homeInsuranceAmount, icon: "🛡️" });

  if (answers.housingType.startsWith("OWN")) {
    regularBills.push({ name: "Council Rates", type: "REGULAR", monthlyAud: 225, icon: "🏛️" });
  }

  regularBills.push({ name: "Home Internet", type: "REGULAR", monthlyAud: 80, icon: "📡" });

  // --- 2. TRANSPORT (REGULAR & GOAL) ---
  let carMaintGoalExtra = 0;
  if (answers.hasCars && answers.cars.length > 0) {
    answers.cars.forEach((car, idx) => {
      let carMonthly = 390; // MID_SUV
      let maintExtra = 60;
      if (car.size === "SMALL") { carMonthly = 310; maintExtra = 50; }
      if (car.size === "LUXURY") { carMonthly = 500; maintExtra = 80; }

      regularBills.push({
        name: `Car ${idx + 1} Rego, Insurance & Fuel`,
        type: "REGULAR",
        monthlyAud: carMonthly,
        icon: "🚗",
      });
      carMaintGoalExtra += maintExtra;
    });
  }

  if (answers.usePublicTransport) {
    regularBills.push({ name: "Public Transport", type: "REGULAR", monthlyAud: 150, icon: "🚌" });
  }
  if (answers.useRideshare) {
    regularBills.push({ name: "Rideshare / Taxi", type: "REGULAR", monthlyAud: 100, icon: "🚕" });
  }

  // --- 3. FAMILY UNIT (REGULAR) ---
  if (answers.hasKids && answers.kidsCount > 0) {
    if (answers.schoolStage === "CHILDCARE") {
      regularBills.push({
        name: "Childcare & Early Learning",
        type: "REGULAR",
        monthlyAud: 1200 * answers.kidsCount,
        icon: "👶",
      });
    } else if (answers.schoolType) {
      let feePerChild = 100; // PUBLIC
      if (answers.schoolType === "CATHOLIC") feePerChild = 400;
      if (answers.schoolType === "PRIVATE") feePerChild = 1500;

      regularBills.push({
        name: "School Fees & Tuition",
        type: "REGULAR",
        monthlyAud: feePerChild * answers.kidsCount,
        icon: "🎓",
      });
    }

    regularBills.push({
      name: "Kids Extracurricular & Sports",
      type: "REGULAR",
      monthlyAud: 150 * answers.kidsCount,
      icon: "⚽",
    });
  }

  // --- 4. HEALTH & WELLBEING (REGULAR) ---
  if (answers.hasPrivateHealth) {
    regularBills.push({ name: "Private Health Insurance", type: "REGULAR", monthlyAud: 350, icon: "🏥" });
  }
  regularBills.push({ name: "Out-of-Pocket Medical & Pharmacy", type: "REGULAR", monthlyAud: 100, icon: "💊" });
  if (answers.hasGym) {
    regularBills.push({ name: "Gym & Fitness Membership", type: "REGULAR", monthlyAud: 80, icon: "💪" });
  }

  // --- 5. PETS, DEBT & OBLIGATIONS (REGULAR) ---
  if (answers.hasPets && answers.petsCount > 0) {
    regularBills.push({ name: "Pet Food, Vet & Insurance", type: "REGULAR", monthlyAud: 120 * answers.petsCount, icon: "🐾" });
  }
  if (answers.activeDebtMonthlyRepayment > 0) {
    regularBills.push({ name: "Active Debt Repayments", type: "REGULAR", monthlyAud: answers.activeDebtMonthlyRepayment, icon: "💳" });
  }
  if (answers.givesCharity) {
    regularBills.push({ name: "Charity & Donations", type: "REGULAR", monthlyAud: 50, icon: "❤️" });
  }
  if (answers.familySupportMonthlyAmount > 0) {
    regularBills.push({ name: "Family Financial Support", type: "REGULAR", monthlyAud: answers.familySupportMonthlyAmount, icon: "🤝" });
  }

  // --- 6. GOAL SINKING FUNDS ---
  goalSinkingFunds.push({ name: "Holidays & Travel Fund", type: "GOAL", monthlyAud: 300, icon: "✈️" });
  goalSinkingFunds.push({ name: "Gifts & Celebrations Fund", type: "GOAL", monthlyAud: 150, icon: "🎁" });

  let maintTotal = carMaintGoalExtra;
  if (answers.housingType.startsWith("OWN")) maintTotal += 150;
  if (maintTotal > 0) {
    goalSinkingFunds.push({ name: "Vehicle & Home Maintenance", type: "GOAL", monthlyAud: maintTotal, icon: "🛠️" });
  }

  goalSinkingFunds.push({ name: "Emergency Buffer Fund", type: "GOAL", monthlyAud: 250, icon: "🆘", isCommitted: true });

  // --- 7. EVERYDAY POOL (SLIDERS + INCIDENTAL M) ---
  const weeklyG = answers.weeklyGroceries;
  const weeklyD = answers.weeklyDining;
  const weeklyP = answers.weeklyPersonal;
  const weeklyM = (weeklyG * 0.05) + ((weeklyD + weeklyP) * 0.15);

  const monthlyEverydayTotal = Math.round((weeklyG + weeklyD + weeklyP + weeklyM) * (52 / 12));

  const everydayPool: EstimatedCategoryItem = {
    name: "Everyday Spending Pool",
    type: "EVERYDAY",
    monthlyAud: monthlyEverydayTotal,
    icon: "💳",
  };

  // Convert primary income to monthly
  let monthlyIncome = answers.incomeAmount;
  if (answers.incomeFrequency === "WEEKLY") monthlyIncome = answers.incomeAmount * (52 / 12);
  if (answers.incomeFrequency === "FORTNIGHTLY") monthlyIncome = answers.incomeAmount * (26 / 12);

  if (answers.partnerIncomeAmount && answers.partnerIncomeAmount > 0) {
    let pMonthly = answers.partnerIncomeAmount;
    if (answers.partnerIncomeFrequency === "WEEKLY") pMonthly = answers.partnerIncomeAmount * (52 / 12);
    if (answers.partnerIncomeFrequency === "FORTNIGHTLY") pMonthly = answers.partnerIncomeAmount * (26 / 12);
    monthlyIncome += pMonthly;
  }

  const totalRegular = regularBills.reduce((acc, i) => acc + i.monthlyAud, 0);
  const totalGoal = goalSinkingFunds.reduce((acc, i) => acc + i.monthlyAud, 0);
  const totalMonthlyAllocatedAud = Math.round(totalRegular + totalGoal + monthlyEverydayTotal);

  return {
    regularBills,
    goalSinkingFunds,
    everydayPool,
    totalMonthlyIncomeAud: Math.round(monthlyIncome),
    totalMonthlyAllocatedAud,
  };
}
