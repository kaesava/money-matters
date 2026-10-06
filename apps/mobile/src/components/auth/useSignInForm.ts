import { useState } from "react";
import { useRouter, useLocalSearchParams } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { t } from "@money-matters/i18n";
import { SignInInputSchema } from "@money-matters/types";
import { authClient } from "../../lib/auth";
import { trpc, setActiveSessionToken, setActiveTenantId, switchActiveTenant } from "../../lib/trpc";
import * as SecureStore from "expo-secure-store";
import { registerPushNotificationsAsync } from "../../lib/push";

export function useSignInForm() {
  const router = useRouter();
  const posthog = usePostHog();
  const searchParams = useLocalSearchParams<{ email?: string; reason?: string }>();
  const utils = trpc.useUtils();

  const [email, setEmail] = useState(searchParams.email ? String(searchParams.email).trim().toLowerCase() : "");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState<string | null>(
    searchParams.reason === "existing" ? t("auth.userAlreadyExists") : null
  );
  const [loading, setLoading] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [passwordForOtp, setPasswordForOtp] = useState<string | undefined>(undefined);

  const registerToken = trpc.registerToken.useMutation();

  const handleSignIn = async () => {
    setError(null);
    setFieldErrors({});

    const validation = SignInInputSchema.safeParse({ email: email.trim().toLowerCase(), password });
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        email: formatted.email?._errors[0] === "invalidEmail" ? t("validation.invalidEmail") : t("auth.fillAllFields"),
        password: formatted.password?._errors[0] ? t("auth.fillAllFields") : undefined,
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

        setError(t("auth.signInFailed"));
        return;
      }

      let sessionToken =
        (result.data as { session?: { token?: string }; token?: string })?.session?.token ||
        (result.data as { token?: string })?.token;

      if (!sessionToken) {
        const freshSession = await authClient.getSession();
        sessionToken = freshSession?.data?.session?.token;
      }

      if (sessionToken) {
        setActiveSessionToken(sessionToken);
        await SecureStore.setItemAsync("auth_session_token", sessionToken);
      }

      const session = await authClient.getSession();
      if (session?.data?.user) {
        posthog?.identify(session.data.user.id, {
          email: session.data.user.email,
          name: session.data.user.name,
        });

        try {
          const pushToken = await registerPushNotificationsAsync();
          if (pushToken) await registerToken.mutateAsync({ token: pushToken, platform: "android" });
        } catch {
          // Push notification registration fallback
        }

        const tenants = await utils.listUserTenants.fetch();
        if (tenants && tenants.length > 0) {
          const defaultTenant = tenants[0];
          setActiveTenantId(defaultTenant.id);
          await switchActiveTenant(defaultTenant.id);

          const tenantRecord = await utils.getTenant.fetch();
          if (tenantRecord?.setupStatus !== "COMPLETED") {
            router.replace("/(setup)/income");
            return;
          }
        }
      }

      router.replace("/(app)/home");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("auth.signInFailed");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSuccess = async () => {
    try {
      setLoading(true);
      const session = await authClient.getSession();
      if (session?.data?.session?.token) {
        setActiveSessionToken(session.data.session.token);
        await SecureStore.setItemAsync("auth_session_token", session.data.session.token);
      }
      if (session?.data?.user) {
        posthog?.identify(session.data.user.id, {
          email: session.data.user.email,
          name: session.data.user.name,
        });
        try {
          const pushToken = await registerPushNotificationsAsync();
          if (pushToken) await registerToken.mutateAsync({ token: pushToken, platform: "android" });
        } catch {
          // Push notification registration fallback
        }
      }
      router.replace("/(setup)/income");
    } catch {
      router.replace("/(setup)/income");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.trim().length > 0 && password.length > 0;

  return {
    email,
    setEmail,
    password,
    setPassword,
    fieldErrors,
    setFieldErrors,
    error,
    setError,
    loading,
    unverifiedEmail,
    setUnverifiedEmail,
    passwordForOtp,
    handleSignIn,
    handleOtpSuccess,
    isFormValid,
  };
}
