import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';
import FormLabel from './FormLabel';
import InfoTooltip from './InfoTooltip';

export interface MobileBillModeToggleProps {
  value: 'RECURRING' | 'TARGET_BALANCE';
  onChange: (mode: 'RECURRING' | 'TARGET_BALANCE') => void;
  disabled?: boolean;
}

export function MobileBillModeToggle({
  value,
  onChange,
  disabled = false,
}: MobileBillModeToggleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <FormLabel containerStyle={styles.formLabelWrap}>
          {t('categories.fundingModeLabel')}
        </FormLabel>
        <InfoTooltip
          content={
            value === 'RECURRING'
              ? t('categories.fundingModeRecurringDesc')
              : t('categories.fundingModeTargetBalanceDesc')
          }
        />
      </View>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          disabled={disabled}
          onPress={() => onChange('RECURRING')}
          style={[
            styles.toggleBtn,
            value === 'RECURRING' && styles.activeToggleBtn,
          ]}
        >
          <Feather
            name="calendar"
            size={14}
            color={
              value === 'RECURRING'
                ? DESIGN_TOKENS.colors.sereneBlue
                : DESIGN_TOKENS.colors.slate[600]
            }
          />
          <Text
            style={[
              styles.btnText,
              value === 'RECURRING' && styles.activeBtnText,
            ]}
          >
            {t('categories.fundingModeRecurring')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={disabled}
          onPress={() => onChange('TARGET_BALANCE')}
          style={[
            styles.toggleBtn,
            value === 'TARGET_BALANCE' && styles.activeToggleBtn,
          ]}
        >
          <Feather
            name="sliders"
            size={14}
            color={
              value === 'TARGET_BALANCE'
                ? DESIGN_TOKENS.colors.sereneBlue
                : DESIGN_TOKENS.colors.slate[600]
            }
          />
          <Text
            style={[
              styles.btnText,
              value === 'TARGET_BALANCE' && styles.activeBtnText,
            ]}
          >
            {t('categories.fundingModeTargetBalance')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formLabelWrap: {
    marginBottom: 0,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    padding: 4,
    borderRadius: 12,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activeToggleBtn: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  btnText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  activeBtnText: {
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
});

export default MobileBillModeToggle;
