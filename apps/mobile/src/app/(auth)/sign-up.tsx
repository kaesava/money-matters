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
import * as WebBrowser from "expo-web-browser";
import { t } from "@money-matters/i18n";
import {
  DESIGN_TOKENS,
  MobileLogo,
  MobileButton,
  MobileInput,
  FormLabel,
  FormFieldError,
  FormErrorBanner,
  Checkbox,
} from "@money-matters/ui/mobile";
import { SUPPORTED_COUNTRIES, SignUpInputSchema, isValidEmail, getCountryDefaults } from "@money-matters/types";
import { authClient } from "../../lib/auth";
import { trpc, setActiveSessionToken } from "../../lib/trpc";
import * as SecureStore from "expo-secure-store";
import { registerPushNotificationsAsync } from "../../lib/push";
import { MobilePasswordStrength } from "../../components/auth/MobilePasswordStrength";
import { MobileOtpVerificationView } from "../../components/auth/MobileOtpVerificationView";
import { MobileSocialAuthButtons } from "../../components/auth/MobileSocialAuthButtons";

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const posthog = usePostHog();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("AU");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    agreeTerms?: string;
  }>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [passwordForOtp, setPasswordForOtp] = useState<string | undefined>(undefined);

  const createTenant = trpc.createTenant.useMutation();
  const registerToken = trpc.registerToken.useMutation();

  const openTerms = () => {
    WebBrowser.openBrowserAsync("https://moneymatters.kaesava.au/terms");
  };

  const openPrivacy = () => {
    WebBrowser.openBrowserAsync("https://moneymatters.kaesava.au/privacy");
  };

  const handleSignUp = async () => {
    setError(null);
    setFieldErrors({});

    const validation = SignUpInputSchema.safeParse({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      confirmPassword,
      country,
      agreedToTerms: agreeTerms,
    });

    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        name: formatted.name?._errors[0] ? t("auth.fillAllFields") : undefined,
        email: formatted.email?._errors[0] === "invalidEmail" ? t("validation.invalidEmail") : t("auth.fillAllFields"),
        password: formatted.password?._errors[0] ? t("auth.passwordTooShort") : undefined,
        confirmPassword: formatted.confirmPassword?._errors[0]
          ? (formatted.confirmPassword._errors[0] === "passwordsMustMatch" ? t("auth.passwordsMustMatch") : t("auth.passwordTooShort"))
          : undefined,
        agreeTerms: formatted.agreedToTerms?._errors[0] ? t("auth.mustAgreeToTerms") : undefined,
      });
      return;
    }

    setLoading(true);
    try {
      const signUpResult = await authClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
      });

      if (signUpResult.error) {
        const msg = signUpResult.error.message || "";
        const errCode = (signUpResult.error as { code?: string }).code || "";
        const isExistingUser =
          errCode === "USER_ALREADY_EXISTS" ||
          msg.toLowerCase().includes("already") ||
          msg.toLowerCase().includes("exist");

        if (isExistingUser) {
          setError(t("auth.userAlreadyExists"));
          router.push({
            pathname: "/(auth)/sign-in",
            params: {
              email: email.trim().toLowerCase(),
              reason: "existing",
            },
          });
          return;
        }

        setError(signUpResult.error.message || t("auth.signUpErrorTitle"));
        return;
      }

      // Check if email OTP verification is required
      const sessionToken =
        (signUpResult.data as { session?: { token?: string }; token?: string })?.session?.token ||
        (signUpResult.data as { token?: string })?.token;

      if (!sessionToken) {
        // Neon Auth automatically sends the email OTP verification
        setUnverifiedEmail(email.trim().toLowerCase());
        setPasswordForOtp(password);
        return;
      }

      // Session established directly
      await SecureStore.setItemAsync("money-matters_session_token", sessionToken);
      await SecureStore.setItemAsync("money-matters-session-token", sessionToken);
      setActiveSessionToken(sessionToken);

      const userId = signUpResult.data?.user?.id;
      if (userId) {
        posthog.identify(userId, {
          $set: { name: name.trim() },
          $set_once: { signup_date: new Date().toISOString() },
        });
      }
      posthog.capture("user_signed_up", { method: "email" });

      const defaults = getCountryDefaults(country);
      await createTenant.mutateAsync({
        name: name.trim(),
        country,
        currency: defaults.currency,
        timezone: defaults.timezone,
      });

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

      router.replace("/(setup)/income");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.signUpErrorTitle"));
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = async () => {
    setUnverifiedEmail(null);
    try {
      const defaults = getCountryDefaults(country);
      await createTenant.mutateAsync({
        name: name.trim(),
        country,
        currency: defaults.currency,
        timezone: defaults.timezone,
      });
    } catch (_e) {
      // Ignore if tenant creation handled elsewhere
    }
    router.replace("/(setup)/income");
  };

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const isFormValid =
    name.trim().length >= 2 &&
    country.length === 2 &&
    isValidEmail(email) &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword &&
    agreeTerms;

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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← {t("common.back")}</Text>
          </TouchableOpacity>
          <View style={styles.brandBlock}>
            <MobileLogo size={64} source={require("../../../assets/icon.png")} />
            <View style={styles.trialBadge}>
              <Text style={styles.trialBadgeText}>{t("landing.pricingTrialBadge")}</Text>
            </View>
            <Text style={styles.title}>
              {unverifiedEmail ? t("auth.checkYourEmailTitle") : t("landing.createAccount")}
            </Text>
            <Text style={styles.subtitle}>
              {unverifiedEmail ? t("auth.otpLabel") : t("app.tagline")}
            </Text>
            {!unverifiedEmail && (
              <Text style={styles.noCardNote}>
                {t("landing.authModalSubtitleSignUp")}
              </Text>
            )}
          </View>
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
              mode="signUp"
              onError={(msg) => setError(msg)}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("auth.or").toUpperCase()}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Name */}
            <View style={styles.inputGroup}>
              <FormLabel required={true}>{t("auth.nameLabel")}</FormLabel>
              <MobileInput
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder={t("auth.namePlaceholder")}
                autoComplete="name"
                textContentType="name"
                error={fieldErrors.name}
              />
            </View>

            {/* Country selector */}
            <View style={styles.inputGroup}>
              <FormLabel required={true}>{t("auth.countryLabel")}</FormLabel>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryRow}>
                {SUPPORTED_COUNTRIES.map((c) => {
                  const isSelected = country === c.code;
                  return (
                    <TouchableOpacity
                      key={c.code}
                      onPress={() => setCountry(c.code)}
                      style={[styles.countryChip, isSelected && styles.countryChipSelected]}
                    >
                      <Text style={styles.countryFlag}>{c.flag}</Text>
                      <Text style={[styles.countryText, isSelected && styles.countryTextSelected]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Email */}
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

            {/* Password */}
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
                autoComplete="new-password"
                textContentType="newPassword"
                error={fieldErrors.password}
              />
              {password.length > 0 && <MobilePasswordStrength password={password} />}
            </View>

            {/* Confirm Password */}
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
                error={fieldErrors.confirmPassword || (passwordMismatch ? t("auth.passwordsMustMatch") : undefined)}
              />
            </View>

            {/* Terms checkbox */}
            <View style={styles.termsGroup}>
              <View style={styles.termsRow}>
                <Checkbox
                  checked={agreeTerms}
                  style={styles.checkboxAlign}
                  onChange={(checked) => {
                    setAgreeTerms(checked);
                    if (fieldErrors.agreeTerms)
                      setFieldErrors((prev) => ({ ...prev, agreeTerms: undefined }));
                  }}
                />
                <View style={styles.termsTextWrap}>
                  <Text style={styles.termsText}>
                    {t("auth.agreeTermsPrefix")}{" "}
                    <Text style={styles.linkText} onPress={openTerms}>
                      {t("auth.termsLink")}
                    </Text>{" "}
                    {t("auth.agreeTermsAnd")}{" "}
                    <Text style={styles.linkText} onPress={openPrivacy}>
                      {t("auth.privacyLink")}
                    </Text>
                  </Text>
                </View>
              </View>
              <FormFieldError error={fieldErrors.agreeTerms} />
            </View>

            <MobileButton
              onPress={handleSignUp}
              loading={loading}
              disabled={!isFormValid || loading}
              variant="primary"
            >
              {t("landing.createAccount")}
            </MobileButton>
          </View>
        )}

        {/* Footer nav */}
        {!unverifiedEmail && (
          <View style={styles.footer}>
            <Text style={styles.footerPrompt}>{t("auth.signInPrompt")} </Text>
            <TouchableOpacity onPress={() => router.replace("/(auth)/sign-in")}>
              <Text style={styles.footerLink}>{t("auth.signInCta")}</Text>
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
  header: { marginBottom: 24 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 14, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
  brandBlock: { alignItems: "center", gap: 6, marginBottom: 8 },
  trialBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    marginTop: 4,
  },
  trialBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: DESIGN_TOKENS.colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noCardNote: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: "center",
    marginTop: 2,
  },
  title: { fontSize: 26, fontWeight: "700", color: DESIGN_TOKENS.colors.primary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, lineHeight: 18, textAlign: "center" },
  form: { gap: 14 },
  inputGroup: { gap: 4 },
  countryRow: { flexDirection: "row", marginVertical: 4 },
  countryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  countryChipSelected: {
    borderColor: DESIGN_TOKENS.colors.accent,
    backgroundColor: "#EFF6FF",
  },
  countryFlag: { fontSize: 16, marginRight: 6 },
  countryText: { fontSize: 13, color: DESIGN_TOKENS.colors.textPrimary },
  countryTextSelected: { color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
  termsGroup: { gap: 4, marginVertical: 4 },
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  checkboxAlign: { minHeight: 22, marginTop: 1 },
  termsTextWrap: { flex: 1 },
  termsText: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted, lineHeight: 18 },
  linkText: { color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
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
