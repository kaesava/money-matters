import React from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { FormLabel, FormFieldError, DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface ProfileContactFieldsProps {
  name: string;
  setName: (val: string) => void;
  loginEmail?: string;
  notificationEmail: string;
  setNotificationEmail: (val: string) => void;
  phoneCountryCode: string;
  setPhoneCountryCode: (val: string) => void;
  phoneNumber: string;
  setPhoneNumber: (val: string) => void;
  phoneError?: string;
}

export function ProfileContactFields({
  name,
  setName,
  loginEmail,
  notificationEmail,
  setNotificationEmail,
  phoneCountryCode,
  setPhoneCountryCode,
  phoneNumber,
  setPhoneNumber,
  phoneError,
}: ProfileContactFieldsProps) {
  return (
    <>
      {/* Name (Mandatory) */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.displayNameLabel')} required />
        <TextInput
          style={styles.textInput}
          value={name}
          onChangeText={setName}
          placeholder={t('settings.displayNamePlaceholder')}
          placeholderTextColor={DESIGN_TOKENS.colors.subtleText}
        />
        {!name.trim() && (
          <FormFieldError error={t('settings.displayNameRequired')} />
        )}
      </View>

      {/* Login Email (Primary Auth - Read Only) */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.loginEmailLabel')} />
        <TextInput
          style={[styles.textInput, styles.readOnlyInput]}
          value={loginEmail || ''}
          editable={false}
          placeholder="user@example.com"
          placeholderTextColor={DESIGN_TOKENS.colors.subtleText}
        />
      </View>

      {/* Notification Email (Mandatory) */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.notificationEmailLabel')} required />
        <TextInput
          style={styles.textInput}
          value={notificationEmail}
          onChangeText={setNotificationEmail}
          placeholder="alerts@example.com"
          placeholderTextColor={DESIGN_TOKENS.colors.subtleText}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Text style={styles.hintText}>{t('settings.notificationEmailHint')}</Text>
      </View>

      {/* Phone Number */}
      <View style={styles.inputGroup}>
        <FormLabel label={t('settings.phoneNumberLabel')} />
        <View style={styles.phoneRow}>
          <TextInput
            style={styles.phoneCodeInput}
            value={phoneCountryCode}
            onChangeText={setPhoneCountryCode}
            placeholder="+61"
            placeholderTextColor={DESIGN_TOKENS.colors.subtleText}
          />
          <TextInput
            style={styles.phoneNumberInput}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="412 345 678"
            placeholderTextColor={DESIGN_TOKENS.colors.subtleText}
            keyboardType="phone-pad"
          />
        </View>
        {phoneError ? <FormFieldError error={phoneError} /> : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    gap: 6,
  },
  textInput: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: DESIGN_TOKENS.colors.primary,
  },
  readOnlyInput: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    color: DESIGN_TOKENS.colors.textMuted,
  },
  hintText: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 8,
  },
  phoneCodeInput: {
    width: 68,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: DESIGN_TOKENS.colors.primary,
    textAlign: 'center',
  },
  phoneNumberInput: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: DESIGN_TOKENS.colors.primary,
  },
});
