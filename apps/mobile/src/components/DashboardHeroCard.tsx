import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DashboardHeroEverydayCard } from './dashboard/hero/DashboardHeroEverydayCard';
import { DashboardHeroBillsCard } from './dashboard/hero/DashboardHeroBillsCard';
import { DashboardHealthFilterStrip } from './dashboard/hero/DashboardHealthFilterStrip';

export interface DashboardHeroCardProps {
  readonly everydayBalance: number;
  readonly everydayMonthlyBudget?: number;
  readonly safetyBufferFloor?: number;
  readonly billsBalance: number;
  readonly billsMonthlyBudget?: number;
  readonly daysUntilPayday?: number;
  readonly billsShortfall: number;
  readonly billsDue14DaysCount: number;
  readonly totalBillsDue14Days: number;
  readonly onMoveMoney: () => void;
  readonly onEverydayPress?: () => void;
  readonly onBillsPress?: () => void;
}

export const DashboardHeroCard: React.FC<DashboardHeroCardProps> = ({
  everydayBalance,
  everydayMonthlyBudget = 0,
  safetyBufferFloor = 0,
  billsBalance,
  billsMonthlyBudget = 0,
  daysUntilPayday,
  billsShortfall,
  billsDue14DaysCount,
  totalBillsDue14Days,
  onMoveMoney,
  onEverydayPress,
  onBillsPress,
}) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = today.getDate();

  const effectiveDays =
    daysUntilPayday !== undefined && daysUntilPayday > 0
      ? daysUntilPayday
      : Math.max(1, daysInMonth - currentDay);

  const dailySpendable = Math.max(0, everydayBalance / effectiveDays);
  const targetDailyBudget =
    everydayMonthlyBudget > 0 ? (everydayMonthlyBudget * 12) / 365 : 0;

  const isBillsRisk = billsShortfall > 0;
  const isPacingTight =
    !isBillsRisk && targetDailyBudget > 0 && dailySpendable < targetDailyBudget * 0.8;

  const progressPercent = Math.min(
    100,
    Math.max(5, (dailySpendable / (targetDailyBudget || 1)) * 100)
  );

  return (
    <View style={styles.container}>
      <DashboardHeroEverydayCard
        everydayBalance={everydayBalance}
        everydayMonthlyBudget={everydayMonthlyBudget}
        safetyBufferFloor={safetyBufferFloor}
        dailySpendable={dailySpendable}
        effectiveDays={effectiveDays}
        daysUntilPayday={daysUntilPayday}
        progressPercent={progressPercent}
        isBillsRisk={isBillsRisk}
        isPacingTight={isPacingTight}
        onEverydayPress={onEverydayPress}
      />

      <DashboardHeroBillsCard
        billsBalance={billsBalance}
        billsMonthlyBudget={billsMonthlyBudget}
        billsShortfall={billsShortfall}
        billsDue14DaysCount={billsDue14DaysCount}
        totalBillsDue14Days={totalBillsDue14Days}
        onBillsPress={onBillsPress}
        onMoveMoney={onMoveMoney}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginTop: 6,
    marginBottom: 6,
    gap: 10,
  },
});

export default DashboardHeroCard;
