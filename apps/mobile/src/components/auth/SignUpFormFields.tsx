import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { t } from "@money-matters/i18n";
import {
  DESIGN_TOKENS,
  MobileInput,
  FormLabel,
} from "@money-matters/ui/mobile";
import { SUPPORTED_COUNTRIES, COMMON_TIMEZONES } from "@money-matters/types";
import { MobilePasswordStrength } from "./MobilePasswordStrength";

interface SignUpFormFieldsProps {
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  country: string;
  onCountryChange: (v: string) => void;
  currency?: string;
  setCurrency?: (v: string) => void;
  timezone: string;
  setTimezone: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  fieldErrors: {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };
  setFieldErrors: React.Dispatch<React.SetStateAction<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    agreeTerms?: string;
  }>>;
}

export function SignUpFormFields({
  name,
  setName,
  email,
  setEmail,
  country,
  onCountryChange,
  timezone,
  setTimezone,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  fieldErrors,
  setFieldErrors,
}: SignUpFormFieldsProps) {

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <View style={styles.container}>
      {/* Name */}
      <View style={styles.inputGroup}>
        <FormLabel required={true}>{t("auth.nameLabel")}</FormLabel>
        <MobileInput
          value={name}
          onChangeText={(val) => {
            setName(val);
            if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholder={t("auth.namePlaceholder")}
          autoComplete="name"
          textContentType="name"
          error={fieldErrors.name}
        />
      </View>

      {/* Country selector */}
      <View style={styles.inputGroup}>
        <FormLabel required={true}>{t("auth.countryLabel")}</FormLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryRow}>
          {SUPPORTED_COUNTRIES.map((c) => {
            const isSelected = country === c.code;
            return (
              <TouchableOpacity
                key={c.code}
                onPress={() => onCountryChange(c.code)}
                style={[styles.countryChip, isSelected && styles.countryChipSelected]}
              >
                <Text style={styles.countryFlag}>{c.flag}</Text>
                <Text style={[styles.countryText, isSelected && styles.countryTextSelected]}>
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Timezone Selector */}

      <View style={styles.inputGroup}>
        <FormLabel required={true}>{t("settings.timezone")}</FormLabel>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryRow}>
          {COMMON_TIMEZONES.map((tz) => {
            const isSelected = timezone === tz.value;
            return (
              <TouchableOpacity
                key={tz.value}
                onPress={() => setTimezone(tz.value)}
                style={[styles.countryChip, isSelected && styles.countryChipSelected]}
              >
                <Text style={[styles.countryText, isSelected && styles.countryTextSelected]}>
                  {tz.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Email */}
      <View style={styles.inputGroup}>
        <FormLabel required={true}>{t("auth.emailLabel")}</FormLabel>
        <MobileInput
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
          }}
          placeholder={t("auth.emailPlaceholder")}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          error={fieldErrors.email}
        />
      </View>

      {/* Password */}
      <View style={styles.inputGroup}>
        <FormLabel required={true}>{t("auth.passwordLabel")}</FormLabel>
        <MobileInput
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
          }}
          placeholder={t("auth.passwordPlaceholder")}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          error={fieldErrors.password}
        />
        {password.length > 0 && <MobilePasswordStrength password={password} />}
      </View>

      {/* Confirm Password */}
      <View style={styles.inputGroup}>
        <FormLabel required={true}>{t("auth.confirmPasswordLabel")}</FormLabel>
        <MobileInput
          value={confirmPassword}
          onChangeText={(val) => {
            setConfirmPassword(val);
            if (fieldErrors.confirmPassword)
              setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          placeholder={t("auth.confirmPasswordPlaceholder")}
          secureTextEntry
          autoComplete="new-password"
          textContentType="newPassword"
          error={fieldErrors.confirmPassword || (passwordMismatch ? t("auth.passwordsMustMatch") : undefined)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  inputGroup: { gap: 4 },
  countryRow: { flexDirection: "row", marginVertical: 4 },
  countryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  countryChipSelected: {
    borderColor: DESIGN_TOKENS.colors.accent,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
  },
  countryFlag: { fontSize: 16, marginRight: 6 },
  countryText: { fontSize: 13, color: DESIGN_TOKENS.colors.textPrimary },
  countryTextSelected: { color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
});
