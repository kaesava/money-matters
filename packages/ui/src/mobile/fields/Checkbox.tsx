import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface MobileCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function MobileCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
}: MobileCheckboxProps) {
  return (
    <TouchableOpacity
      onPress={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={styles.container}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <View
        style={[
          styles.box,
          checked && styles.boxChecked,
          disabled && styles.boxDisabled,
        ]}
      >
        {checked && <Feather name="check" size={14} color="#FFFFFF" />}
      </View>
      {label ? (
        <Text
          style={[
            styles.label,
            disabled && styles.labelDisabled,
          ]}
        >
          {label}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44, // 44dp touch target
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  boxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  boxDisabled: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
  },
  label: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '500',
    flex: 1,
  },
  labelDisabled: {
    color: '#94A3B8',
  },
});

export default MobileCheckbox;
