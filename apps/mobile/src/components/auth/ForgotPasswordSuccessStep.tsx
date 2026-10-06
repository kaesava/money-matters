import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS, MobileButton } from "@money-matters/ui/mobile";

export function ForgotPasswordSuccessStep() {
  const router = useRouter();

  return (
    <View style={styles.successBlock}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>✓</Text>
      </View>
      <Text style={styles.successTitle}>{t("auth.passwordResetSuccessTitle")}</Text>
      <Text style={styles.successSubtitle}>{t("auth.passwordResetSuccessDesc")}</Text>
      <MobileButton
        onPress={() => router.replace("/(auth)/sign-in")}
        variant="primary"
      >
        {t("auth.signInCta")}
      </MobileButton>
    </View>
  );
}

const styles = StyleSheet.create({
  successBlock: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  iconText: {
    fontSize: 24,
    color: DESIGN_TOKENS.colors.success,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.primary,
  },
  successSubtitle: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
  },
});
