import type { QuizAnswers, EstimatedCategoryItem, EstimationResult } from "./onboarding-quiz.js";

/**
 * 2025/2026 ABS & RACQ Australian Benchmark Estimation Engine
 */
export function calculateQuizEstimates(answers: QuizAnswers): EstimationResult {
  const regularBills: EstimatedCategoryItem[] = [];
  const goalSinkingFunds: EstimatedCategoryItem[] = [];
  const everydayCategories: EstimatedCategoryItem[] = [];

  if (answers.country === "OTHER") {
    const weeklyG = answers.weeklyGroceries || 0;
    const weeklyD = answers.weeklyDining || 0;
    const weeklyP = answers.weeklyPersonal || 0;
    const monthlyGroceries = Math.round(weeklyG * (52 / 12));
    const monthlyDining = Math.round(weeklyD * (52 / 12));
    const monthlyPersonal = Math.round(weeklyP * (52 / 12));
    const monthlyEverydayTotal = monthlyGroceries + monthlyDining + monthlyPersonal;

    if (answers.housingType !== "OWN_OUTRIGHT") {
      regularBills.push({ name: answers.housingType.startsWith("OWN") ? "Mortgage Payment" : "Rent", type: "BILL", envelopeType: "BILL", fundingMode: "RECURRING", isPriority: true, monthlyAud: 0, icon: "home" });
    }
    regularBills.push({ name: "Utilities", type: "BILL", envelopeType: "BILL", fundingMode: "RECURRING", isPriority: true, monthlyAud: 0, icon: "zap" });
    regularBills.push({ name: "Home Internet", type: "BILL", envelopeType: "BILL", fundingMode: "RECURRING", isPriority: true, monthlyAud: 0, icon: "wifi" });
    if (answers.hasCars) {
      regularBills.push({ name: "Vehicle & Transport", type: "BILL", envelopeType: "BILL", fundingMode: "RECURRING", isPriority: true, monthlyAud: 0, icon: "car" });
    }
    if (answers.activeDebtMonthlyRepayment > 0) {
      regularBills.push({ name: "Active Debt Repayments", type: "BILL", envelopeType: "BILL", fundingMode: "TARGET_BALANCE", isPriority: true, monthlyAud: answers.activeDebtMonthlyRepayment, icon: "credit-card" });
    }
    goalSinkingFunds.push({ name: "Emergency Buffer Fund", type: "GOAL", envelopeType: "GOAL", fundingMode: "TARGET_BALANCE", isPriority: true, monthlyAud: 0, icon: "shield" });

    everydayCategories.push({ name: "Everyday Spending", type: "EVERYDAY", envelopeType: "EVERYDAY", fundingMode: "TARGET_BALANCE", isPriority: true, monthlyAud: monthlyEverydayTotal, icon: "wallet" });

    let totalMonthlyIncome = 0;
    answers.incomes.forEach((inc) => {
      let m = inc.amount;
      if (inc.frequency === "WEEKLY") m = inc.amount * (52 / 12);
      else if (inc.frequency === "FORTNIGHTLY") m = inc.amount * (26 / 12);
      else if (inc.frequency === "QUARTERLY") m = inc.amount * (4 / 12);
      else if (inc.frequency === "ANNUALLY") m = inc.amount / 12;
      totalMonthlyIncome += m;
    });

    const totalRegular = regularBills.reduce((acc, i) => acc + i.monthlyAud, 0);
    const totalGoal = goalSinkingFunds.reduce((acc, i) => acc + i.monthlyAud, 0);

    return {
      regularBills,
      goalSinkingFunds,
      everydayCategories,
      everydayPool: { name: "Everyday Spending Pool", type: "EVERYDAY", envelopeType: "EVERYDAY", fundingMode: "TARGET_BALANCE", isPriority: true, monthlyAud: monthlyEverydayTotal, icon: "wallet" },
      totalMonthlyIncomeAud: Math.round(totalMonthlyIncome),
      totalMonthlyAllocatedAud: Math.round(totalRegular + totalGoal + monthlyEverydayTotal),
    };
  }

  // --- 1. HOUSING & UTILITIES (BILL) ---
  let rentMortgageAmount = 2750;
  if (answers.housingType === "RENT_SHARE") rentMortgageAmount = 1375;
  if (answers.housingType === "OWN_MORTGAGE") rentMortgageAmount = 3500;
  if (answers.housingType === "OWN_OUTRIGHT") rentMortgageAmount = 0;

  if (rentMortgageAmount > 0) {
    regularBills.push({
      name: answers.housingType.startsWith("OWN") ? "Mortgage Payment" : "Rent",
      type: "BILL",
      envelopeType: "BILL",
      fundingMode: "RECURRING",
      isPriority: true,
      monthlyAud: rentMortgageAmount,
      icon: "🏡",
      rationale: answers.housingType.startsWith("OWN")
        ? "Estimated based on Australian mortgage benchmark for your housing selection."
        : "Estimated based on local rental market benchmark for your housing selection.",
    });
  }

  const utilitiesAmount = answers.housingType === "RENT_SHARE" ? 140 : answers.housingType.startsWith("OWN") ? 320 : 280;
  regularBills.push({ name: "Utilities (Electricity, Gas, Water)", type: "BILL", envelopeType: "BILL", fundingMode: "RECURRING", isPriority: true, monthlyAud: utilitiesAmount, icon: "⚡", rationale: "ABS Energy Utility Benchmark based on household occupancy." });

  const homeInsuranceAmount = answers.housingType.startsWith("OWN") ? 180 : 50;
  regularBills.push({ name: "Home & Contents Insurance", type: "BILL", envelopeType: "BILL", fundingMode: "RECURRING", isPriority: true, monthlyAud: homeInsuranceAmount, icon: "🛡️", rationale: "Australian insurance cost index for property protection." });

  if (answers.housingType.startsWith("OWN")) {
    regularBills.push({ name: "Council Rates", type: "BILL", envelopeType: "BILL", fundingMode: "RECURRING", isPriority: true, monthlyAud: 225, icon: "🏛️", rationale: "Standard Australian local government council rate benchmark." });
  }

  regularBills.push({ name: "Home Internet", type: "BILL", envelopeType: "BILL", fundingMode: "RECURRING", isPriority: true, monthlyAud: 80, icon: "📡", rationale: "NBN 50/20 Australian broadband plan benchmark." });

  // --- 2. TRANSPORT (BILL - PER VEHICLE) ---
  let carMaintGoalExtra = 0;
  if (answers.hasCars && answers.vehicles.length > 0) {
    answers.vehicles.forEach((veh, idx) => {
      let carMonthly = 390; // MID_SUV
      let maintExtra = 60;
      if (veh.size === "SMALL") { carMonthly = 310; maintExtra = 50; }
      if (veh.size === "LUXURY") { carMonthly = 500; maintExtra = 80; }

      regularBills.push({
        name: `${veh.name || `Vehicle ${idx + 1}`} Rego, Insurance & Fuel`,
        type: "BILL",
        envelopeType: "BILL",
        fundingMode: "RECURRING",
        isPriority: true,
        monthlyAud: carMonthly,
        icon: "🚗",
        rationale: `RACQ Transport Cost Benchmark for vehicle size (${veh.size || "Standard"}) and fuel usage.`,
      });
      carMaintGoalExtra += maintExtra;
    });
  }

  if (answers.usePublicTransport) {
    regularBills.push({ name: "Public Transport", type: "BILL", envelopeType: "BILL", fundingMode: "RECURRING", isPriority: true, monthlyAud: 150, icon: "🚌", rationale: "State transit commuter pass benchmark." });
  }
  if (answers.useRideshare) {
    regularBills.push({ name: "Rideshare / Taxi", type: "BILL", envelopeType: "BILL", fundingMode: "RECURRING", isPriority: false, monthlyAud: 100, icon: "🚕", rationale: "Estimated monthly rideshare & taxi usage." });
  }

  // --- 3. FAMILY UNIT (BILL - PER CHILD) ---
  if (answers.hasKids && answers.children.length > 0) {
    answers.children.forEach((child, idx) => {
      const childLabel = child.name || `Child ${idx + 1}`;
      if (child.stage === "CHILDCARE") {
        regularBills.push({
          name: `${childLabel} - Childcare & Early Learning`,
          type: "BILL",
          envelopeType: "BILL",
          fundingMode: "RECURRING",
          isPriority: true,
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
          type: "BILL",
          envelopeType: "BILL",
          fundingMode: "RECURRING",
          isPriority: true,
          monthlyAud: fee,
          icon: "🎓",
          rationale: `Australian school fee benchmark for ${child.type || "Public"} education.`,
        });
      }

      regularBills.push({
        name: `${childLabel} - Extracurricular & Sports`,
        type: "BILL",
        envelopeType: "BILL",
        fundingMode: "RECURRING",
        isPriority: false,
        monthlyAud: 150,
        icon: "⚽",
        rationale: "Community sports club registration and activity allowance.",
      });
    });
  }

  // --- 4. HEALTH & WELLBEING (BILL) ---
  if (answers.hasPrivateHealth) {
    const kidsCount = answers.hasKids ? answers.children.length : 0;
    const healthAud = kidsCount === 0 ? 180 : kidsCount <= 2 ? 350 : 480;
    regularBills.push({
      name: "Private Health Insurance",
      type: "BILL",
      envelopeType: "BILL",
      fundingMode: "RECURRING",
      isPriority: true,
      monthlyAud: healthAud,
      icon: "🏥",
      rationale: "Combined Hospital & Extras Australian private health cover benchmark based on family composition.",
    });
  }
  if (answers.hasMedicalOutofPocket !== false) {
    regularBills.push({ name: "Out-of-Pocket Medical & Pharmacy", type: "BILL", envelopeType: "BILL", fundingMode: "TARGET_BALANCE", isPriority: true, monthlyAud: 100, icon: "💊", rationale: "PBS pharmacy and Medicare out-of-pocket medical benchmark." });
  }
  if (answers.hasGym) {
    regularBills.push({ name: "Gym & Fitness Membership", type: "BILL", envelopeType: "BILL", fundingMode: "RECURRING", isPriority: false, monthlyAud: 80, icon: "💪", rationale: "Average Australian health club membership rates." });
  }

  // --- 5. PETS, DEBT & OBLIGATIONS (BILL) ---
  if (answers.hasPets && answers.petsCount > 0) {
    regularBills.push({ name: "Pet Food, Vet & Insurance", type: "BILL", envelopeType: "BILL", fundingMode: "TARGET_BALANCE", isPriority: false, monthlyAud: 120 * answers.petsCount, icon: "🐾", rationale: `RSPCA pet ownership benchmark for ${answers.petsCount} pet(s).` });
  }
  if (answers.activeDebtMonthlyRepayment > 0) {
    regularBills.push({ name: "Active Debt Repayments", type: "BILL", envelopeType: "BILL", fundingMode: "TARGET_BALANCE", isPriority: true, monthlyAud: answers.activeDebtMonthlyRepayment, icon: "💳", rationale: "Based on your active debt repayment answer." });
  }
  if (answers.givesCharity) {
    regularBills.push({ name: "Charity & Donations", type: "BILL", envelopeType: "BILL", fundingMode: "TARGET_BALANCE", isPriority: false, monthlyAud: 50, icon: "❤️", rationale: "Tax-deductible charitable contribution allowance." });
  }
  if (answers.familySupportMonthlyAmount > 0) {
    regularBills.push({ name: "Family Financial Support", type: "BILL", envelopeType: "BILL", fundingMode: "TARGET_BALANCE", isPriority: true, monthlyAud: answers.familySupportMonthlyAmount, icon: "🤝", rationale: "Based on your financial support answer." });
  }

  // --- 6. GOAL SINKING FUNDS ---
  goalSinkingFunds.push({ name: "Holidays & Travel Fund", type: "GOAL", envelopeType: "GOAL", fundingMode: "TARGET_BALANCE", isPriority: false, monthlyAud: 300, icon: "✈️", rationale: "Annual domestic/international family travel sinking fund." });
  goalSinkingFunds.push({ name: "Gifts & Celebrations Fund", type: "GOAL", envelopeType: "GOAL", fundingMode: "TARGET_BALANCE", isPriority: false, monthlyAud: 150, icon: "🎁", rationale: "Birthdays, Christmas, and anniversary gifts sinking fund." });

  let maintTotal = carMaintGoalExtra;
  if (answers.housingType.startsWith("OWN")) maintTotal += 150;
  if (maintTotal > 0) {
    goalSinkingFunds.push({ name: "Vehicle & Home Maintenance", type: "GOAL", envelopeType: "GOAL", fundingMode: "RECURRING", isPriority: false, monthlyAud: maintTotal, icon: "🛠️", rationale: "Emergency repair & scheduled maintenance buffer for property and vehicles." });
  }

  goalSinkingFunds.push({ name: "Emergency Buffer Fund", type: "GOAL", envelopeType: "GOAL", fundingMode: "TARGET_BALANCE", isPriority: true, monthlyAud: 250, icon: "🆘", rationale: "Serene Finance 3-Month Safety Buffer target ($10,000 balance)." });

  // --- 7. EVERYDAY BREAKDOWN (GROCERIES, DINING, PERSONAL, PETROL/INCIDENTAL) ---
  const weeklyG = answers.weeklyGroceries;
  const weeklyD = answers.weeklyDining;
  const weeklyP = answers.weeklyPersonal;
  const weeklyM = (weeklyG * 0.05) + ((weeklyD + weeklyP) * 0.15);

  const monthlyGroceries = Math.round(weeklyG * (52 / 12));
  const monthlyDining = Math.round(weeklyD * (52 / 12));
  const monthlyPersonal = Math.round(weeklyP * (52 / 12));
  const monthlyIncidental = Math.round(weeklyM * (52 / 12));

  const monthlyEverydayTotal = monthlyGroceries + monthlyDining + monthlyPersonal + monthlyIncidental;
  everydayCategories.push({
    name: "Everyday Spending",
    type: "EVERYDAY",
    envelopeType: "EVERYDAY",
    fundingMode: "TARGET_BALANCE",
    isPriority: true,
    monthlyAud: monthlyEverydayTotal,
    icon: "💳",
    rationale: "Combined daily expenses (groceries, dining, personal, incidentals) for friction-free spending.",
  });

  const everydayPool: EstimatedCategoryItem = {
    name: "Everyday Spending",
    type: "EVERYDAY",
    envelopeType: "EVERYDAY",
    fundingMode: "TARGET_BALANCE",
    isPriority: true,
    monthlyAud: monthlyEverydayTotal,
    icon: "💳",
  };

  // Convert all income items to monthly sum
  let totalMonthlyIncome = 0;
  answers.incomes.forEach((inc) => {
    let m = inc.amount;
    if (inc.frequency === "WEEKLY") m = inc.amount * (52 / 12);
    else if (inc.frequency === "FORTNIGHTLY") m = inc.amount * (26 / 12);
    else if (inc.frequency === "QUARTERLY") m = inc.amount * (4 / 12);
    else if (inc.frequency === "ANNUALLY") m = inc.amount / 12;
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
