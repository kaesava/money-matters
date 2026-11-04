import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS } from '../tokens';
import { useCurrencyLocale } from '../hooks/CurrencyLocaleContext';
import { formatAmountNumber } from '../lib/format';

export interface MobileDiscretionarySlidersProps {
  weeklyGroceries: number;
  setWeeklyGroceries: (val: number) => void;
  weeklyDining: number;
  setWeeklyDining: (val: number) => void;
  weeklyPersonal: number;
  setWeeklyPersonal: (val: number) => void;
  isZeroBased?: boolean;
}

interface SliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (val: number) => void;
}

function SliderRow({ label, value, min, max, step = 10, onChange }: SliderRowProps) {
  const D = DESIGN_TOKENS;
  const { currencySymbol, locale } = useCurrencyLocale();
  const trackWidthRef = useRef<number>(200);

  const clampValue = (raw: number) => {
    const stepped = Math.round(raw / step) * step;
    return Math.max(min, Math.min(max, stepped));
  };

  const handleStepChange = (delta: number) => {
    onChange(clampValue(value + delta));
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const x = evt.nativeEvent.locationX;
        const width = trackWidthRef.current || 200;
        const ratio = Math.max(0, Math.min(1, x / width));
        const newVal = min + ratio * (max - min);
        onChange(clampValue(newVal));
      },
      onPanResponderMove: (evt) => {
        const x = evt.nativeEvent.locationX;
        const width = trackWidthRef.current || 200;
        const ratio = Math.max(0, Math.min(1, x / width));
        const newVal = min + ratio * (max - min);
        onChange(clampValue(newVal));
      },
    })
  ).current;

  const onTrackLayout = (e: LayoutChangeEvent) => {
    trackWidthRef.current = e.nativeEvent.layout.width;
  };

  const percentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <View style={styles.sliderCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardValue}>
          {currencySymbol}{formatAmountNumber(String(value), locale, 0)}/wk
        </Text>
      </View>

      <View style={styles.controlRow}>
        <TouchableOpacity
          onPress={() => handleStepChange(-step)}
          style={[styles.stepperBtn, value <= min && styles.stepperDisabled]}
          disabled={value <= min}
          activeOpacity={0.7}
        >
          <Feather name="minus" size={14} color={value <= min ? D.colors.slate[400] : D.colors.accent} />
        </TouchableOpacity>

        <View
          style={styles.trackContainer}
          onLayout={onTrackLayout}
          {...panResponder.panHandlers}
        >
          <View style={styles.trackBackground}>
            <View style={[styles.trackFill, { width: `${percentage}%` }]} />
          </View>
          <View style={[styles.thumb, { left: `${percentage}%` }]} />
        </View>

        <TouchableOpacity
          onPress={() => handleStepChange(step)}
          style={[styles.stepperBtn, value >= max && styles.stepperDisabled]}
          disabled={value >= max}
          activeOpacity={0.7}
        >
          <Feather name="plus" size={14} color={value >= max ? D.colors.slate[400] : D.colors.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export function MobileDiscretionarySliders({
  weeklyGroceries,
  setWeeklyGroceries,
  weeklyDining,
  setWeeklyDining,
  weeklyPersonal,
  setWeeklyPersonal,
  isZeroBased = false,
}: MobileDiscretionarySlidersProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{t('setup.lifestyle.spendingTitle')}</Text>

      <SliderRow
        label={t('setup.lifestyle.groceries')}
        value={weeklyGroceries}
        min={isZeroBased ? 0 : 100}
        max={600}
        step={10}
        onChange={setWeeklyGroceries}
      />

      <SliderRow
        label={t('setup.lifestyle.dining')}
        value={weeklyDining}
        min={isZeroBased ? 0 : 50}
        max={500}
        step={10}
        onChange={setWeeklyDining}
      />

      <SliderRow
        label={t('setup.lifestyle.personalBuffer')}
        value={weeklyPersonal}
        min={isZeroBased ? 0 : 20}
        max={400}
        step={10}
        onChange={setWeeklyPersonal}
      />
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: {
    backgroundColor: D.colors.surface,
    padding: 14,
    borderRadius: D.radius.lg,
    borderWidth: 1,
    borderColor: D.colors.slate[200],
    marginBottom: 12,
  },
  heading: {
    fontSize: 13,
    fontWeight: '800',
    color: D.colors.primary,
    marginBottom: 12,
  },
  sliderCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: D.colors.primary,
  },
  cardValue: {
    fontSize: 13,
    fontWeight: '800',
    color: D.colors.accent,
    fontFamily: 'monospace',
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperDisabled: {
    opacity: 0.4,
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  trackContainer: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    position: 'relative',
  },
  trackBackground: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    backgroundColor: D.colors.accent,
    borderRadius: 3,
  },
  thumb: {
    position: 'absolute',
    top: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: D.colors.accent,
    marginLeft: -10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
  },
});
