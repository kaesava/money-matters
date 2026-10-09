import { useMemo } from 'react';
import {
  IncomeItem,
  HousingType,
  VehicleConfig,
  ChildConfig,
  EstimatedCategoryItem,
  QuizAnswers,
  calculateQuizEstimates,
} from '@money-matters/types';

export interface CalculationsProps {
  isRerun: boolean;
  incomes: IncomeItem[];
  housingType: HousingType;
  hasCars: boolean;
  vehicles: VehicleConfig[];
  usePublicTransport: boolean;
  useRideshare: boolean;
  hasKids: boolean;
  children: ChildConfig[];
  hasPrivateHealth: boolean;
  hasGym: boolean;
  hasPets: boolean;
  petsCount: number;
  debtMonthlyRepayment: number;
  hasCharityGiving: boolean;
  charityMonthlyAmount: number;
  weeklyGroceries: number;
  weeklyDining: number;
  weeklyPersonal: number;
  customCategories: EstimatedCategoryItem[];
  removedCategoryNames: Set<string>;
  amountOverrides: Record<string, number>;
}

export function computeSetupWizardCalculations(props: CalculationsProps) {
  const quizAnswers: QuizAnswers = {
    incomes: props.incomes,
    housingType: props.housingType,
    hasCars: props.hasCars,
    vehicles: props.vehicles,
    usePublicTransport: props.usePublicTransport,
    useRideshare: props.useRideshare,
    hasKids: props.hasKids,
    children: props.children,
    hasPrivateHealth: props.hasPrivateHealth,
    hasGym: props.hasGym,
    hasPets: props.hasPets,
    petsCount: props.petsCount,
    activeDebtMonthlyRepayment: props.debtMonthlyRepayment,
    givesCharity: props.hasCharityGiving,
    familySupportMonthlyAmount: props.charityMonthlyAmount,
    weeklyGroceries: props.weeklyGroceries,
    weeklyDining: props.weeklyDining,
    weeklyPersonal: props.weeklyPersonal,
  };

  const estimation = calculateQuizEstimates(quizAnswers);

  const combined = props.isRerun
    ? props.customCategories
    : [
        ...estimation.regularBills,
        ...estimation.goalSinkingFunds,
        ...estimation.everydayCategories,
        ...props.customCategories,
      ];

  const activeCategories = combined
    .filter((cat) => !props.removedCategoryNames.has(cat.name))
    .map((cat) => {
      const override = props.amountOverrides[cat.name];
      return {
        ...cat,
        monthlyAud: override !== undefined ? override : cat.monthlyAud,
      };
    });

  const activeEveryday = activeCategories.filter((c) => c.type === 'EVERYDAY');
  const activeRegular = activeCategories.filter((c) => c.type === 'REGULAR');
  const activeGoals = activeCategories.filter((c) => c.type === 'GOAL');

  const totalEverydayMonthly = activeEveryday.reduce((acc, c) => acc + c.monthlyAud, 0);
  const totalRegularMonthly = activeRegular.reduce((acc, c) => acc + c.monthlyAud, 0);
  const totalGoalMonthly = activeGoals.reduce((acc, c) => acc + c.monthlyAud, 0);
  const totalAllocatedMonthly = totalEverydayMonthly + totalRegularMonthly + totalGoalMonthly;

  return {
    estimation,
    activeCategories,
    activeEveryday,
    activeRegular,
    activeGoals,
    totalEverydayMonthly,
    totalRegularMonthly,
    totalGoalMonthly,
    totalAllocatedMonthly,
  };
}

export function useSetupWizardCalculations(props: CalculationsProps) {
  return useMemo(() => computeSetupWizardCalculations(props), [
    props.isRerun,
    props.incomes,
    props.housingType,
    props.hasCars,
    props.vehicles,
    props.usePublicTransport,
    props.useRideshare,
    props.hasKids,
    props.children,
    props.hasPrivateHealth,
    props.hasGym,
    props.hasPets,
    props.petsCount,
    props.debtMonthlyRepayment,
    props.hasCharityGiving,
    props.charityMonthlyAmount,
    props.weeklyGroceries,
    props.weeklyDining,
    props.weeklyPersonal,
    props.customCategories,
    props.removedCategoryNames,
    props.amountOverrides,
  ]);
}
