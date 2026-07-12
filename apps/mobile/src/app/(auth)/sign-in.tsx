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
import { useRouter } from "expo-router";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS } from "@money-matters/ui";
import { authClient } from "../../lib/auth";

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) return;
    setLoading(true);
    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.error) {
        Alert.alert(
          t("auth.signInErrorTitle"),
          result.error.message ?? t("auth.signInErrorGeneric")
        );
        return;
      }

      // Successful sign-in — the session token is stored in secure storage.
      // Navigate to main app; the index route will redirect based on household status.
      router.replace("/(app)");
    } catch (err) {
      Alert.alert(t("auth.signInErrorTitle"), t("auth.signInErrorGeneric"));
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
        {/* Logo / Brand */}
        <View style={styles.brandBlock}>
          <Text style={styles.logoMark}>⬡</Text>
          <Text style={styles.title}>{t("app.title")}</Text>
          <Text style={styles.subtitle}>{t("auth.hint")}</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.label}>{t("auth.emailLabel")}</Text>
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
            autoComplete="password"
            textContentType="password"
          />

          <TouchableOpacity style={styles.forgotRow} onPress={() => {}}>
            <Text style={styles.forgotText}>{t("auth.forgotPassword")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.cta, loading && styles.ctaDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={DESIGN_TOKENS.colors.onPrimary} />
            ) : (
              <Text style={styles.ctaText}>{t("auth.signInCta")}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer nav */}
        <View style={styles.footer}>
          <Text style={styles.footerPrompt}>{t("auth.signUpPrompt")} </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
            <Text style={styles.footerLink}>{t("auth.signUpCta")}</Text>
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
    justifyContent: "center",
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    paddingVertical: 48,
  },
  brandBlock: { alignItems: "center", marginBottom: 40 },
  logoMark: { fontSize: 48, color: DESIGN_TOKENS.colors.accent, marginBottom: 8 },
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
  forgotRow: { alignItems: "flex-end", marginTop: 8, marginBottom: 24 },
  forgotText: { fontSize: 12, color: DESIGN_TOKENS.colors.accent },
  cta: {
    backgroundColor: DESIGN_TOKENS.colors.accent,
    paddingVertical: 15,
    borderRadius: DESIGN_TOKENS.radius.md,
    alignItems: "center",
  },
  ctaDisabled: { opacity: 0.65 },
  ctaText: { color: DESIGN_TOKENS.colors.onAccent, fontSize: 16, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 32 },
  footerPrompt: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  footerLink: { fontSize: 13, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
});
