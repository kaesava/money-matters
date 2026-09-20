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
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePostHog } from "posthog-react-native";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS, MobileLogo, useMobileToast } from "@money-matters/ui/mobile";
import { SUPPORTED_COUNTRIES } from "@money-matters/types";
import { authClient } from "../../lib/auth";
import { trpc, setActiveSessionToken } from "../../lib/trpc";
import * as SecureStore from "expo-secure-store";
import { registerPushNotificationsAsync } from "../../lib/push";

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const toast = useMobileToast();
  const router = useRouter();
  const posthog = usePostHog();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("AU");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const createTenant = trpc.createTenant.useMutation();
  const registerToken = trpc.registerToken.useMutation();

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword || !name) {
      toast.error(
        t("common.required"),
        t("auth.signUpErrorTitle")
      );
      return;
    }

    if (password.length < 8) {
      toast.error(
        t("auth.passwordTooShort"),
        t("auth.signUpErrorTitle")
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error(
        t("auth.passwordsMustMatch"),
        t("auth.signUpErrorTitle")
      );
      return;
    }

    setLoading(true);
    try {
      // 1. Create the Neon Auth account
      const signUpResult = await authClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
      });

      if (signUpResult.error) {
        toast.error(
          signUpResult.error.message ?? t("auth.signUpErrorGeneric"),
          t("auth.signUpErrorTitle")
        );
        return;
      }
      const sessionToken = (signUpResult.data as { session?: { token?: string }; token?: string })?.session?.token || (signUpResult.data as { token?: string })?.token;
      if (sessionToken) {
        await SecureStore.setItemAsync("money-matters_session_token", sessionToken);
        await SecureStore.setItemAsync("money-matters-session-token", sessionToken);
        setActiveSessionToken(sessionToken);
      }

      // Identify the new user and capture sign-up event
      const userId = signUpResult.data?.user?.id;
      if (userId) {
        posthog.identify(userId, {
          $set: { name: name.trim() },
          $set_once: { signup_date: new Date().toISOString() },
        });
      }
      posthog.capture('user_signed_up', { method: 'email' });

      // 2. Create the tenant/household — the server derives userId from the JWT.
      await createTenant.mutateAsync({
        name: name.trim(),
        country,
      });

      // Request and register push notifications token asynchronously
      try {
        const tokenData = await registerPushNotificationsAsync();
        if (tokenData) {
          registerToken.mutate({
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
            token: tokenData,
          });
        }
      } catch (pushErr) {
        console.warn("Could not register push token:", pushErr);
      }

      // 3. Navigate to the setup wizard
      router.replace("/(setup)/income");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : String(err),
        t("auth.signUpErrorTitle")
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← {t("common.back")}</Text>
          </TouchableOpacity>
          <MobileLogo size={48} source={require("../../../assets/icon.png")} />
          <Text style={styles.title}>{t("auth.signUp")}</Text>
          <Text style={styles.subtitle}>{t("app.description")}</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>{t("auth.nameLabel")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("auth.namePlaceholder")}
            placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
            value={name}
            onChangeText={setName}
            textContentType="name"
            autoComplete="name"
          />

          <Text style={[styles.label, styles.labelGap]}>{t("auth.countryLabel")}</Text>
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

          <Text style={[styles.label, styles.labelGap]}>{t("auth.emailLabel")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("auth.emailPlaceholder")}
            placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
          />

          <Text style={[styles.label, styles.labelGap]}>{t("auth.passwordLabel")}</Text>
          <TextInput
            style={styles.input}
            placeholder={t("auth.passwordPlaceholder")}
            placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <Text style={[styles.label, styles.labelGap]}>
            {t("auth.confirmPasswordLabel")}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t("auth.confirmPasswordPlaceholder")}
            placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <TouchableOpacity
            style={[styles.cta, loading && styles.ctaDisabled]}
            onPress={handleSignUp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={DESIGN_TOKENS.colors.onPrimary} />
            ) : (
              <Text style={styles.ctaText}>{t("auth.signUpCta")}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerPrompt}>{t("auth.signInPrompt")} </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/sign-in")}>
            <Text style={styles.footerLink}>{t("auth.signInCta")}</Text>
          </TouchableOpacity>
        </View>
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
  countryRow: { flexDirection: "row", marginBottom: 6 },
  countryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: "#E5E7EB",
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
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerPrompt: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  footerLink: { fontSize: 13, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
});
