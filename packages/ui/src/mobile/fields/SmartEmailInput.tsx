import React, { useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SmartEmailInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string | null;
}

function EmailIcon({ color }: { color: string }): React.JSX.Element {
  return <Feather name="mail" size={20} color={color} />;
}


export function SmartEmailInput({
  label,
  value,
  onChangeText,
  placeholder,
  error,
}: SmartEmailInputProps): React.JSX.Element {
  const cleanEmail = useMemo(() => value.trim(), [value]);

  const validation = useMemo(() => {
    if (!cleanEmail) return { isValid: true, message: null };
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(cleanEmail)) {
      return { isValid: false, message: 'Invalid email address format' };
    }
    return { isValid: true, message: null };
  }, [cleanEmail]);

  const handleEmail = () => {
    if (cleanEmail) {
      Linking.openURL(`mailto:${cleanEmail}`);
    }
  };

  const hasValidationError = !validation.isValid;
  const isButtonActive = !!cleanEmail && validation.isValid;

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
          keyboardType="email-address"
          autoCorrect={false}
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[
            styles.actionButton,
            isButtonActive ? styles.actionButtonActive : styles.actionButtonDisabled
          ]}
          disabled={!isButtonActive}
          onPress={handleEmail}
          activeOpacity={0.7}
        >
          <EmailIcon color={isButtonActive ? '#ffffff' : '#94a3b8'} />
        </TouchableOpacity>
      </View>

      {hasValidationError && (
        <Text style={styles.errorText}>{validation.message}</Text>
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
