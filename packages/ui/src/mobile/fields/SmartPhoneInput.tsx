import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SmartPhoneInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  country?: string;
  error?: string | null;
}

function PhoneIcon({ color }: { color: string }): React.JSX.Element {
  return (
    // @ts-ignore
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      {/* @ts-ignore */}
      <Path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </Svg>
  );
}


export function SmartPhoneInput({
  label,
  value,
  onChangeText,
  placeholder,
  country = 'Australia',
  error,
}: SmartPhoneInputProps): React.JSX.Element {
  const cleanNumber = useMemo(() => value.replace(/[\s\-()]/g, ''), [value]);

  const validation = useMemo(() => {
    if (!cleanNumber) return { isValid: true, message: null };
    if (country === 'Australia') {
      const ausRegex = /^(?:\+61|0)[2-478][0-9]{8}$/;
      if (!ausRegex.test(cleanNumber)) {
        return { isValid: false, message: 'Invalid Australian phone format' };
      }
    }
    return { isValid: true, message: null };
  }, [cleanNumber, country]);

  const handleCall = () => {
    if (cleanNumber) {
      Linking.openURL(`tel:${cleanNumber}`);
    }
  };

  const hasValidationError = !validation.isValid;
  const isButtonActive = !!cleanNumber && validation.isValid;

  return (
    <View style={styles.container}>
      <Text style={styles.uiLabel}>{label}</Text>
      
      <View style={styles.inputWrapper}>
        <TextInput
          style={[
            styles.uiInput, 
            styles.input,
            hasValidationError || error ? styles.inputError : null
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          keyboardType="phone-pad"
          autoCorrect={false}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[
            styles.actionButton,
            isButtonActive ? styles.actionButtonActive : styles.actionButtonDisabled
          ]}
          disabled={!isButtonActive}
          onPress={handleCall}
          activeOpacity={0.7}
        >
          <PhoneIcon color={isButtonActive ? '#ffffff' : '#94a3b8'} />
        </TouchableOpacity>
      </View>

      {hasValidationError && (
        <Text style={styles.errorText}>
          {country === 'Australia' 
            ? 'Invalid Australian phone format (e.g. 0412345678 or +61298765432)' 
            : 'Invalid phone format'}
        </Text>
      )}
      {error && !hasValidationError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  uiLabel: { 
    fontSize: 14, 
    fontWeight: '500', 
    color: '#1e293b', 
    marginBottom: 8,
  },
  uiInput: { 
    backgroundColor: '#ffffff', 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    borderRadius: 8, 
    padding: 16, 
    fontSize: 16, 
    color: '#1e293b', 
    marginBottom: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginBottom: 0,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    height: 54,
  },
  inputError: {
    borderColor: '#ef4444',
  },
  actionButton: {
    height: 54,
    width: 54,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderLeftWidth: 0,
  },
  actionButtonActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  actionButtonDisabled: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
});
