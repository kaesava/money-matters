import { z } from "zod";

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
  frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY"]).default("FORTNIGHTLY"),
  type: z.enum(["SALARY", "BUSINESS", "BENEFIT", "OTHER"]).default("SALARY"),
});
export type IncomeItem = z.infer<typeof IncomeItemSchema>;

export const VehicleConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: CarSizeSchema,
});
export type VehicleConfig = z.infer<typeof VehicleConfigSchema>;

export const ChildConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  stage: SchoolStageSchema,
  type: SchoolTypeSchema,
});
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
  id?: string;
  name: string;
  type: "REGULAR" | "GOAL" | "EVERYDAY";
  monthlyAud: number;
  icon: string;
  isCommitted?: boolean;
  rationale?: string;
}

export interface EstimationResult {
  regularBills: EstimatedCategoryItem[];
  goalSinkingFunds: EstimatedCategoryItem[];
  everydayCategories: EstimatedCategoryItem[];
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
  const everydayCategories: EstimatedCategoryItem[] = [];

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
      rationale: answers.housingType.startsWith("OWN")
        ? "Estimated based on Australian mortgage benchmark for your housing selection."
        : "Estimated based on local rental market benchmark for your housing selection.",
    });
  }

  const utilitiesAmount = answers.housingType === "RENT_SHARE" ? 140 : answers.housingType.startsWith("OWN") ? 320 : 280;
  regularBills.push({ name: "Utilities (Electricity, Gas, Water)", type: "REGULAR", monthlyAud: utilitiesAmount, icon: "⚡", rationale: "ABS Energy Utility Benchmark based on household occupancy." });

  const homeInsuranceAmount = answers.housingType.startsWith("OWN") ? 180 : 50;
  regularBills.push({ name: "Home & Contents Insurance", type: "REGULAR", monthlyAud: homeInsuranceAmount, icon: "🛡️", rationale: "Australian insurance cost index for property protection." });

  if (answers.housingType.startsWith("OWN")) {
    regularBills.push({ name: "Council Rates", type: "REGULAR", monthlyAud: 225, icon: "🏛️", rationale: "Standard Australian local government council rate benchmark." });
  }

  regularBills.push({ name: "Home Internet", type: "REGULAR", monthlyAud: 80, icon: "📡", rationale: "NBN 50/20 Australian broadband plan benchmark." });

  // --- 2. TRANSPORT (REGULAR & GOAL - PER VEHICLE) ---
  let carMaintGoalExtra = 0;
  if (answers.hasCars && answers.vehicles.length > 0) {
    answers.vehicles.forEach((veh, idx) => {
      let carMonthly = 390; // MID_SUV
      let maintExtra = 60;
      if (veh.size === "SMALL") { carMonthly = 310; maintExtra = 50; }
      if (veh.size === "LUXURY") { carMonthly = 500; maintExtra = 80; }

      regularBills.push({
        name: `${veh.name || `Vehicle ${idx + 1}`} Rego, Insurance & Fuel`,
        type: "REGULAR",
        monthlyAud: carMonthly,
        icon: "🚗",
        rationale: `RACQ Transport Cost Benchmark for vehicle size (${veh.size || "Standard"}) and fuel usage.`,
      });
      carMaintGoalExtra += maintExtra;
    });
  }

  if (answers.usePublicTransport) {
    regularBills.push({ name: "Public Transport", type: "REGULAR", monthlyAud: 150, icon: "🚌", rationale: "State transit commuter pass benchmark." });
  }
  if (answers.useRideshare) {
    regularBills.push({ name: "Rideshare / Taxi", type: "REGULAR", monthlyAud: 100, icon: "🚕", rationale: "Estimated monthly rideshare & taxi usage." });
  }

  // --- 3. FAMILY UNIT (REGULAR - PER CHILD) ---
  if (answers.hasKids && answers.children.length > 0) {
    answers.children.forEach((child, idx) => {
      const childLabel = child.name || `Child ${idx + 1}`;
      if (child.stage === "CHILDCARE") {
        regularBills.push({
          name: `${childLabel} - Childcare & Early Learning`,
          type: "REGULAR",
          monthlyAud: 1200,
          icon: "👶",
          rationale: "Australian Department of Education benchmark for subsidized early learning.",
        });
      } else {
        let fee = 100; // PUBLIC
        if (child.type === "CATHOLIC") fee = 400;
        if (child.type === "PRIVATE") fee = 1500;

        regularBills.push({
          name: `${childLabel} - School Fees & Tuition`,
          type: "REGULAR",
          monthlyAud: fee,
          icon: "🎓",
          rationale: `Australian school fee benchmark for ${child.type || "Public"} education.`,
        });
      }

      regularBills.push({
        name: `${childLabel} - Extracurricular & Sports`,
        type: "REGULAR",
        monthlyAud: 150,
        icon: "⚽",
        rationale: "Community sports club registration and activity allowance.",
      });
    });
  }

  // --- 4. HEALTH & WELLBEING (REGULAR) ---
  if (answers.hasPrivateHealth) {
    regularBills.push({ name: "Private Health Insurance", type: "REGULAR", monthlyAud: 350, icon: "🏥", rationale: "Combined Hospital & Extras Australian private health cover benchmark." });
  }
  regularBills.push({ name: "Out-of-Pocket Medical & Pharmacy", type: "REGULAR", monthlyAud: 100, icon: "💊", rationale: "PBS pharmacy and Medicare out-of-pocket medical benchmark." });
  if (answers.hasGym) {
    regularBills.push({ name: "Gym & Fitness Membership", type: "REGULAR", monthlyAud: 80, icon: "💪", rationale: "Average Australian health club membership rates." });
  }

  // --- 5. PETS, DEBT & OBLIGATIONS (REGULAR) ---
  if (answers.hasPets && answers.petsCount > 0) {
    regularBills.push({ name: "Pet Food, Vet & Insurance", type: "REGULAR", monthlyAud: 120 * answers.petsCount, icon: "🐾", rationale: `RSPCA pet ownership benchmark for ${answers.petsCount} pet(s).` });
  }
  if (answers.activeDebtMonthlyRepayment > 0) {
    regularBills.push({ name: "Active Debt Repayments", type: "REGULAR", monthlyAud: answers.activeDebtMonthlyRepayment, icon: "💳", rationale: "Based on your active debt repayment answer." });
  }
  if (answers.givesCharity) {
    regularBills.push({ name: "Charity & Donations", type: "REGULAR", monthlyAud: 50, icon: "❤️", rationale: "Tax-deductible charitable contribution allowance." });
  }
  if (answers.familySupportMonthlyAmount > 0) {
    regularBills.push({ name: "Family Financial Support", type: "REGULAR", monthlyAud: answers.familySupportMonthlyAmount, icon: "🤝", rationale: "Based on your financial support answer." });
  }

  // --- 6. GOAL SINKING FUNDS ---
  goalSinkingFunds.push({ name: "Holidays & Travel Fund", type: "GOAL", monthlyAud: 300, icon: "✈️", rationale: "Annual domestic/international family travel sinking fund." });
  goalSinkingFunds.push({ name: "Gifts & Celebrations Fund", type: "GOAL", monthlyAud: 150, icon: "🎁", rationale: "Birthdays, Christmas, and anniversary gifts sinking fund." });

  let maintTotal = carMaintGoalExtra;
  if (answers.housingType.startsWith("OWN")) maintTotal += 150;
  if (maintTotal > 0) {
    goalSinkingFunds.push({ name: "Vehicle & Home Maintenance", type: "GOAL", monthlyAud: maintTotal, icon: "🛠️", rationale: "Emergency repair & scheduled maintenance buffer for property and vehicles." });
  }

  goalSinkingFunds.push({ name: "Emergency Buffer Fund", type: "GOAL", monthlyAud: 250, icon: "🆘", isCommitted: true, rationale: "Serene Finance 3-Month Safety Buffer target ($10,000 balance)." });

  // --- 7. EVERYDAY BREAKDOWN (GROCERIES, DINING, PERSONAL, PETROL/INCIDENTAL) ---
  const weeklyG = answers.weeklyGroceries;
  const weeklyD = answers.weeklyDining;
  const weeklyP = answers.weeklyPersonal;
  const weeklyM = (weeklyG * 0.05) + ((weeklyD + weeklyP) * 0.15);

  const monthlyGroceries = Math.round(weeklyG * (52 / 12));
  const monthlyDining = Math.round(weeklyD * (52 / 12));
  const monthlyPersonal = Math.round(weeklyP * (52 / 12));
  const monthlyIncidental = Math.round(weeklyM * (52 / 12));

  everydayCategories.push({ name: "Groceries & Supermarket", type: "EVERYDAY", monthlyAud: monthlyGroceries, icon: "🛒", rationale: `Calculated from your weekly grocery slider answer ($${weeklyG}/wk).` });
  everydayCategories.push({ name: "Eating Out & Takeaway", type: "EVERYDAY", monthlyAud: monthlyDining, icon: "🍔", rationale: `Calculated from your weekly dining slider answer ($${weeklyD}/wk).` });
  everydayCategories.push({ name: "Personal & Entertainment", type: "EVERYDAY", monthlyAud: monthlyPersonal, icon: "🎟️", rationale: `Calculated from your weekly personal spend slider answer ($${weeklyP}/wk).` });
  everydayCategories.push({ name: "Everyday Incidentals", type: "EVERYDAY", monthlyAud: monthlyIncidental, icon: "☕", rationale: `Estimated 5-15% incidental buffer for un-budgeted micro-purchases.` });

  const monthlyEverydayTotal = monthlyGroceries + monthlyDining + monthlyPersonal + monthlyIncidental;

  const everydayPool: EstimatedCategoryItem = {
    name: "Everyday Spending Pool",
    type: "EVERYDAY",
    monthlyAud: monthlyEverydayTotal,
    icon: "💳",
  };

  // Convert all income items to monthly sum
  let totalMonthlyIncome = 0;
  answers.incomes.forEach((inc) => {
    let m = inc.amount;
    if (inc.frequency === "WEEKLY") m = inc.amount * (52 / 12);
    if (inc.frequency === "FORTNIGHTLY") m = inc.amount * (26 / 12);
    totalMonthlyIncome += m;
  });

  const totalRegular = regularBills.reduce((acc, i) => acc + i.monthlyAud, 0);
  const totalGoal = goalSinkingFunds.reduce((acc, i) => acc + i.monthlyAud, 0);
  const totalMonthlyAllocatedAud = Math.round(totalRegular + totalGoal + monthlyEverydayTotal);

  return {
    regularBills,
    goalSinkingFunds,
    everydayCategories,
    everydayPool,
    totalMonthlyIncomeAud: Math.round(totalMonthlyIncome),
    totalMonthlyAllocatedAud,
  };
}
