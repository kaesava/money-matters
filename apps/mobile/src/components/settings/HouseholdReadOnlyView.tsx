import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  SettingsCard,
  ReadOnlyField,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { SUPPORTED_CURRENCIES, SUPPORTED_COUNTRIES } from '@money-matters/types';

interface HouseholdReadOnlyViewProps {
  householdName: string;
  currency: string;
  timezone?: string;
  country: string;
  state: string;
  postcode: string;
  isOwner: boolean;
  onEdit: () => void;
}

export function HouseholdReadOnlyView({
  householdName,
  currency,
  timezone,
  country,
  state,
  postcode,
  isOwner,
  onEdit,
}: HouseholdReadOnlyViewProps) {
  const currencyConfig = SUPPORTED_CURRENCIES[currency];
  const countryConfig = SUPPORTED_COUNTRIES.find((c) => c.code === country);

  return (
    <SettingsCard
      title={t('settings.household.title')}
      tooltip={t('settings.householdTooltip')}
      action={
        isOwner ? (
          <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
            <Feather name="edit-2" size={13} color={DESIGN_TOKENS.colors.sereneBlue} />
            <Text style={styles.editBtnText}>{t('common.edit')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>{t('settings.members.roleMember')}</Text>
          </View>
        )
      }
    >
      <View style={styles.detailsList}>
        <ReadOnlyField label={t('auth.householdNameLabel')} value={householdName} />
        <ReadOnlyField
          label={t('settings.currency')}
          value={currencyConfig ? `${currencyConfig.name} (${currencyConfig.symbol})` : currency}
        />
        <ReadOnlyField
          label={t('settings.timezone')}
          value={timezone || 'Australia/Sydney'}
        />
        <ReadOnlyField
          label={t('auth.countryLabel')}
          value={countryConfig ? `${countryConfig.flag} ${countryConfig.name}` : country}
        />
        <ReadOnlyField label={t('settings.household.stateLabel')} value={state} />
        <ReadOnlyField label={t('settings.household.postcodeLabel')} value={postcode} />
      </View>
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  memberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderRadius: 6,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  detailsList: {
    gap: 4,
  },
});
