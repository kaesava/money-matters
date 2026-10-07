import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import {
  MobileButton,
  FormLabel,
  FormFieldError,
  DESIGN_TOKENS,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import {
  SUPPORTED_CURRENCIES,
  COMMON_TIMEZONES,
} from '@money-matters/types';
import { HouseholdLocationFields } from './household/HouseholdLocationFields';

interface HouseholdEditViewProps {
  householdName: string;
  setHouseholdName: (val: string) => void;
  currency: string;
  onSelectCurrency: (val: string) => void;
  timezone: string;
  setTimezone: (val: string) => void;
  country: string;
  setCountry: (val: string) => void;
  state: string;
  setState: (val: string) => void;
  postcode: string;
  setPostcode: (val: string) => void;
  postcodeError?: string;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function HouseholdEditView({
  householdName,
  setHouseholdName,
  currency,
  onSelectCurrency,
  timezone,
  setTimezone,
  country,
  setCountry,
  state,
  setState,
  postcode,
  setPostcode,
  postcodeError,
  saving,
  onSave,
  onCancel,
}: HouseholdEditViewProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>{t('settings.editHouseholdTitle')}</Text>
        <View style={styles.actionRow}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Household Name */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('auth.householdNameLabel')} required />
        <TextInput
          style={styles.textInput}
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder={t('auth.householdNamePlaceholder')}
          placeholderTextColor={DESIGN_TOKENS.colors.subtleText}
        />
        {!householdName.trim() && (
          <FormFieldError error={t('auth.householdNameRequired')} />
        )}
      </View>

      {/* Currency Display (Locked) */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.currency')} required />
        <View style={styles.lockedRow}>
          <Text style={styles.lockedText}>🔒 {currency}</Text>
        </View>
        <Text style={styles.helperText}>{t('settings.currencyLockedTooltip')}</Text>
      </View>

      {/* Timezone Selector */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.timezone')} required />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          {COMMON_TIMEZONES.map((tz) => {
            const isSelected = timezone === tz.value;
            return (
              <TouchableOpacity
                key={tz.value}
                onPress={() => setTimezone(tz.value)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {tz.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Location Fields (Country, State, Postcode) */}
      <HouseholdLocationFields
        country={country}
        setCountry={setCountry}
        state={state}
        setState={setState}
        postcode={postcode}
        setPostcode={setPostcode}
        postcodeError={postcodeError}
      />

      {/* Footer Actions */}
      <View style={styles.footerRow}>
        <MobileButton
          variant="secondary"
          label={t('common.cancel')}
          onPress={onCancel}
        />
        <MobileButton
          variant="primary"
          label={t('settings.saveHouseholdCta')}
          onPress={onSave}
          loading={saving}
          disabled={saving || !householdName.trim()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    padding: 16,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  inputGroup: {
    gap: 6,
  },
  textInput: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: DESIGN_TOKENS.colors.primary,
  },
  scrollRow: {
    flexDirection: 'row',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    backgroundColor: DESIGN_TOKENS.colors.background,
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  chipText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[600],
  },
  chipTextSelected: {
    color: DESIGN_TOKENS.colors.sereneBlue,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  lockedRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
  },
  lockedText: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.slate[600],
    fontWeight: '600',
  },
  helperText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[500],
    lineHeight: 15,
  },
});
