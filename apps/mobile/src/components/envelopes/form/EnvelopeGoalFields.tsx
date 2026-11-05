import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  AmountInput,
  DatePickerField,
  MobileGoalModeToggle,
  DESIGN_TOKENS,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { EnvelopeRecurrenceFields } from './EnvelopeRecurrenceFields';

export interface EnvelopeGoalFieldsProps {
  goalMode?: 'TARGET_DATE' | 'ONGOING';
  setGoalMode?: (v: 'TARGET_DATE' | 'ONGOING') => void;
  targetAmount: string;
  setTargetAmount: (v: string) => void;
  targetDate: string;
  setTargetDate: (v: string) => void;
  isTargetDateInPast?: boolean;
  frequency?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY';
  setFrequency?: (v: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY') => void;
  interval?: number;
  setInterval?: (v: number) => void;
  goalStartDate?: string;
  setGoalStartDate?: (v: string) => void;
  endDate?: string;
  setEndDate?: (v: string) => void;
  calculatedMonthly?: string;
}

export const EnvelopeGoalFields: React.FC<EnvelopeGoalFieldsProps> = ({
  goalMode = 'TARGET_DATE',
  setGoalMode,
  targetAmount,
  setTargetAmount,
  targetDate,
  setTargetDate,
  isTargetDateInPast = false,
  frequency = 'MONTHLY',
  setFrequency,
  interval = 1,
  setInterval,
  goalStartDate = '',
  setGoalStartDate,
  endDate,
  setEndDate,
  calculatedMonthly = '0.00',
}) => {
  return (
    <>
      {setGoalMode && (
        <MobileGoalModeToggle value={goalMode} onChange={setGoalMode} />
      )}

      {goalMode === 'TARGET_DATE' ? (
        <View style={styles.goalInputsCol}>
          <AmountInput
            label={t('categories.targetAmountLabel')}
            required
            value={targetAmount}
            onChangeText={setTargetAmount}
            placeholder="10000.00"
          />
          <DatePickerField
            label={t('categories.targetCompletionDate')}
            required
            value={targetDate}
            onChange={setTargetDate}
          />
          {isTargetDateInPast && (
            <View style={styles.pastDateWarningBox}>
              <Text style={styles.pastDateWarningText}>
                {t('categories.targetDateInPastWarning')}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <EnvelopeRecurrenceFields
          amountLabel={t('goalModes.monthlyContribution')}
          amount={targetAmount}
          setAmount={setTargetAmount}
          placeholder="250.00"
          frequency={frequency}
          setFrequency={setFrequency}
          interval={interval}
          setInterval={setInterval}
          startDate={goalStartDate}
          setStartDate={setGoalStartDate}
          endDate={endDate ?? targetDate}
          setEndDate={setEndDate ?? setTargetDate}
          calculatedMonthly={calculatedMonthly}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  goalInputsCol: {
    gap: 12,
  },
  pastDateWarningBox: {
    padding: 10,
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
  },
  pastDateWarningText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.warningDark,
    lineHeight: 16,
  },
});
