import { useState } from "react";
import { useRouter } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { t } from "@money-matters/i18n";
import { SignUpInputSchema, isValidEmail } from "@money-matters/types";
import { authClient } from "../../lib/auth";
import { trpc, setActiveSessionToken } from "../../lib/trpc";
import * as SecureStore from "expo-secure-store";
import { registerPushNotificationsAsync } from "../../lib/push";

export function useSignUpForm() {
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
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (signUpResult.error) {
        setError(signUpResult.error.message || t("auth.signUpErrorGeneric"));
        setLoading(false);
        return;
      }

      await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "email-verification",
      });

      setPasswordForOtp(password);
      setUnverifiedEmail(email.trim().toLowerCase());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("auth.signUpErrorGeneric");
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
        const userId = session.data.user.id;
        posthog?.identify(userId, { email: session.data.user.email, name: session.data.user.name });
        try {
          await createTenant.mutateAsync({ name: `${name.trim()}'s Household`, country: country || "AU" });
        } catch {
          // Household provisioning fallback
        }
        try {
          const pushToken = await registerPushNotificationsAsync();
          if (pushToken) await registerToken.mutateAsync({ token: pushToken, platform: "android" });
        } catch {
          // Push registration fallback
        }
      }
      router.replace("/(setup)/income");
    } catch {
      router.replace("/(setup)/income");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    name.trim().length >= 2 &&
    country.length === 2 &&
    isValidEmail(email) &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    password === confirmPassword &&
    agreeTerms;

  return {
    name,
    setName,
    email,
    setEmail,
    country,
    setCountry,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    agreeTerms,
    setAgreeTerms,
    fieldErrors,
    setFieldErrors,
    error,
    setError,
    loading,
    unverifiedEmail,
    setUnverifiedEmail,
    passwordForOtp,
    handleSignUp,
    handleOtpSuccess,
    isFormValid,
  };
}
