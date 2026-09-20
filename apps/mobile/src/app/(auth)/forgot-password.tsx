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
import { t } from "@money-matters/i18n";
import {
  DESIGN_TOKENS,
  MobileButton,
  MobileInput,
  MobileOtpInput,
  FormLabel,
  FormFieldError,
  FormErrorBanner,
} from "@money-matters/ui/mobile";
import { isValidEmail, ResetPasswordInputSchema } from "@money-matters/types";
import { authClient } from "../../lib/auth";
import { MobilePasswordStrength } from "../../components/auth/MobilePasswordStrength";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [step, setStep] = useState<"email" | "reset" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    otp?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const handleRequestCode = async () => {
    if (!isValidEmail(email)) return;

    setError(null);
    setIsRequestingCode(true);

    try {
      await authClient.emailOtp.requestPasswordReset({
        email: email.trim().toLowerCase(),
      });
      setStep("reset");
    } catch (_err) {
      // Quiet UX to prevent user enumeration
      setStep("reset");
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleResendCode = async () => {
    setIsResending(true);
    setError(null);
    setResendSuccess(false);

    try {
      await authClient.emailOtp.requestPasswordReset({
        email: email.trim().toLowerCase(),
      });
      setResendSuccess(true);
    } catch (_err) {
      setResendSuccess(true);
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async () => {
    setError(null);
    setFieldErrors({});

    const validation = ResetPasswordInputSchema.safeParse({
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      password,
      confirmPassword,
    });

    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        otp: formatted.otp?._errors[0] ? t("auth.invalidOtpError") : undefined,
        password: formatted.password?._errors[0] ? t("auth.passwordTooShort") : undefined,
        confirmPassword: formatted.confirmPassword?._errors[0]
          ? (formatted.confirmPassword._errors[0] === "passwordsMustMatch"
              ? t("auth.passwordsMustMatch")
              : t("auth.passwordTooShort"))
          : undefined,
      });
      return;
    }

    setIsResetting(true);
    try {
      const res = await authClient.emailOtp.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password,
      });

      if (res.error) {
        setError(res.error.message || t("auth.invalidOtpError"));
        return;
      }

      setStep("success");
      setTimeout(() => {
        router.replace("/(auth)/sign-in");
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.invalidOtpError"));
    } finally {
      setIsResetting(false);
    }
  };

  const isResetValid =
    otp.length === 6 &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword;

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
          <Text style={styles.title}>
            {step === "reset" ? t("auth.setNewPasswordTitle") : t("auth.forgotPasswordTitle")}
          </Text>
          <Text style={styles.subtitle}>
            {step === "reset"
              ? t("auth.setNewPasswordSubtitle")
              : t("auth.forgotPasswordSubtitle")}
          </Text>
        </View>

        {step === "success" && (
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
              {t("auth.backToSignIn")}
            </MobileButton>
          </View>
        )}

        {step === "email" && (
          <View style={styles.form}>
            <FormErrorBanner message={error} />

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
              onPress={handleRequestCode}
              loading={isRequestingCode}
              disabled={!isValidEmail(email) || isRequestingCode}
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
        )}

        {step === "reset" && (
          <View style={styles.form}>
            <FormErrorBanner message={error} />

            <View style={styles.emailCard}>
              <View style={styles.emailInfo}>
                <Text style={styles.emailCardLabel}>{t("auth.codeSentTo")}</Text>
                <Text style={styles.emailCardValue} numberOfLines={1}>{email}</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setStep("email");
                  setOtp("");
                }}
              >
                <Text style={styles.changeEmailText}>{t("auth.editEmail")}</Text>
              </TouchableOpacity>
            </View>

            {resendSuccess && (
              <View style={styles.resendSuccessBanner}>
                <Text style={styles.resendSuccessText}>✓ {t("auth.resendSuccess")}</Text>
              </View>
            )}

            <View>
              <MobileOtpInput
                label={t("auth.otpLabel")}
                required={true}
                value={otp}
                onChangeText={(val) => {
                  setOtp(val);
                  if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: undefined }));
                }}
                placeholder={t("auth.otpPlaceholder")}
                error={fieldErrors.otp}
              />
              <TouchableOpacity
                onPress={handleResendCode}
                disabled={isResending}
                style={styles.resendBtn}
              >
                <Text style={[styles.resendText, isResending && styles.disabledText]}>
                  {t("auth.resendCode")}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <FormLabel required={true}>{t("auth.newPasswordLabel")}</FormLabel>
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
                error={fieldErrors.confirmPassword}
              />
            </View>

            <MobileButton
              onPress={handleResetPassword}
              loading={isResetting}
              disabled={!isResetValid || isResetting}
              variant="primary"
            >
              {t("auth.resetPasswordButton")}
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
  header: { marginBottom: 28 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 14, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: DESIGN_TOKENS.colors.primary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, lineHeight: 18 },
  form: { gap: 14 },
  inputGroup: { gap: 4 },
  signInLink: { alignItems: "center", marginTop: 12 },
  signInText: { fontSize: 13, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
  emailCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
    borderRadius: DESIGN_TOKENS.radius.md,
    padding: 12,
  },
  emailInfo: { flex: 1, marginRight: 12 },
  emailCardLabel: { fontSize: 11, color: DESIGN_TOKENS.colors.textMuted, fontWeight: "500" },
  emailCardValue: { fontSize: 13, color: DESIGN_TOKENS.colors.textPrimary, fontWeight: "700", marginTop: 2 },
  changeEmailText: { fontSize: 12, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
  resendBtn: { alignSelf: "flex-end", marginTop: -6, marginBottom: 8, paddingVertical: 4 },
  resendText: { fontSize: 12, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
  disabledText: { opacity: 0.5 },
  resendSuccessBanner: {
    padding: 10,
    backgroundColor: "#ECFDF5",
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  resendSuccessText: { fontSize: 12, fontWeight: "600", color: "#065F46", textAlign: "center" },
  successBlock: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 24,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#ECFDF5",
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
