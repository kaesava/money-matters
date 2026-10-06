import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { t } from "@money-matters/i18n";
import {
  DESIGN_TOKENS,
  MobileButton,
  MobileInput,
  MobileOtpInput,
  FormLabel,
  FormErrorBanner,
} from "@money-matters/ui/mobile";
import { MobilePasswordStrength } from "./MobilePasswordStrength";

interface ForgotPasswordOtpStepProps {
  email: string;
  onEditEmail: () => void;
  otp: string;
  setOtp: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  resendSuccess: boolean;
  isResending: boolean;
  onResend: () => void;
  error: string | null;
  fieldErrors: { otp?: string; password?: string; confirmPassword?: string };
  setFieldErrors: React.Dispatch<React.SetStateAction<{ otp?: string; password?: string; confirmPassword?: string }>>;
  onSubmit: () => void;
  isResetting: boolean;
  isResetValid: boolean;
}

export function ForgotPasswordOtpStep({
  email,
  onEditEmail,
  otp,
  setOtp,
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  resendSuccess,
  isResending,
  onResend,
  error,
  fieldErrors,
  setFieldErrors,
  onSubmit,
  isResetting,
  isResetValid,
}: ForgotPasswordOtpStepProps) {
  const router = useRouter();

  return (
    <View style={styles.form}>
      <FormErrorBanner message={error} />

      <View style={styles.emailCard}>
        <View style={styles.emailInfo}>
          <Text style={styles.emailCardLabel}>{t("auth.codeSentTo")}</Text>
          <Text style={styles.emailCardValue} numberOfLines={1}>{email}</Text>
        </View>
        <TouchableOpacity onPress={onEditEmail}>
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
          onPress={onResend}
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
        onPress={onSubmit}
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
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  resendSuccessText: { fontSize: 12, fontWeight: "600", color: DESIGN_TOKENS.colors.successDark, textAlign: "center" },
});
