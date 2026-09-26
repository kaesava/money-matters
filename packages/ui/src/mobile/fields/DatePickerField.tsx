import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import FormLabel from '../FormLabel';
import FormFieldError from '../FormFieldError';
import { CalendarModal } from './CalendarModal';

export interface DatePickerFieldProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (isoDate: string) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

function formatDisplayDate(isoDate?: string): string {
  if (!isoDate) return 'Select date';
  const parts = isoDate.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      const dateObj = new Date(y, m, d);
      return dateObj.toLocaleDateString('en-AU', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return isoDate;
}

export function DatePickerField({
  label,
  value,
  onChange,
  required = false,
  error,
  disabled = false,
}: DatePickerFieldProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      {label ? <FormLabel required={required}>{label}</FormLabel> : null}

      <TouchableOpacity
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
        style={[
          styles.fieldCard,
          error ? styles.fieldCardError : null,
          disabled ? styles.fieldCardDisabled : null,
        ]}
        activeOpacity={0.7}
      >
        <View style={styles.iconBox}>
          <Feather name="calendar" size={18} color="#2563eb" />
        </View>

        <Text
          style={[
            styles.dateText,
            !value ? styles.datePlaceholder : null,
            disabled ? styles.textDisabled : null,
          ]}
        >
          {formatDisplayDate(value)}
        </Text>

        <Feather name="chevron-down" size={18} color="#94A3B8" />
      </TouchableOpacity>

      <FormFieldError error={error} />

      <CalendarModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        value={value}
        onChange={onChange}
        title={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
  },
  fieldCardError: {
    borderColor: '#EF4444',
  },
  fieldCardDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  datePlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
  textDisabled: {
    color: '#94A3B8',
  },
});

export default DatePickerField;
