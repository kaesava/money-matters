import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { DESIGN_TOKENS } from '../tokens';
import { FormLabel } from './FormLabel';
import { FormFieldError } from './FormFieldError';

export interface ChipOption {
  key?: string;
  value?: string;
  label: string;
  subLabel?: string;
  flag?: string;
  icon?: React.ReactNode;
}

export interface ChipSelectProps {
  options: ChipOption[];
  value?: string;
  selectedValue?: string;
  onChange?: (key: string) => void;
  onSelect?: (key: string) => void;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  layout?: 'scroll' | 'wrap';
  containerStyle?: StyleProp<ViewStyle>;
}

export function ChipSelect({
  options,
  value,
  selectedValue,
  onChange,
  onSelect,
  label,
  required,
  error,
  disabled = false,
  layout = 'scroll',
  containerStyle,
}: ChipSelectProps) {
  const activeValue = selectedValue ?? value ?? '';
  const handleSelect = onSelect ?? onChange ?? (() => {});

  const content = options.map((opt) => {
    const optKey = opt.value ?? opt.key ?? '';
    const isSelected = optKey === activeValue;
    return (
      <TouchableOpacity
        key={optKey}
        onPress={() => !disabled && handleSelect(optKey)}
        activeOpacity={0.7}
        disabled={disabled}
        style={[
          styles.chip,
          isSelected && styles.chipActive,
          disabled && styles.chipDisabled,
        ]}
      >
        {opt.flag && <Text style={styles.flag}>{opt.flag} </Text>}
        {opt.icon && <View style={styles.icon}>{opt.icon}</View>}
        <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
          {opt.label}
        </Text>
        {opt.subLabel && (
          <Text style={[styles.subLabel, isSelected && styles.subLabelActive]}>
            {' '}{opt.subLabel}
          </Text>
        )}
      </TouchableOpacity>
    );
  });

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label && <FormLabel required={required}>{label}</FormLabel>}
      {layout === 'wrap' ? (
        <View style={styles.wrapContainer}>{content}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContainer}
        >
          {content}
        </ScrollView>
      )}
      <FormFieldError error={error} />
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginBottom: 12,
  },
  scrollContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  wrapContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 2,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: D.colors.sereneBlue,
    borderColor: D.colors.sereneBlue,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: D.colors.textMuted,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  subLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: D.colors.textMuted,
  },
  subLabelActive: {
    color: 'rgba(255, 255, 255, 0.85)',
  },
  flag: {
    fontSize: 14,
  },
  icon: {
    marginRight: 4,
  },
});

export default ChipSelect;
