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
import { trpc, setActiveSessionToken } from "../../lib/trpc";
import * as SecureStore from "expo-secure-store";

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const createTenant = trpc.createTenant.useMutation();

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword || !name) {
      Alert.alert(
        t("auth.signUpErrorTitle"),
        t("common.required", { defaultValue: "This field is required." })
      );
      return;
    }

    if (password.length < 8) {
      Alert.alert(
        t("auth.signUpErrorTitle"),
        t("auth.passwordTooShort", { defaultValue: "Password must be at least 8 characters long." })
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(
        t("auth.signUpErrorTitle"),
        t("auth.passwordsMustMatch", { defaultValue: "Passwords do not match." })
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

      console.log(`[DEBUG client] signUpResult:`, JSON.stringify(signUpResult, null, 2));

      if (signUpResult.error) {
        Alert.alert(
          t("auth.signUpErrorTitle"),
          signUpResult.error.message ?? t("auth.signUpErrorGeneric")
        );
        return;
      }
      const sessionToken = signUpResult.data?.token;
      if (sessionToken) {
        console.log(`[DEBUG client] Storing session token and caching it...`);
        await SecureStore.setItemAsync("money-matters-session-token", sessionToken);
        setActiveSessionToken(sessionToken);
      }

      // 2. Create the tenant/household — the server derives userId from the JWT.
      await createTenant.mutateAsync({
        name: name.trim(),
      });

      // 3. Navigate to the setup wizard
      router.replace("/(setup)/income");
    } catch (err) {
      Alert.alert(
        t("auth.signUpErrorTitle"),
        err instanceof Error ? err.message : String(err)
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← {t("common.back")}</Text>
          </TouchableOpacity>
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
            {t("auth.confirmPasswordLabel", { defaultValue: "Confirm Password" })}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={t("auth.confirmPasswordPlaceholder", { defaultValue: "Confirm Password" })}
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
