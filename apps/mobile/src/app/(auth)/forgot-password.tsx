import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { t } from "@money-matters/i18n";
import {
  DESIGN_TOKENS,
  MobileButton,
  MobileInput,
  FormLabel,
  FormFieldError,
  FormErrorBanner,
} from "@money-matters/ui/mobile";
import { ForgotPasswordInputSchema } from "@money-matters/types";
import { authClient } from "../../lib/auth";

const API_URL = process.env["EXPO_PUBLIC_API_URL"] || "https://api.moneymatters.kaesava.au";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setFieldError(undefined);

    const validation = ForgotPasswordInputSchema.safeParse({ email });
    if (!validation.success) {
      setFieldError(validation.error.format().email?._errors[0]);
      return;
    }

    setLoading(true);
    try {
      const appRedirectUrl = Linking.createURL("reset-password");
      const res = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: `${API_URL}/reset-password?redirect_to=${encodeURIComponent(appRedirectUrl)}`,
      });

      if (res.error) {
        // Quiet failure UX to prevent user enumeration
        setSubmitted(true);
        return;
      }

      setSubmitted(true);
    } catch (_err) {
      // Quiet failure UX to prevent user enumeration
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.trim().length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top + 24, 48),
            paddingBottom: Math.max(insets.bottom + 24, 48),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace("/(auth)/sign-in")} style={styles.backBtn}>
            <Text style={styles.backText}>← {t("auth.backToSignIn")}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t("auth.forgotPasswordTitle")}</Text>
          <Text style={styles.subtitle}>{t("auth.forgotPasswordSubtitle")}</Text>
        </View>

        {submitted ? (
          <View style={styles.successBlock}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>✉</Text>
            </View>
            <Text style={styles.successTitle}>{t("auth.checkYourEmailTitle")}</Text>
            <Text style={styles.successSubtitle}>{t("auth.quietResetMessage")}</Text>
            <MobileButton
              onPress={() => router.replace("/(auth)/sign-in")}
              variant="primary"
            >
              {t("auth.backToSignIn")}
            </MobileButton>
          </View>
        ) : (
          <View style={styles.form}>
            <FormErrorBanner message={error} />

            <View style={styles.inputGroup}>
              <FormLabel required={true}>{t("auth.emailLabel")}</FormLabel>
              <MobileInput
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (fieldError) setFieldError(undefined);
                }}
                placeholder={t("auth.emailPlaceholder")}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                error={fieldError}
              />
            </View>

            <MobileButton
              onPress={handleSubmit}
              loading={loading}
              disabled={!isFormValid || loading}
              variant="primary"
            >
              {t("auth.sendResetLink")}
            </MobileButton>

            <TouchableOpacity
              onPress={() => router.replace("/(auth)/sign-in")}
              style={styles.signInLink}
            >
              <Text style={styles.signInText}>{t("auth.backToSignIn")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    paddingVertical: 48,
  },
  header: { marginBottom: 32 },
  backBtn: { marginBottom: 20 },
  backText: { fontSize: 14, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: DESIGN_TOKENS.colors.primary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, lineHeight: 18 },
  form: { gap: 16 },
  inputGroup: { gap: 4 },
  signInLink: { alignItems: "center", marginTop: 12 },
  signInText: { fontSize: 13, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
  successBlock: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  iconText: {
    fontSize: 24,
    color: DESIGN_TOKENS.colors.accent,
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
