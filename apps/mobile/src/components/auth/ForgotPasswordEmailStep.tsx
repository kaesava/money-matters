import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { t } from "@money-matters/i18n";
import {
  DESIGN_TOKENS,
  MobileButton,
  MobileInput,
  FormLabel,
} from "@money-matters/ui/mobile";
import { isValidEmail } from "@money-matters/types";

interface ForgotPasswordEmailStepProps {
  email: string;
  setEmail: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function ForgotPasswordEmailStep({
  email,
  setEmail,
  onSubmit,
  loading,
}: ForgotPasswordEmailStepProps) {
  const router = useRouter();

  return (
    <View style={styles.form}>
      <View style={styles.inputGroup}>
        <FormLabel required={true}>{t("auth.emailLabel")}</FormLabel>
        <MobileInput
          value={email}
          onChangeText={setEmail}
          placeholder={t("auth.emailPlaceholder")}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
        />
      </View>

      <MobileButton
        onPress={onSubmit}
        loading={loading}
        disabled={!isValidEmail(email) || loading}
        variant="primary"
      >
        {t("auth.sendResetCode")}
      </MobileButton>

      <TouchableOpacity
        onPress={() => router.replace("/(auth)/sign-in")}
        style={styles.signInLink}
      >
        <Text style={styles.signInText}>{t("auth.backToSignIn")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  inputGroup: { gap: 4 },
  signInLink: { alignItems: "center", marginTop: 12 },
  signInText: { fontSize: 13, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
});
