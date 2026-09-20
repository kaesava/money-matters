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
import { usePostHog } from "posthog-react-native";
import { t } from "@money-matters/i18n";
import {
  DESIGN_TOKENS,
  MobileLogo,
  MobileButton,
  MobileInput,
  FormLabel,
  FormErrorBanner,
} from "@money-matters/ui/mobile";
import { SignInInputSchema } from "@money-matters/types";
import { authClient } from "../../lib/auth";
import { trpc, setActiveSessionToken } from "../../lib/trpc";
import * as SecureStore from "expo-secure-store";
import { registerPushNotificationsAsync } from "../../lib/push";
import { MobileSocialAuthButtons } from "../../components/auth/MobileSocialAuthButtons";
import { MobileOtpVerificationView } from "../../components/auth/MobileOtpVerificationView";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const posthog = usePostHog();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // State for unverified email / OTP requirement
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [passwordForOtp, setPasswordForOtp] = useState<string | undefined>(undefined);

  const registerToken = trpc.registerToken.useMutation();

  const handleSignIn = async () => {
    setError(null);
    setFieldErrors({});

    const validation = SignInInputSchema.safeParse({ email, password });
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        email: formatted.email?._errors[0],
        password: formatted.password?._errors[0],
      });
      return;
    }

    setLoading(true);
    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.error) {
        const msg = result.error.message || "";
        const lowerMsg = msg.toLowerCase();
        // Check if error indicates email needs verification
        if (
          lowerMsg.includes("email_not_verified") ||
          lowerMsg.includes("not verified") ||
          lowerMsg.includes("verify your email")
        ) {
          try {
            await authClient.emailOtp.sendVerificationOtp({
              email: email.trim().toLowerCase(),
              type: "email-verification",
            });
          } catch (_e) {
            // Ignore failure if otp already sent
          }
          setUnverifiedEmail(email.trim().toLowerCase());
          setPasswordForOtp(password);
          return;
        }

        setError(t("auth.invalidCredentialsError"));
        return;
      }

      const sessionToken =
        (result.data as { session?: { token?: string }; token?: string })?.session?.token ||
        (result.data as { token?: string })?.token;
      if (sessionToken) {
        await SecureStore.setItemAsync("money-matters_session_token", sessionToken);
        await SecureStore.setItemAsync("money-matters-session-token", sessionToken);
        setActiveSessionToken(sessionToken);
      }
      if (result.data?.user?.email) {
        await SecureStore.setItemAsync("money-matters_user_email", result.data.user.email);
      }
      if (result.data?.user?.name) {
        await SecureStore.setItemAsync("money-matters_user_name", result.data.user.name);
      }

      const userId = result.data?.user?.id;
      if (userId) {
        posthog.identify(userId, {
          $set: { name: result.data?.user?.name },
        });
      }
      posthog.capture("user_signed_in", { method: "email" });

      try {
        const tokenData = await registerPushNotificationsAsync();
        if (tokenData) {
          registerToken.mutate({
            platform: Platform.OS === "ios" ? "ios" : "android",
            token: tokenData,
          });
        }
      } catch (pushErr) {
        console.warn("Could not register push token:", pushErr);
      }

      router.replace("/(app)/home");
    } catch (_err) {
      setError(t("auth.invalidCredentialsError"));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = () => {
    setUnverifiedEmail(null);
    router.replace("/(app)/home");
  };

  const isFormValid = email.trim().length > 0 && password.length > 0;

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
        {/* Brand Header */}
        <View style={styles.brandBlock}>
          <MobileLogo size={64} source={require("../../../assets/icon.png")} />
          <Text style={styles.title}>{t("app.title")}</Text>
          <Text style={styles.subtitle}>
            {unverifiedEmail ? t("auth.checkYourEmailTitle") : t("auth.hint")}
          </Text>
        </View>

        {unverifiedEmail ? (
          <MobileOtpVerificationView
            email={unverifiedEmail}
            password={passwordForOtp}
            onSuccess={handleOtpSuccess}
            onCancel={() => setUnverifiedEmail(null)}
          />
        ) : (
          <View style={styles.form}>
            <FormErrorBanner message={error} />

            {/* Social Auth Buttons */}
            <MobileSocialAuthButtons
              mode="signIn"
              onError={(msg) => setError(msg)}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("auth.or").toUpperCase()}</Text>
              <View style={styles.dividerLine} />
            </View>

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

            <MobileButton
              onPress={handleSignIn}
              loading={loading}
              disabled={!isFormValid || loading}
              variant="primary"
            >
              {t("auth.signInCta")}
            </MobileButton>
          </View>
        )}

        {/* Footer nav */}
        {!unverifiedEmail && (
          <View style={styles.footer}>
            <Text style={styles.footerPrompt}>{t("auth.signUpPrompt")} </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
              <Text style={styles.footerLink}>{t("auth.signUpCta")}</Text>
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
    justifyContent: "center",
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    paddingVertical: 48,
  },
  brandBlock: { alignItems: "center", marginBottom: 32 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    maxWidth: 280,
  },
  form: { gap: 14 },
  inputGroup: { gap: 4 },
  forgotRow: { alignItems: "flex-end", marginTop: 4, marginBottom: 10 },
  forgotText: { fontSize: 12, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerPrompt: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  footerLink: { fontSize: 13, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E8F0",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    fontWeight: "700",
  },
});
