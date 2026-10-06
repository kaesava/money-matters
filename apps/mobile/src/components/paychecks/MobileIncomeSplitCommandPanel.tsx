import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { CommandPanelIncomeDetails } from './command/CommandPanelIncomeDetails';
import { CommandPanelSurplusGauge } from './command/CommandPanelSurplusGauge';

export interface MobileIncomeSplitCommandPanelProps {
  sourceName: string;
  onSourceNameChange: (name: string) => void;
  actualAmount: string;
  onActualAmountChange: (amount: string) => void;
  selectedDate: string;
  onSelectedDateChange: (date: string) => void;
  numericActual: number;
  sweepPoolName: string;
  sweepPoolRemainder: number;
  isDeficit: boolean;
  everydayAllocated: number;
  billsAllocated: number;
  goalsAllocated: number;
  isReadOnly: boolean;
  isAmountModified: boolean;
  onRecalculateWaterfall?: () => void;
  submitting?: boolean;
  isConfirmedPlan?: boolean;
}

export function MobileIncomeSplitCommandPanel({
  sourceName,
  onSourceNameChange,
  actualAmount,
  onActualAmountChange,
  selectedDate,
  onSelectedDateChange,
  numericActual,
  sweepPoolName,
  sweepPoolRemainder,
  isDeficit,
  everydayAllocated,
  billsAllocated,
  goalsAllocated,
  isReadOnly,
  isAmountModified,
  onRecalculateWaterfall,
  submitting,
  isConfirmedPlan = false,
}: MobileIncomeSplitCommandPanelProps) {
  const [detailsCollapsed, setDetailsCollapsed] = useState(!isConfirmedPlan);

  const billsPercent = numericActual > 0 ? Math.min(100, (billsAllocated / numericActual) * 100) : 0;
  const goalsPercent = numericActual > 0 ? Math.min(100 - billsPercent, (goalsAllocated / numericActual) * 100) : 0;
  const surplusPercent = numericActual > 0 ? Math.max(0, (sweepPoolRemainder / numericActual) * 100) : 0;

  return (
    <View style={styles.container}>
      <CommandPanelIncomeDetails
        collapsed={detailsCollapsed}
        onToggleCollapsed={() => setDetailsCollapsed((prev) => !prev)}
        sourceName={sourceName}
        onSourceNameChange={onSourceNameChange}
        actualAmount={actualAmount}
        onActualAmountChange={onActualAmountChange}
        selectedDate={selectedDate}
        onSelectedDateChange={onSelectedDateChange}
        numericActual={numericActual}
        isReadOnly={isReadOnly}
        isAmountModified={isAmountModified}
        onRecalculateWaterfall={onRecalculateWaterfall}
        submitting={submitting}
      />

      {!isConfirmedPlan && (
        <CommandPanelSurplusGauge
          sweepPoolName={sweepPoolName}
          sweepPoolRemainder={sweepPoolRemainder}
          isDeficit={isDeficit}
          everydayAllocated={everydayAllocated}
          billsAllocated={billsAllocated}
          goalsAllocated={goalsAllocated}
          billsPercent={billsPercent}
          goalsPercent={goalsPercent}
          surplusPercent={surplusPercent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
});
