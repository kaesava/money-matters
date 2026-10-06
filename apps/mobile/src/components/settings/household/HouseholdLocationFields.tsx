import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { FormLabel, FormFieldError, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { SUPPORTED_COUNTRIES, AU_STATES } from '@money-matters/types';

export interface HouseholdLocationFieldsProps {
  country: string;
  setCountry: (val: string) => void;
  state: string;
  setState: (val: string) => void;
  postcode: string;
  setPostcode: (val: string) => void;
  postcodeError?: string;
}

export function HouseholdLocationFields({
  country,
  setCountry,
  state,
  setState,
  postcode,
  setPostcode,
  postcodeError,
}: HouseholdLocationFieldsProps) {
  const isAustralia = country === 'AU';

  return (
    <>
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
              placeholderTextColor={DESIGN_TOKENS.colors.subtleText}
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
            placeholderTextColor={DESIGN_TOKENS.colors.subtleText}
            keyboardType="numeric"
          />
          {postcodeError ? <FormFieldError error={postcodeError} /> : null}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
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
  chipFlag: {
    fontSize: 14,
    marginRight: 6,
  },
  chipText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[600],
  },
  chipTextSelected: {
    color: DESIGN_TOKENS.colors.sereneBlue,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});
