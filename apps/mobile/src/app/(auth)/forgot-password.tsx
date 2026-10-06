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
import { DESIGN_TOKENS } from "@money-matters/ui/mobile";
import { isValidEmail, ResetPasswordInputSchema } from "@money-matters/types";
import { authClient } from "../../lib/auth";
import { ForgotPasswordEmailStep } from "../../components/auth/ForgotPasswordEmailStep";
import { ForgotPasswordOtpStep } from "../../components/auth/ForgotPasswordOtpStep";
import { ForgotPasswordSuccessStep } from "../../components/auth/ForgotPasswordSuccessStep";

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
    } catch {
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
    } catch {
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
        confirmPassword: formatted.confirmPassword?._errors[0] ? t("auth.passwordsMustMatch") : undefined,
      });
      return;
    }

    setIsResetting(true);
    try {
      const result = await authClient.emailOtp.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password,
      });

      if (result.error) {
        setError(result.error.message || t("auth.resetPasswordGenericError"));
        return;
      }

      setStep("success");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("auth.resetPasswordGenericError");
      setError(message);
    } finally {
      setIsResetting(false);
    }
  };

  const isResetValid =
    otp.trim().length === 6 &&
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
          <TouchableOpacity
            onPress={() => {
              if (step === "reset") {
                setStep("email");
                setOtp("");
              } else {
                router.replace("/(auth)/sign-in");
              }
            }}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← {t("common.back")}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {step === "success"
              ? t("auth.passwordResetSuccessTitle")
              : step === "reset"
              ? t("auth.setNewPasswordTitle")
              : t("auth.forgotPasswordTitle")}
          </Text>
          <Text style={styles.subtitle}>
            {step === "success"
              ? t("auth.passwordResetSuccessDesc")
              : step === "reset"
              ? t("auth.setNewPasswordSubtitle")
              : t("auth.forgotPasswordSubtitle")}
          </Text>
        </View>

        {step === "email" && (
          <ForgotPasswordEmailStep
            email={email}
            setEmail={setEmail}
            onSubmit={handleRequestCode}
            loading={isRequestingCode}
          />
        )}

        {step === "reset" && (
          <ForgotPasswordOtpStep
            email={email}
            onEditEmail={() => {
              setStep("email");
              setOtp("");
            }}
            otp={otp}
            setOtp={setOtp}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            resendSuccess={resendSuccess}
            isResending={isResending}
            onResend={handleResendCode}
            error={error}
            fieldErrors={fieldErrors}
            setFieldErrors={setFieldErrors}
            onSubmit={handleResetPassword}
            isResetting={isResetting}
            isResetValid={isResetValid}
          />
        )}

        {step === "success" && <ForgotPasswordSuccessStep />}
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
});
