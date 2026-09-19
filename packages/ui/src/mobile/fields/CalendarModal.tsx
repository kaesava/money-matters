import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '../../tokens';

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  value?: string; // YYYY-MM-DD
  onChange: (dateIso: string) => void;
  title?: string;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function padZero(num: number): string {
  return num < 10 ? `0${num}` : `${num}`;
}

function parseIso(isoStr?: string): Date {
  if (!isoStr) return new Date();
  const parts = isoStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return new Date(y, m, d);
    }
  }
  return new Date();
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${padZero(d.getMonth() + 1)}-${padZero(d.getDate())}`;
}

export function CalendarModal({
  visible,
  onClose,
  value,
  onChange,
  title,
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
    }> = [];

    // Previous month filler days
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        dayNum: d,
        isCurrentMonth: false,
        isoString: `${prevYear}-${padZero(prevMonth + 1)}-${padZero(d)}`,
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      days.push({
        dayNum: d,
        isCurrentMonth: true,
        isoString: `${viewYear}-${padZero(viewMonth + 1)}-${padZero(d)}`,
      });
    }

    // Next month filler days up to 42 (or 35 if fits in 5 rows)
    const totalSlots = days.length > 35 ? 42 : 35;
    const remaining = totalSlots - days.length;
    const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
    const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    for (let d = 1; d <= remaining; d++) {
      days.push({
        dayNum: d,
        isCurrentMonth: false,
        isoString: `${nextYear}-${padZero(nextMonth + 1)}-${padZero(d)}`,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const handleSelectDate = (iso: string) => {
    onChange(iso);
    onClose();
  };

  const handleSelectToday = () => {
    const today = toIso(new Date());
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
                  onPress={() => handleSelectDate(item.isoString)}
                  style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                    !isSelected && isToday && styles.dayCellToday,
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !item.isCurrentMonth && styles.dayTextMuted,
                      isSelected && styles.dayTextSelected,
                      !isSelected && isToday && styles.dayTextToday,
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 12,
    color: '#2563eb',
    fontWeight: '600',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 14,
  },
  navArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthYearText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: '#2563eb',
  },
  dayCellToday: {
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1E293B',
  },
  dayTextMuted: {
    color: '#CBD5E1',
  },
  dayTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#2563eb',
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
  },
  todayButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },
  doneButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#2563eb',
  },
  doneButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
