import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  value?: string; // YYYY-MM-DD
  onChange: (dateIso: string) => void;
  title?: string;
  minDate?: string;
  maxDate?: string;
}

import {
  WEEKDAYS,
  MONTH_NAMES,
  padZero,
  parseIso,
  toIso,
} from './CalendarModalHelpers';
import { styles } from './CalendarModalStyles';

export function CalendarModal({
  visible,
  onClose,
  value,
  onChange,
  title,
  minDate,
  maxDate,
}: CalendarModalProps) {
  const selectedDate = useMemo(() => parseIso(value), [value]);
  const [viewYear, setViewYear] = useState(() => selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => selectedDate.getMonth());

  // Reset viewing month/year whenever modal opens or value changes
  React.useEffect(() => {
    if (visible) {
      const d = parseIso(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [visible, value]);

  const todayStr = useMemo(() => toIso(new Date()), []);
  const selectedStr = useMemo(() => (value ? toIso(parseIso(value)) : ''), [value]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Build grid days (42 slots: 6 weeks x 7 days)
  const daysInGrid = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    // Sunday is 0, Monday is 1 in JS getDay(). Convert so Monday is 0.
    const startDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      dayNum: number;
      isCurrentMonth: boolean;
      isoString: string;
      isDisabled: boolean;
    }> = [];

    // Previous month filler days
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const iso = `${prevYear}-${padZero(prevMonth + 1)}-${padZero(d)}`;
      const isDisabled = Boolean((minDate && iso < minDate) || (maxDate && iso > maxDate));
      days.push({
        dayNum: d,
        isCurrentMonth: false,
        isoString: iso,
        isDisabled,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const iso = `${viewYear}-${padZero(viewMonth + 1)}-${padZero(d)}`;
      const isDisabled = Boolean((minDate && iso < minDate) || (maxDate && iso > maxDate));
      days.push({
        dayNum: d,
        isCurrentMonth: true,
        isoString: iso,
        isDisabled,
      });
    }

    // Next month filler days up to 42 (or 35 if fits in 5 rows)
    const totalSlots = days.length > 35 ? 42 : 35;
    const remaining = totalSlots - days.length;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    for (let d = 1; d <= remaining; d++) {
      const iso = `${nextYear}-${padZero(nextMonth + 1)}-${padZero(d)}`;
      const isDisabled = Boolean((minDate && iso < minDate) || (maxDate && iso > maxDate));
      days.push({
        dayNum: d,
        isCurrentMonth: false,
        isoString: iso,
        isDisabled,
      });
    }

    return days;
  }, [viewYear, viewMonth, minDate, maxDate]);

  const handleSelectDate = (iso: string, isDisabled?: boolean) => {
    if (isDisabled) return;
    onChange(iso);
    onClose();
  };

  const handleSelectToday = () => {
    const today = toIso(new Date());
    if ((minDate && today < minDate) || (maxDate && today > maxDate)) return;
    onChange(today);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{title || t('common.date')}</Text>
              <Text style={styles.subtitle}>
                {selectedStr ? parseIso(selectedStr).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Feather name="x" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Month / Year Navigator */}
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={handlePrevMonth}
              style={styles.navArrow}
              activeOpacity={0.7}
            >
              <Feather name="chevron-left" size={20} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.monthYearText}>
              {MONTH_NAMES[viewMonth]} {viewYear}
            </Text>
            <TouchableOpacity
              onPress={handleNextMonth}
              style={styles.navArrow}
              activeOpacity={0.7}
            >
              <Feather name="chevron-right" size={20} color="#1E293B" />
            </TouchableOpacity>
          </View>

          {/* Weekday Labels */}
          <View style={styles.weekdayRow}>
            {WEEKDAYS.map((wd, i) => (
              <Text key={i} style={styles.weekdayText}>
                {wd}
              </Text>
            ))}
          </View>

          {/* Day Grid */}
          <View style={styles.grid}>
            {daysInGrid.map((item, idx) => {
              const isSelected = item.isoString === selectedStr;
              const isToday = item.isoString === todayStr;

              return (
                <TouchableOpacity
                  key={idx}
                  disabled={item.isDisabled}
                  onPress={() => handleSelectDate(item.isoString, item.isDisabled)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    !isSelected && isToday && styles.dayCellToday,
                    item.isDisabled && { opacity: 0.3 },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !item.isCurrentMonth && styles.dayTextMuted,
                      isSelected && styles.dayTextSelected,
                      !isSelected && isToday && styles.dayTextToday,
                      item.isDisabled && { color: '#CBD5E1' },
                    ]}
                  >
                    {item.dayNum}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Quick Action Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleSelectToday}
              style={styles.todayButton}
              activeOpacity={0.7}
            >
              <Feather name="calendar" size={14} color="#2563eb" />
              <Text style={styles.todayButtonText}>{t('common.today')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onClose}
              style={styles.doneButton}
              activeOpacity={0.7}
            >
              <Text style={styles.doneButtonText}>{t('common.save')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

