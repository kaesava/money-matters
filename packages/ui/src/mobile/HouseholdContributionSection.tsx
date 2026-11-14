import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '../tokens';
import { FormLabel } from './FormLabel';
import MobileInput from './Input';
import { AmountInput } from './AmountInput';
import { ContributionMode } from '../lib/householdContribution';

export interface MobileHouseholdContributionSectionProps {
  hasPrivateEnvelopes: boolean;
  contributionMode: ContributionMode;
  onContributionModeChange: (mode: ContributionMode) => void;
  contributionValue: string;
  onContributionValueChange: (val: string) => void;
}

const CONTRIBUTION_MODES: Array<{ mode: ContributionMode; labelKey: string }> = [
  { mode: 'FULL', labelKey: 'planTabs.householdContribution.full' },
  { mode: 'PERCENTAGE', labelKey: 'planTabs.householdContribution.percentage' },
  { mode: 'FIXED_AMOUNT', labelKey: 'planTabs.householdContribution.fixedAmount' },
];

export function MobileHouseholdContributionSection({
  hasPrivateEnvelopes,
  contributionMode,
  onContributionModeChange,
  contributionValue,
  onContributionValueChange,
}: MobileHouseholdContributionSectionProps) {
  if (!hasPrivateEnvelopes) {
    return null;
  }

  return (
    <View style={styles.contributionCard}>
      <FormLabel>{t('planTabs.householdContribution.title')}</FormLabel>
      <View style={styles.contributionModesRow}>
        {CONTRIBUTION_MODES.map(({ mode, labelKey }) => {
          const isSelected = contributionMode === mode;
          return (
            <TouchableOpacity
              key={mode}
              style={[styles.modeBtn, isSelected && styles.modeBtnSelected]}
              onPress={() => onContributionModeChange(mode)}
              activeOpacity={0.7}
            >
              <Text style={[styles.modeBtnText, isSelected && styles.modeBtnTextSelected]} numberOfLines={1}>
                {t(labelKey)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {contributionMode === 'PERCENTAGE' && (
        <View style={styles.contributionInputSection}>
          <MobileInput
            label={t('planTabs.householdContribution.modeLabel')}
            keyboardType="numeric"
            value={contributionValue}
            onChangeText={onContributionValueChange}
            placeholder={t('planTabs.householdContribution.percentagePlaceholder')}
          />
          <Text style={styles.remainderNoteText}>{t('planTabs.householdContribution.remainderNote')}</Text>
        </View>
      )}

      {contributionMode === 'FIXED_AMOUNT' && (
        <View style={styles.contributionInputSection}>
          <AmountInput
            label={t('planTabs.householdContribution.modeLabel')}
            value={contributionValue}
            onChangeText={onContributionValueChange}
          />
          <Text style={styles.remainderNoteText}>{t('planTabs.householdContribution.remainderNote')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contributionCard: {
    padding: 12,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 8,
  },
  contributionModesRow: {
    flexDirection: 'row',
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: 8,
    padding: 3,
    gap: 3,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeBtnSelected: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  modeBtnTextSelected: {
    color: DESIGN_TOKENS.colors.slate[900],
  },
  contributionInputSection: {
    paddingTop: 4,
    gap: 4,
  },
  remainderNoteText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
  },
});
