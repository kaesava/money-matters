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
  showShortcuts?: boolean;
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
  showShortcuts = true,
}: DatePickerFieldProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const todayIso = useMemo(() => toIso(new Date()), []);
  const yesterdayIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toIso(d);
  }, []);
  const tomorrowIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return toIso(d);
  }, []);

  const shortcuts = useMemo(
    () => [
      { label: t('common.today'), iso: todayIso },
      { label: t('common.yesterday'), iso: yesterdayIso },
      { label: t('common.tomorrow', { defaultValue: 'Tomorrow' }), iso: tomorrowIso },
    ],
    [todayIso, yesterdayIso, tomorrowIso]
  );

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

      {showShortcuts && !disabled && (
        <View style={styles.shortcutsRow}>
          {shortcuts.map((sc) => {
            const isActive = value === sc.iso;
            return (
              <TouchableOpacity
                key={sc.iso}
                onPress={() => onChange(sc.iso)}
                style={[styles.shortcutChip, isActive && styles.shortcutChipActive]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.shortcutChipText,
                    isActive && styles.shortcutChipTextActive,
                  ]}
                >
                  {sc.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

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
  shortcutsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  shortcutChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shortcutChipActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  shortcutChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  shortcutChipTextActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
});

export default DatePickerField;
