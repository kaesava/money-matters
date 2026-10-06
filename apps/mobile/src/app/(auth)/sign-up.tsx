import React from "react";
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
  MobileLogo,
  MobileButton,
  FormErrorBanner,
} from "@money-matters/ui/mobile";
import { MobileOtpVerificationView } from "../../components/auth/MobileOtpVerificationView";
import { MobileSocialAuthButtons } from "../../components/auth/MobileSocialAuthButtons";
import { SignUpFormFields } from "../../components/auth/SignUpFormFields";
import { SignUpTermsCheckbox } from "../../components/auth/SignUpTermsCheckbox";
import { useSignUpForm } from "../../components/auth/useSignUpForm";

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const form = useSignUpForm();

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
              {form.unverifiedEmail ? t("auth.checkYourEmailTitle") : t("landing.createAccount")}
            </Text>
            <Text style={styles.subtitle}>
              {form.unverifiedEmail ? t("auth.otpLabel") : t("app.tagline")}
            </Text>
            {!form.unverifiedEmail && (
              <Text style={styles.noCardNote}>
                {t("landing.authModalSubtitleSignUp")}
              </Text>
            )}
          </View>
        </View>

        {form.unverifiedEmail ? (
          <MobileOtpVerificationView
            email={form.unverifiedEmail}
            password={form.passwordForOtp}
            onSuccess={form.handleOtpSuccess}
            onCancel={() => form.setUnverifiedEmail(null)}
          />
        ) : (
          <View style={styles.form}>
            <FormErrorBanner message={form.error} />
            <MobileSocialAuthButtons mode="signUp" onError={(msg) => form.setError(msg)} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("auth.or").toUpperCase()}</Text>
              <View style={styles.dividerLine} />
            </View>

            <SignUpFormFields
              name={form.name}
              setName={form.setName}
              email={form.email}
              setEmail={form.setEmail}
              country={form.country}
              setCountry={form.setCountry}
              password={form.password}
              setPassword={form.setPassword}
              confirmPassword={form.confirmPassword}
              setConfirmPassword={form.setConfirmPassword}
              fieldErrors={form.fieldErrors}
              setFieldErrors={form.setFieldErrors}
            />

            <SignUpTermsCheckbox
              agreeTerms={form.agreeTerms}
              setAgreeTerms={form.setAgreeTerms}
              error={form.fieldErrors.agreeTerms}
              onClearError={() => form.setFieldErrors((prev) => ({ ...prev, agreeTerms: undefined }))}
            />

            <MobileButton
              onPress={form.handleSignUp}
              loading={form.loading}
              disabled={!form.isFormValid || form.loading}
              variant="primary"
            >
              {t("landing.createAccount")}
            </MobileButton>
          </View>
        )}

        {!form.unverifiedEmail && (
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
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.accentBorder,
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
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: DESIGN_TOKENS.colors.textMuted,
    fontWeight: "700",
  },
});
