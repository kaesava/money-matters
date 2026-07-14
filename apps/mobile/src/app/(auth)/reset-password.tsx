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
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS } from "@money-matters/ui";
import { authClient } from "../../lib/auth";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { token, error } = useLocalSearchParams<{ token?: string; error?: string }>();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (sessionPending) return;
    if (!token && !error) {
      if (session) {
        router.replace("/(app)/home");
      } else {
        router.replace("/(auth)/sign-in");
      }
    }
  }, [token, error, session, sessionPending]);

  const handleResetPassword = async () => {
    if (error) {
      Alert.alert(t("auth.resetPasswordErrorTitle", { defaultValue: "Reset Error" }), error);
      return;
    }

    if (!token) {
      Alert.alert(
        t("auth.resetPasswordErrorTitle", { defaultValue: "Reset Error" }),
        t("auth.invalidToken", { defaultValue: "Invalid or missing password reset token." })
      );
      return;
    }

    if (!newPassword) {
      Alert.alert(
        t("auth.resetPasswordErrorTitle", { defaultValue: "Reset Error" }),
        t("auth.passwordRequired", { defaultValue: "Password is required." })
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert(
        t("auth.resetPasswordErrorTitle", { defaultValue: "Reset Error" }),
        t("auth.passwordsMustMatch", { defaultValue: "Passwords do not match." })
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
        Alert.alert(
          t("auth.resetPasswordErrorTitle", { defaultValue: "Reset Error" }),
          res.error.message ?? t("auth.resetPasswordGenericError", { defaultValue: "Failed to reset password." })
        );
        return;
      }

      Alert.alert(
        t("auth.resetPasswordSuccessTitle", { defaultValue: "Success" }),
        t("auth.resetPasswordSuccessMessage", { defaultValue: "Your password has been successfully reset. Please sign in with your new password." }),
        [
          {
            text: t("common.done", { defaultValue: "Done" }),
            onPress: () => router.replace("/(auth)/sign-in"),
          },
        ]
      );
    } catch (err) {
      Alert.alert(
        t("auth.resetPasswordErrorTitle", { defaultValue: "Reset Error" }),
        err instanceof Error ? err.message : String(err)
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.replace("/(auth)/sign-in")} style={styles.backBtn}>
            <Text style={styles.backText}>← {t("auth.signInCta", { defaultValue: "Back to Sign In" })}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t("auth.resetPassword", { defaultValue: "Reset Password" })}</Text>
          <Text style={styles.subtitle}>
            {t("auth.resetPasswordSubtitle", { defaultValue: "Enter a new secure password for your account." })}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {t("auth.invalidToken", { defaultValue: "Invalid or expired link. Please request a new password reset link." })}
            </Text>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.label}>{t("auth.newPasswordLabel", { defaultValue: "New Password" })}</Text>
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
              {t("auth.confirmPasswordLabel", { defaultValue: "Confirm New Password" })}
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
                <Text style={styles.ctaText}>{t("auth.resetPassword", { defaultValue: "Reset Password" })}</Text>
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
