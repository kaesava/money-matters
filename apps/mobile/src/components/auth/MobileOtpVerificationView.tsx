import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Platform } from "react-native";
import { t } from "@money-matters/i18n";
import {
  DESIGN_TOKENS,
  MobileButton,
  MobileOtpInput,
  FormErrorBanner,
} from "@money-matters/ui/mobile";
import { authClient } from "../../lib/auth";
import * as SecureStore from "expo-secure-store";
import { setActiveSessionToken } from "../../lib/trpc";

interface MobileOtpVerificationViewProps {
  email: string;
  onSuccess: () => void;
  onCancel?: () => void;
  password?: string;
}

export function MobileOtpVerificationView({
  email,
  onSuccess,
  onCancel,
  password,
}: MobileOtpVerificationViewProps) {
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const handleVerify = async () => {
    if (!otpCode || otpCode.trim().length < 6) {
      setError(t("auth.invalidOtp"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await authClient.emailOtp.verifyEmail({
        email: email.trim().toLowerCase(),
        otp: otpCode.trim(),
      });

      if (res.error) {
        setError(res.error.message || t("auth.invalidOtp"));
        setLoading(false);
        return;
      }

      if (password) {
        const signInRes = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
        });
        const token =
          (signInRes.data as { session?: { token?: string }; token?: string })?.session?.token ||
          (signInRes.data as { token?: string })?.token;
        if (token) {
          await SecureStore.setItemAsync("money-matters_session_token", token);
          await SecureStore.setItemAsync("money-matters-session-token", token);
          setActiveSessionToken(token);
        }
        if (signInRes.data?.user?.email) {
          await SecureStore.setItemAsync("money-matters_user_email", signInRes.data.user.email);
        }
        if (signInRes.data?.user?.name) {
          await SecureStore.setItemAsync("money-matters_user_name", signInRes.data.user.name);
        }
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.invalidOtp"));
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError(null);
    setResendSuccess(false);
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "email-verification",
      });
      setResendSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("auth.checkYourEmailTitle")}</Text>
        <Text style={styles.subtitle}>
          {t("auth.verificationSentMessage")}{" "}
          <Text style={styles.emailHighlight}>{email}</Text>.
        </Text>
      </View>

      <FormErrorBanner message={error} />

      {resendSuccess && (
        <View style={styles.successBanner}>
          <Text style={styles.successText}>✓ {t("auth.resendSuccess")}</Text>
        </View>
      )}

      <MobileOtpInput
        label={t("auth.otpLabel")}
        required={true}
        value={otpCode}
        onChangeText={setOtpCode}
        placeholder={t("auth.otpPlaceholder")}
      />

      <MobileButton
        onPress={handleVerify}
        loading={loading}
        disabled={otpCode.length < 6 || loading}
        variant="primary"
      >
        {t("auth.verifyCodeCta")}
      </MobileButton>

      <View style={styles.footerRow}>
        <TouchableOpacity
          onPress={handleResend}
          disabled={resending}
          style={styles.resendBtn}
        >
          <Text style={[styles.resendText, resending && styles.disabledText]}>
            {t("auth.resendVerificationLink")}
          </Text>
        </TouchableOpacity>

        {onCancel && (
          <TouchableOpacity onPress={onCancel} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    width: "100%",
  },
  header: {
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
  emailHighlight: {
    color: DESIGN_TOKENS.colors.textPrimary,
    fontWeight: "600",
  },
  successBanner: {
    padding: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  successText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
    textAlign: "center",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
  },
  resendBtn: {
    paddingVertical: 6,
  },
  resendText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.accent,
    fontWeight: "600",
  },
  disabledText: {
    opacity: 0.5,
  },
  cancelBtn: {
    paddingVertical: 6,
  },
  cancelText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    fontWeight: "600",
  },
});
