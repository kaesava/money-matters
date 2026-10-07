import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

interface PaychecksSchedulesBannerProps {
  readonly onPress: () => void;
}

export const PaychecksSchedulesBanner: React.FC<PaychecksSchedulesBannerProps> = ({
  onPress,
}) => {
  return (
    <View style={styles.topControlSection}>
      <TouchableOpacity
        style={styles.prominentSchedulesButton}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <View style={styles.prominentSchedulesInner}>
          <View style={styles.prominentIconWrap}>
            <Feather name="calendar" size={18} color={DESIGN_TOKENS.colors.accent} />
          </View>
          <View style={styles.titleWrap}>
            <Text style={styles.prominentTitle}>
              {t('incomeBillsTabs.setupIncomeExpenseSchedules')}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={DESIGN_TOKENS.colors.slate[400]} />
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  topControlSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  prominentSchedulesButton: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 14,
    shadowColor: DESIGN_TOKENS.colors.accent,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 2,
  },
  prominentSchedulesInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prominentIconWrap: {
    width: 36,
    height: 36,
    borderRadius: DESIGN_TOKENS.radius.md,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: {
    flex: 1,
  },
  prominentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
});
