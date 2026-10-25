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
  goals?: Array<{
    id: string;
    name: string;
    monthlyAmount: number;
    icon?: string;
    targetAmount?: number | null;
    dueDate?: string | null;
    goalMode?: 'TARGET_DATE' | 'ONGOING';
    enteredAmount?: number | null;
  }>;
  customCategories: EstimatedCategoryItem[];
  removedCategoryNames: Set<string>;
  amountOverrides: Record<string, number>;
}

function getGoalMonthsDiff(targetDateStr?: string | null): number {
  if (!targetDateStr) return 12;
  const now = new Date();
  const target = new Date(targetDateStr);
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}

export function computeSetupWizardCalculations(props: CalculationsProps) {
  const quizAnswers: QuizAnswers = {
    country: 'AU',
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

  const activeGoals: EstimatedCategoryItem[] = (props.goals || [])
    .filter((g) => !props.removedCategoryNames.has(g.name))
    .map((g) => {
      const isOngoing = g.goalMode === 'ONGOING';
      const override = props.amountOverrides[g.name];
      const baseMonthly = isOngoing
        ? g.enteredAmount !== undefined && g.enteredAmount !== null
          ? g.enteredAmount
          : g.monthlyAmount || g.targetAmount || 0
        : g.monthlyAmount || Math.round((g.targetAmount || 0) / getGoalMonthsDiff(g.dueDate));
      return {
        id: g.id,
        name: g.name,
        type: 'GOAL' as const,
        monthlyAud: override !== undefined ? override : baseMonthly,
        icon: g.icon || 'target',
      };
    });

  const nonGoalCategories = props.isRerun
    ? props.customCategories.filter((c) => c.type !== 'GOAL')
    : [
        ...estimation.regularBills,
        ...estimation.everydayCategories,
        ...props.customCategories.filter((c) => c.type !== 'GOAL'),
      ];

  const mappedNonGoals = nonGoalCategories
    .filter((cat) => !props.removedCategoryNames.has(cat.name))
    .map((cat) => {
      const override = props.amountOverrides[cat.name];
      return {
        ...cat,
        monthlyAud: override !== undefined ? override : cat.monthlyAud,
      };
    });

  const activeCategories = [...mappedNonGoals, ...activeGoals];

  const activeEveryday = activeCategories.filter((c) => c.type === 'EVERYDAY');
  const activeRegular = activeCategories.filter((c) => c.type === 'REGULAR');

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
    props.goals,
    props.customCategories,
    props.removedCategoryNames,
    props.amountOverrides,
  ]);
}
