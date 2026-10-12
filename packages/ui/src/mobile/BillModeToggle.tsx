import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';
import FormLabel from './FormLabel';
import InfoTooltip from './InfoTooltip';

export interface MobileBillModeToggleProps {
  value: 'SCHEDULED_BILL' | 'FLEXIBLE_BILL';
  onChange: (mode: 'SCHEDULED_BILL' | 'FLEXIBLE_BILL') => void;
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
          {t('categories.billModeLabel')}
        </FormLabel>
        <InfoTooltip
          content={
            value === 'SCHEDULED_BILL'
              ? t('categories.tooltips.scheduledBill')
              : t('categories.tooltips.flexibleBill')
          }
        />
      </View>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          disabled={disabled}
          onPress={() => onChange('SCHEDULED_BILL')}
          style={[
            styles.toggleBtn,
            value === 'SCHEDULED_BILL' && styles.activeToggleBtn,
          ]}
        >
          <Feather
            name="calendar"
            size={14}
            color={
              value === 'SCHEDULED_BILL'
                ? DESIGN_TOKENS.colors.sereneBlue
                : DESIGN_TOKENS.colors.slate[600]
            }
          />
          <Text
            style={[
              styles.btnText,
              value === 'SCHEDULED_BILL' && styles.activeBtnText,
            ]}
          >
            {t('categories.billModeScheduled')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={disabled}
          onPress={() => onChange('FLEXIBLE_BILL')}
          style={[
            styles.toggleBtn,
            value === 'FLEXIBLE_BILL' && styles.activeToggleBtn,
          ]}
        >
          <Feather
            name="sliders"
            size={14}
            color={
              value === 'FLEXIBLE_BILL'
                ? DESIGN_TOKENS.colors.sereneBlue
                : DESIGN_TOKENS.colors.slate[600]
            }
          />
          <Text
            style={[
              styles.btnText,
              value === 'FLEXIBLE_BILL' && styles.activeBtnText,
            ]}
          >
            {t('categories.billModeFlexible')}
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
