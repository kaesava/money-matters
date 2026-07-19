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
import * as Linking from "expo-linking";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS } from "@money-matters/ui";
import { authClient } from "../../lib/auth";
import { trpc, setActiveSessionToken } from "../../lib/trpc";
import * as SecureStore from "expo-secure-store";
import * as Notifications from "expo-notifications";

const API_URL = process.env["EXPO_PUBLIC_API_URL"] || "https://kesh-imac.tail09ef18.ts.net";

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
      const sessionToken = result.data?.token;
      if (sessionToken) {
        console.log(`[DEBUG client] Storing session token and caching it...`);
        await SecureStore.setItemAsync("money-matters_session_token", sessionToken);
        await SecureStore.setItemAsync("money-matters-session-token", sessionToken);
        setActiveSessionToken(sessionToken);
      }
      
      // Request and register push notifications token asynchronously
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          const expoToken = await Notifications.getExpoPushTokenAsync();
          // We can call registerToken tRPC mutator (fire-and-forget)
          trpc.registerToken.mutate({
            platform: Platform.OS === 'ios' ? 'ios' : 'android',
            token: expoToken.data,
          });
        }
      } catch (pushErr) {
        console.warn("Could not register push token:", pushErr);
      }

      // Successful sign-in — the session token is stored in secure storage.
      // Navigate to main app; the index route will redirect based on household status.
      router.replace("/(app)/home");
    } catch (err) {
      Alert.alert(t("auth.signInErrorTitle"), t("auth.signInErrorGeneric"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const webOrigin = API_URL.includes("localhost") || API_URL.includes("127.0.0.1") || API_URL.includes("10.0.2.2")
        ? API_URL.replace(":4000", ":3000")
        : API_URL;
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${webOrigin}/auth-callback`,
      });

      console.log(`[DEBUG client] Google social sign-in response:`, result);

      const sessionToken = await SecureStore.getItemAsync("money-matters_session_token") || 
                           await SecureStore.getItemAsync("money-matters-session-token");
      if (sessionToken) {
        console.log(`[DEBUG client] Captured social session token:`, sessionToken);
        await SecureStore.setItemAsync("money-matters-session-token", sessionToken);
        setActiveSessionToken(sessionToken);
      }
      router.replace("/(app)/home");
    } catch (err) {
      console.error("[DEBUG client] Google sign-in failed:", err);
      Alert.alert(
        t("auth.signInErrorTitle", { defaultValue: "Sign In Error" }),
        err instanceof Error ? err.message : t("auth.signInErrorGeneric", { defaultValue: "Failed to sign in." })
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert(
        t("auth.forgotPassword", { defaultValue: "Forgot password?" }),
        t("auth.enterEmailPrompt", { defaultValue: "Please enter your email address first." })
      );
      return;
    }
    setLoading(true);
    try {
      const appRedirectUrl = Linking.createURL("reset-password");
      const res = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: `${API_URL}/reset-password?redirect_to=${encodeURIComponent(appRedirectUrl)}`,
      });

      if (res.error) {
        Alert.alert(
          t("auth.forgotPassword", { defaultValue: "Forgot password?" }),
          res.error.message ?? t("auth.forgotPasswordError", { defaultValue: "Could not request password reset." })
        );
        return;
      }

      Alert.alert(
        t("auth.forgotPassword", { defaultValue: "Forgot password?" }),
        t("auth.forgotPasswordSuccess", { defaultValue: "A password reset link has been sent to your email." })
      );
    } catch (err) {
      Alert.alert(
        t("auth.forgotPassword", { defaultValue: "Forgot password?" }),
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

          <TouchableOpacity style={styles.forgotRow} onPress={handleForgotPassword}>
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

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t("auth.or", { defaultValue: "OR" })}</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleCta, loading && styles.ctaDisabled]}
            onPress={handleGoogleSignIn}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleCtaText}>
              {t("auth.signInWithGoogle", { defaultValue: "Sign in with Google" })}
            </Text>
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
  googleCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    borderRadius: DESIGN_TOKENS.radius.md,
    gap: 10,
    marginTop: 8,
  },
  googleIcon: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4285F4",
  },
  googleCtaText: {
    color: DESIGN_TOKENS.colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    fontWeight: "600",
  },
});
