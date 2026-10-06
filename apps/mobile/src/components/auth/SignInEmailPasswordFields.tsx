import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { t } from "@money-matters/i18n";
import {
  DESIGN_TOKENS,
  MobileInput,
  FormLabel,
} from "@money-matters/ui/mobile";

interface SignInEmailPasswordFieldsProps {
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  fieldErrors: { email?: string; password?: string };
  setFieldErrors: React.Dispatch<React.SetStateAction<{ email?: string; password?: string }>>;
}

export function SignInEmailPasswordFields({
  email,
  setEmail,
  password,
  setPassword,
  fieldErrors,
  setFieldErrors,
}: SignInEmailPasswordFieldsProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Email Field */}
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

      {/* Password Field */}
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
          autoComplete="password"
          textContentType="password"
          error={fieldErrors.password}
        />
      </View>

      <TouchableOpacity
        style={styles.forgotRow}
        onPress={() => router.push("/(auth)/forgot-password")}
      >
        <Text style={styles.forgotText}>{t("auth.forgotPassword")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  inputGroup: { gap: 4 },
  forgotRow: { alignItems: "flex-end", marginTop: 4, marginBottom: 10 },
  forgotText: { fontSize: 12, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
});
