import React from 'react';
import { View as RNView, Text as RNText, TouchableOpacity as RNTouchableOpacity, TextInput as RNTextInput, StyleSheet as RNStyleSheet } from 'react-native';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '../../tokens';
import { useRecurrenceBuilder } from '../../hooks/useRecurrenceBuilder';
import { DatePickerField } from './DatePickerField';

interface RecurrenceBuilderProps {
  builder: ReturnType<typeof useRecurrenceBuilder>;
}

export function RecurrenceBuilder({ builder }: RecurrenceBuilderProps) {
  const {
    isRecurring,
    setIsRecurring,
    frequency,
    setFrequency,
    interval,
    setInterval,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
  } = builder;

  return (
    <RNView style={styles.container}>
      <RNView style={styles.formGroup}>
        <RNText style={styles.label}>{t("forms.scheduleType")}</RNText>
        <RNView style={styles.row}>
          <RNTouchableOpacity
            onPress={() => setIsRecurring(true)}
            style={[styles.typeBtn, isRecurring && styles.typeBtnActive]}
          >
            <RNText style={[styles.typeBtnText, isRecurring && styles.typeBtnTextActive]}>{t("forms.recurring")}</RNText>
          </RNTouchableOpacity>
          <RNTouchableOpacity
            onPress={() => setIsRecurring(false)}
            style={[styles.typeBtn, !isRecurring && styles.typeBtnActive]}
          >
            <RNText style={[styles.typeBtnText, !isRecurring && styles.typeBtnTextActive]}>{t("forms.oneOff")}</RNText>
          </RNTouchableOpacity>
        </RNView>
      </RNView>

      {isRecurring && (
        <>
          <RNView style={styles.formGroup}>
            <RNText style={styles.label}>{t("forms.frequency")}</RNText>
            <RNView style={styles.freqRow}>
              {(['WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'ANNUALLY'] as const).map((freq) => (
                <RNTouchableOpacity
                  key={freq}
                  onPress={() => {
                    setFrequency(freq);
                    setInterval(1);
                  }}
                  style={[styles.typeBtn, frequency === freq && styles.typeBtnActive, { flex: 1, paddingVertical: 6 }]}
                >
                  <RNText style={[styles.typeBtnText, { fontSize: 10 }, frequency === freq && styles.typeBtnTextActive]}>
                    {freq === 'WEEKLY'
                      ? t("forms.weekly")
                      : freq === 'FORTNIGHTLY'
                      ? t("forms.fortnightly")
                      : freq === 'MONTHLY'
                      ? t("forms.monthly")
                      : t("forms.yearly")}
                  </RNText>
                </RNTouchableOpacity>
              ))}
            </RNView>
          </RNView>

          <RNView style={styles.formGroup}>
            <RNText style={styles.label}>
              {frequency === "MONTHLY" || frequency === "WEEKLY" ? t("forms.every") : t("forms.interval")}
            </RNText>
            <RNView style={[styles.row, { alignItems: 'center' }]}>
              <RNTextInput
                value={String(interval)}
                onChangeText={(text) => setInterval(parseInt(text) || 1)}
                keyboardType="numeric"
                editable={frequency !== "FORTNIGHTLY" && frequency !== "ANNUALLY"}
                style={[styles.input, { flex: 1, backgroundColor: (frequency === "FORTNIGHTLY" || frequency === "ANNUALLY") ? '#f4f4f5' : '#FFF' }]}
              />
              <RNText style={[styles.label, { width: 60, marginLeft: 10 }]}>
                {frequency === "WEEKLY" ? t("forms.weeks") : frequency === "MONTHLY" ? t("forms.months") : ""}
              </RNText>
            </RNView>
          </RNView>
        </>
      )}

      <DatePickerField
        label={isRecurring ? t("forms.firstPaymentDueDate") : t("forms.eventDate")}
        value={startDate}
        onChange={setStartDate}
        required
      />

      {isRecurring && (
        <DatePickerField
          label={t("forms.endDateOptional")}
          value={endDate || ""}
          onChange={(val) => setEndDate(val || null)}
        />
      )}
    </RNView>
  );
}

const styles = RNStyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#f4f4f5',
    paddingTop: 12,
    marginTop: 4,
  },
  formGroup: { gap: 6, marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.textPrimary },
  row: { flexDirection: 'row', gap: 8 },
  freqRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: DESIGN_TOKENS.radius.md,
    backgroundColor: '#F4F4F5',
  },
  typeBtnActive: {
    backgroundColor: DESIGN_TOKENS.colors.primary,
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#52525B',
  },
  typeBtnTextActive: {
    color: '#FFF',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 12,
    fontSize: 14,
    color: DESIGN_TOKENS.colors.textPrimary,
    fontWeight: '600',
  },
});
