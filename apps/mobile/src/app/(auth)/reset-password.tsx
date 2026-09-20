import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS, useMobileToast } from "@money-matters/ui/mobile";
import { authClient } from "../../lib/auth";

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const toast = useMobileToast();
  const router = useRouter();
  const { token, error } = useLocalSearchParams<{ token?: string; error?: string }>();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (!sessionPending) {
      if (session) {
        router.replace("/(app)/home");
      } else {
        router.replace("/(auth)/sign-in");
      }
    }
  }, [token, error, session, sessionPending]);

  const handleResetPassword = async () => {
    if (error) {
      toast.error(error, t("auth.resetPasswordErrorTitle"));
      return;
    }

    if (!token) {
      toast.error(
        t("auth.invalidToken"),
        t("auth.resetPasswordErrorTitle")
      );
      return;
    }

    if (!newPassword) {
      toast.error(
        t("auth.passwordRequired"),
        t("auth.resetPasswordErrorTitle")
      );
      return;
    }

    if (newPassword.length < 8) {
      toast.error(
        t("auth.passwordTooShort"),
        t("auth.resetPasswordErrorTitle")
      );
      return;
    }

    if (!/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword)) {
      toast.error(
        t("auth.passwordComplexityRequired"),
        t("auth.resetPasswordErrorTitle")
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(
        t("auth.passwordsMustMatch"),
        t("auth.resetPasswordErrorTitle")
      );
      return;
    }

    setLoading(true);
    try {
      const res = await authClient.resetPassword({
        newPassword,
        token,
      });

      if (res.error) {
        toast.error(
          res.error.message ?? t("auth.resetPasswordGenericError"),
          t("auth.resetPasswordErrorTitle")
        );
        return;
      }

      toast.success(
        t("auth.resetPasswordSuccessMessage"),
        t("auth.resetPasswordSuccessTitle")
      );
      router.replace("/(auth)/sign-in");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : String(err),
        t("auth.resetPasswordErrorTitle")
      );
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.backText}>{t("auth.backToSignIn")}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t("auth.resetPassword")}</Text>
          <Text style={styles.subtitle}>
            {t("auth.resetPasswordSubtitle")}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {t("auth.invalidToken")}
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>{t("auth.newPasswordLabel")}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("auth.passwordPlaceholder")}
              placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />

            <Text style={[styles.label, styles.labelGap]}>
              {t("auth.confirmPasswordLabel")}
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t("auth.passwordPlaceholder")}
              placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
            />

            <TouchableOpacity
              style={[styles.cta, loading && styles.ctaDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={DESIGN_TOKENS.colors.onPrimary} />
              ) : (
                <Text style={styles.ctaText}>{t("auth.resetPassword")}</Text>
              )}
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
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 14, color: DESIGN_TOKENS.colors.accent },
  title: { fontSize: 26, fontWeight: "700", color: DESIGN_TOKENS.colors.primary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, lineHeight: 18 },
  form: { gap: 4 },
  label: { fontSize: 13, fontWeight: "600", color: DESIGN_TOKENS.colors.textPrimary, marginBottom: 6 },
  labelGap: { marginTop: 14 },
  input: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: DESIGN_TOKENS.colors.textPrimary,
  },
  cta: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    paddingVertical: 15,
    borderRadius: DESIGN_TOKENS.radius.md,
    alignItems: "center",
    marginTop: 24,
  },
  ctaDisabled: { opacity: 0.65 },
  ctaText: { color: DESIGN_TOKENS.colors.onAccent, fontSize: 16, fontWeight: "700" },
  errorContainer: {
    backgroundColor: "#FEE2E2",
    padding: 16,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  errorText: {
    color: "#991B1B",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
