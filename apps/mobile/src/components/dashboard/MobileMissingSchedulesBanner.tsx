import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';

export interface MobileMissingSchedulesBannerProps {
  readonly incomeCount: number;
  readonly billsCount: number;
}

export function MobileMissingSchedulesBanner({
  incomeCount,
  billsCount,
}: MobileMissingSchedulesBannerProps) {
  const router = useRouter();

  if (incomeCount > 0 && billsCount > 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.contentRow}>
        <View style={styles.iconWrap}>
          <Feather name="alert-circle" size={20} color="#D97706" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>
            {incomeCount === 0 && billsCount === 0
              ? t('dashboard.missingSchedulesBanner.incomeAndBillsHint')
              : incomeCount === 0
              ? t('dashboard.missingSchedulesBanner.incomeHint')
              : t('dashboard.missingSchedulesBanner.billsHint')}
          </Text>
          <Text style={styles.description}>
            {t('dashboard.missingSchedulesBanner.description')}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.ctaButton}
        onPress={() => router.push('/(app)/paychecks' as never)}
        activeOpacity={0.8}
      >
        <Text style={styles.ctaText}>
          {t('dashboard.missingSchedulesBanner.addSchedulesCta')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 6,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: '#92400E',
    lineHeight: 18,
  },
  description: {
    fontSize: 11,
    color: '#B45309',
    marginTop: 3,
    lineHeight: 15,
  },
  ctaButton: {
    backgroundColor: '#D97706',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});

export default MobileMissingSchedulesBanner;
