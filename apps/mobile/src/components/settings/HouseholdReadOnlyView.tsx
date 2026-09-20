import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { SUPPORTED_CURRENCIES, SUPPORTED_COUNTRIES } from '@money-matters/types';

interface HouseholdReadOnlyViewProps {
  householdName: string;
  currency: string;
  country: string;
  state: string;
  postcode: string;
  isOwner: boolean;
  onEdit: () => void;
}

export function HouseholdReadOnlyView({
  householdName,
  currency,
  country,
  state,
  postcode,
  isOwner,
  onEdit,
}: HouseholdReadOnlyViewProps) {
  const router = useRouter();
  const currencyConfig = SUPPORTED_CURRENCIES[currency];
  const countryConfig = SUPPORTED_COUNTRIES.find((c) => c.code === country);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Household Profile & Location</Text>
        {isOwner ? (
          <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
            <Feather name="edit-2" size={13} color={DESIGN_TOKENS.colors.sereneBlue} />
            <Text style={styles.editBtnText}>{t('common.edit')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>Member View</Text>
          </View>
        )}
      </View>

      <Text style={styles.cardSubtitle}>
        Shared across all household members for budget calculations and tax year alignment.
      </Text>

      <View style={styles.detailsGrid}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Household Name</Text>
          <Text style={styles.detailValue}>{householdName || '—'}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>{t('settings.currency')}</Text>
          <Text style={styles.detailValue}>
            {currencyConfig ? `${currencyConfig.name} (${currencyConfig.symbol})` : currency}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Country</Text>
          <Text style={styles.detailValue}>
            {countryConfig ? `${countryConfig.flag} ${countryConfig.name}` : country}
          </Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>State / Region</Text>
          <Text style={styles.detailValue}>{state || '—'}</Text>
        </View>

        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Postal / ZIP Code</Text>
          <Text style={styles.detailValue}>{postcode || '—'}</Text>
        </View>
      </View>

      {/* Household Budget Re-calibration Section */}
      <View style={styles.recalibrateCard}>
        <View style={styles.recalibrateInfo}>
          <Text style={styles.recalibrateTitle}>⚙️ {t('setup.recalibrateTitle')}</Text>
          <Text style={styles.recalibrateSubtitle}>{t('setup.recalibrateSubtitle')}</Text>
        </View>
        <TouchableOpacity
          style={styles.recalibrateBtn}
          onPress={() => router.push({ pathname: '/(setup)/income', params: { mode: 'rerun' } } as never)}
          activeOpacity={0.8}
        >
          <Text style={styles.recalibrateBtnText}>{t('setup.recalibrateTitle')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  card: {
    backgroundColor: D.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: D.colors.border,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: D.colors.primary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: D.colors.textMuted,
    lineHeight: 16,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: D.colors.surfaceVariant,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: D.colors.sereneBlue,
  },
  memberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: D.colors.surfaceVariant,
    borderRadius: 6,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: D.colors.textMuted,
  },
  detailsGrid: {
    gap: 8,
  },
  detailItem: {
    backgroundColor: D.colors.background,
    borderWidth: 1,
    borderColor: D.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: D.colors.textMuted,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: D.colors.primary,
    marginTop: 2,
  },
  recalibrateCard: {
    backgroundColor: D.colors.background,
    borderWidth: 1,
    borderColor: D.colors.border,
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginTop: 4,
  },
  recalibrateInfo: {
    gap: 2,
  },
  recalibrateTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: D.colors.primary,
  },
  recalibrateSubtitle: {
    fontSize: 11,
    color: D.colors.textMuted,
    lineHeight: 15,
  },
  recalibrateBtn: {
    alignSelf: 'flex-start',
    backgroundColor: D.colors.surface,
    borderWidth: 1,
    borderColor: D.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  recalibrateBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: D.colors.primary,
  },
});
