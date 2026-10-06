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
import { MobileSocialAuthButtons } from "../../components/auth/MobileSocialAuthButtons";
import { MobileOtpVerificationView } from "../../components/auth/MobileOtpVerificationView";
import { SignInEmailPasswordFields } from "../../components/auth/SignInEmailPasswordFields";
import { useSignInForm } from "../../components/auth/useSignInForm";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const form = useSignInForm();

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
        <View style={styles.brandBlock}>
          <MobileLogo size={64} source={require("../../../assets/icon.png")} />
          <Text style={styles.title}>
            {form.unverifiedEmail ? t("auth.checkYourEmailTitle") : t("auth.signIn")}
          </Text>
          <Text style={styles.subtitle}>
            {form.unverifiedEmail ? t("auth.otpLabel") : t("app.tagline")}
          </Text>
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
            <MobileSocialAuthButtons mode="signIn" onError={(msg) => form.setError(msg)} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t("auth.or").toUpperCase()}</Text>
              <View style={styles.dividerLine} />
            </View>

            <SignInEmailPasswordFields
              email={form.email}
              setEmail={form.setEmail}
              password={form.password}
              setPassword={form.setPassword}
              fieldErrors={form.fieldErrors}
              setFieldErrors={form.setFieldErrors}
            />

            <MobileButton
              onPress={form.handleSignIn}
              loading={form.loading}
              disabled={!form.isFormValid || form.loading}
              variant="primary"
            >
              {t("auth.signInCta")}
            </MobileButton>
          </View>
        )}

        {!form.unverifiedEmail && (
          <View style={styles.footer}>
            <Text style={styles.footerPrompt}>{t("auth.signUpPrompt")} </Text>
            <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
              <Text style={styles.footerLink}>{t("landing.createAccount")}</Text>
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
