import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { FormLabel, SwitchRow, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { COMMON_TIMEZONES, SUPPORTED_LOCALES } from '@money-matters/types';

interface ProfilePreferencesFieldsProps {
  locale: string;
  setLocale: (val: string) => void;
  timezone: string;
  setTimezone: (val: string) => void;
  showIcons: boolean;
  setShowIcons: (val: boolean) => void;
}

export function ProfilePreferencesFields({
  locale,
  setLocale,
  timezone,
  setTimezone,
  showIcons,
  setShowIcons,
}: ProfilePreferencesFieldsProps) {
  return (
    <>
      {/* Locale Format Selection */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.dateFormat')} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
          {SUPPORTED_LOCALES.map((l) => {
            const isSelected = locale === l.code;
            return (
              <TouchableOpacity
                key={l.code}
                onPress={() => setLocale(l.code)}
                style={[styles.chip, isSelected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {l.label} ({l.dateFormatExample})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Timezone (COMMON_TIMEZONES) */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.items.timezone')} />
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

      {/* Show Icons Switch */}
      <SwitchRow
        label={t('settings.items.showIcons')}
        hint={t('settings.items.showIconsHint')}
        value={showIcons}
        onValueChange={setShowIcons}
      />
    </>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    gap: 6,
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
});
