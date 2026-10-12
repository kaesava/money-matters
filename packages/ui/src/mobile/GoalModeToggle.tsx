import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';
import FormLabel from './FormLabel';
import InfoTooltip from './InfoTooltip';

export interface MobileGoalModeToggleProps {
  value: 'TARGET_DATE' | 'ONGOING';
  onChange: (mode: 'TARGET_DATE' | 'ONGOING') => void;
  disabled?: boolean;
}

export function MobileGoalModeToggle({
  value,
  onChange,
  disabled = false,
}: MobileGoalModeToggleProps) {
  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <FormLabel containerStyle={styles.formLabelWrap}>
          {t('goalModes.modeLabel')}
        </FormLabel>
        <InfoTooltip
          content={
            value === 'TARGET_DATE'
              ? t('goalModes.targetDateDesc')
              : t('goalModes.ongoingDesc')
          }
        />
      </View>
      <View style={styles.toggleRow}>
        <TouchableOpacity
          disabled={disabled}
          onPress={() => onChange('TARGET_DATE')}
          style={[
            styles.toggleBtn,
            value === 'TARGET_DATE' && styles.activeToggleBtn,
          ]}
        >
          <Feather
            name="calendar"
            size={14}
            color={
              value === 'TARGET_DATE'
                ? DESIGN_TOKENS.colors.sereneBlue
                : DESIGN_TOKENS.colors.slate[600]
            }
          />
          <Text
            style={[
              styles.btnText,
              value === 'TARGET_DATE' && styles.activeBtnText,
            ]}
          >
            {t('goalModes.targetDate')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={disabled}
          onPress={() => onChange('ONGOING')}
          style={[
            styles.toggleBtn,
            value === 'ONGOING' && styles.activeToggleBtn,
          ]}
        >
          <Feather
            name="repeat"
            size={14}
            color={
              value === 'ONGOING'
                ? DESIGN_TOKENS.colors.sereneBlue
                : DESIGN_TOKENS.colors.slate[600]
            }
          />
          <Text
            style={[
              styles.btnText,
              value === 'ONGOING' && styles.activeBtnText,
            ]}
          >
            {t('goalModes.ongoing')}
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
