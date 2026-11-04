import React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  AmountInput,
  DatePickerField,
  MobileGoalModeToggle,
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
  frequency?: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY';
  setFrequency?: (v: 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY') => void;
  interval?: number;
  setInterval?: (v: number) => void;
  goalStartDate?: string;
  setGoalStartDate?: (v: string) => void;
  calculatedMonthly?: string;
}

export const EnvelopeGoalFields: React.FC<EnvelopeGoalFieldsProps> = ({
  goalMode = 'TARGET_DATE',
  setGoalMode,
  targetAmount,
  setTargetAmount,
  targetDate,
  setTargetDate,
  frequency = 'MONTHLY',
  setFrequency,
  interval = 1,
  setInterval,
  goalStartDate = '',
  setGoalStartDate,
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
});
