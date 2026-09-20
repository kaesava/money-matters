import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, AppState } from "react-native";
import Svg, { Path } from "react-native-svg";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS, MobileSpinner } from "@money-matters/ui/mobile";
import { authClient, DEFAULT_AUTH_ORIGIN } from "../../lib/auth";

interface MobileSocialAuthButtonsProps {
  mode: "signIn" | "signUp";
  onError: (msg: string) => void;
  onSuccess?: () => void;
}

const API_URL = process.env["EXPO_PUBLIC_API_URL"] || "https://api.moneymatters.kaesava.au";

export function MobileSocialAuthButtons({
  mode,
  onError,
}: MobileSocialAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] = useState<"google" | null>(null);

  // Automatically clear loading state when returning to the app
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        setLoadingProvider(null);
      }
    });
    return () => {
      sub.remove();
    };
  }, []);

  const handleSocialSignIn = async () => {
    setLoadingProvider("google");
    try {
      const devOrigin = DEFAULT_AUTH_ORIGIN;
      const callbackBase = __DEV__ ? `${devOrigin}/dev-callback/moneymatters` : API_URL;

      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: `${callbackBase}/auth-callback`,
      });

      if (result?.error) {
        setLoadingProvider(null);
        onError(result.error.message || t("auth.unexpectedError"));
        return;
      }
    } catch (err) {
      setLoadingProvider(null);
      const errMsg = err instanceof Error ? err.message : "";
      onError(errMsg || t("auth.unexpectedError"));
    }
  };

  const googleText = mode === "signIn" ? t("auth.signInWithGoogle") : t("auth.signUpWithGoogle");

  return (
    <View style={styles.container}>
      {/* Google Button */}
      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleSocialSignIn}
        disabled={loadingProvider !== null}
        activeOpacity={0.8}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <Path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <Path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <Path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </Svg>
        {loadingProvider === "google" ? (
          <MobileSpinner size="small" />
        ) : (
          <Text style={styles.googleButtonText}>{googleText}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    width: "100%",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingVertical: 12,
    gap: 10,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.textPrimary,
  },
});
