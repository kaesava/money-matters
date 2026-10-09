import { describe, it, expect } from 'vitest';
import { computeSetupWizardCalculations } from './useSetupWizardCalculations';

describe('useSetupWizardCalculations logic', () => {
  it('correctly calculates totals in rerun mode isolating custom categories', () => {
    const customCategories = [
      { id: 'c1', name: 'Groceries', type: 'EVERYDAY' as const, monthlyAud: 800, icon: '🛒' },
      { id: 'c2', name: 'Internet', type: 'REGULAR' as const, monthlyAud: 90, icon: '📌' },
      { id: 'c3', name: 'Car Fund', type: 'GOAL' as const, monthlyAud: 200, icon: '🎯' },
    ];

    const result = computeSetupWizardCalculations({
      isRerun: true,
      incomes: [{ id: 'inc-1', name: 'Salary', amount: 4000, frequency: 'MONTHLY', type: 'SALARY' }],
      housingType: 'RENT_SOLO',
      hasCars: false,
      vehicles: [],
      usePublicTransport: true,
      useRideshare: false,
      hasKids: false,
      children: [],
      hasPrivateHealth: false,
      hasGym: false,
      hasPets: false,
      petsCount: 0,
      debtMonthlyRepayment: 0,
      hasCharityGiving: false,
      charityMonthlyAmount: 0,
      weeklyGroceries: 200,
      weeklyDining: 100,
      weeklyPersonal: 50,
      customCategories,
      removedCategoryNames: new Set(),
      amountOverrides: {},
    });

    expect(result.activeEveryday.length).toBe(1);
    expect(result.activeRegular.length).toBe(1);
    expect(result.activeGoals.length).toBe(1);
    expect(result.totalEverydayMonthly).toBe(800);
    expect(result.totalRegularMonthly).toBe(90);
    expect(result.totalGoalMonthly).toBe(200);
    expect(result.totalAllocatedMonthly).toBe(1090);
  });

  it('respects amountOverrides and removedCategoryNames', () => {
    const customCategories = [
      { id: 'c1', name: 'Groceries', type: 'EVERYDAY' as const, monthlyAud: 800, icon: '🛒' },
      { id: 'c2', name: 'Internet', type: 'REGULAR' as const, monthlyAud: 90, icon: '📌' },
    ];

    const result = computeSetupWizardCalculations({
      isRerun: true,
      incomes: [{ id: 'inc-1', name: 'Salary', amount: 4000, frequency: 'MONTHLY', type: 'SALARY' }],
      housingType: 'RENT_SOLO',
      hasCars: false,
      vehicles: [],
      usePublicTransport: true,
      useRideshare: false,
      hasKids: false,
      children: [],
      hasPrivateHealth: false,
      hasGym: false,
      hasPets: false,
      petsCount: 0,
      debtMonthlyRepayment: 0,
      hasCharityGiving: false,
      charityMonthlyAmount: 0,
      weeklyGroceries: 200,
      weeklyDining: 100,
      weeklyPersonal: 50,
      customCategories,
      removedCategoryNames: new Set(['Internet']),
      amountOverrides: { Groceries: 950 },
    });

    expect(result.activeCategories.length).toBe(1);
    expect(result.activeEveryday[0]?.monthlyAud).toBe(950);
    expect(result.totalEverydayMonthly).toBe(950);
    expect(result.totalAllocatedMonthly).toBe(950);
  });
});
