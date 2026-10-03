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
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_COUNTRIES,
  COMMON_TIMEZONES,
  AU_STATES,
} from '@money-matters/types';

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
  const isAustralia = country === 'AU';

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
          placeholderTextColor="#94A3B8"
        />
        {!householdName.trim() && (
          <FormFieldError error={t('auth.householdNameRequired')} />
        )}
      </View>

      {/* Currency Selector */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.currency')} required />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          {Object.values(SUPPORTED_CURRENCIES).map((c) => {
            const isSelected = currency === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                onPress={() => onSelectCurrency(c.code)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {c.code} ({c.symbol})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Timezone Selector (COMMON_TIMEZONES) */}
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

      {/* Country Selector */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('auth.countryLabel')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          {SUPPORTED_COUNTRIES.map((c) => {
            const isSelected = country === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                onPress={() => setCountry(c.code)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={styles.chipFlag}>{c.flag}</Text>
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* State & Postcode */}
      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 1 }]}>
          <FormLabel label={t('settings.household.stateLabel')} />
          {isAustralia ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
              {AU_STATES.map((st) => (
                <TouchableOpacity
                  key={st.code}
                  onPress={() => setState(st.code)}
                  style={[styles.chip, state === st.code && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, state === st.code && styles.chipTextSelected]}>
                    {st.code}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <TextInput
              style={styles.textInput}
              value={state}
              onChangeText={setState}
              placeholder="e.g. CA"
              placeholderTextColor="#94A3B8"
            />
          )}
        </View>

        <View style={[styles.inputGroup, { flex: 1 }]}>
          <FormLabel label={t('settings.household.postcodeLabel')} />
          <TextInput
            style={styles.textInput}
            value={postcode}
            onChangeText={setPostcode}
            placeholder={isAustralia ? '2000' : '90210'}
            placeholderTextColor="#94A3B8"
            keyboardType="numeric"
          />
          {postcodeError ? <FormFieldError error={postcodeError} /> : null}
        </View>
      </View>

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
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    color: '#1B2B4B',
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
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  inputGroup: {
    gap: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1B2B4B',
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
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    marginRight: 8,
  },
  chipSelected: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563eb',
  },
  chipFlag: {
    fontSize: 14,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    color: '#475569',
  },
  chipTextSelected: {
    color: '#2563eb',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
