"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Button, Input, Logo, Spinner } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/dashboard";
  const redirectUrl = (rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) ? rawRedirect : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");

  useEffect(() => {
    // Reset form state on mount to clear any previously entered credentials
    setEmail("");
    setPassword("");
    setError(null);
    setResetMessage(null);
    setUnverifiedEmail(null);
    setOtpCode("");
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);
    setResetMessage(null);
    setUnverifiedEmail(null);

    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.error) {
        const errMsg = result.error.message || "";
        const errCode = (result.error as { code?: string }).code || "";
        if (errCode === "EMAIL_NOT_VERIFIED" || errMsg.toLowerCase().includes("not verified")) {
          setUnverifiedEmail(email.trim().toLowerCase());
          setError(t("auth.emailNotVerified", { defaultValue: "Your email address has not been verified yet. Enter the 6-digit code sent to your email:" }));
        } else {
          setError(result.error.message || t("auth.signInFailed"));
        }
        setLoading(false);
        return;
      }

      // Full browser redirect ensures session cookie is sent to middleware and server components
      // Keep loading = true while full page navigation takes place
      window.location.href = redirectUrl;
    } catch (_err) {
      setError(t("auth.unexpectedError"));
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = unverifiedEmail || email;
    if (!targetEmail || !otpCode || otpCode.trim().length < 6) {
      setError(t("auth.invalidOtp", { defaultValue: "Please enter a valid 6-digit verification code." }));
      return;
    }

    setLoading(true);
    setError(null);
    setResetMessage(null);

    try {
      const res = await authClient.emailOtp.verifyEmail({
        email: targetEmail.trim().toLowerCase(),
        otp: otpCode.trim(),
      });

      if (res.error) {
        setError(res.error.message || t("auth.invalidOtp", { defaultValue: "Invalid or expired verification code." }));
        return;
      }

      if (password) {
        const signInRes = await authClient.signIn.email({
          email: targetEmail.trim().toLowerCase(),
          password,
        });
        if (!signInRes.error) {
          window.location.href = redirectUrl;
          return;
        }
      }
      setResetMessage(t("auth.otpSuccess", { defaultValue: "Email verified successfully! Please sign in with your password." }));
      setUnverifiedEmail(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify code.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: window.location.origin + redirectUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Google.");
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await authClient.signIn.social({
        provider: "apple",
        callbackURL: window.location.origin + redirectUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in with Apple.");
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = unverifiedEmail || email;
    if (!targetEmail) return;
    setLoading(true);
    setError(null);
    setResetMessage(null);
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email: targetEmail.trim().toLowerCase(),
        type: "email-verification",
      });
      setResetMessage(t("auth.resendSuccess", { defaultValue: "Verification code sent! Please check your email inbox." }));
    } catch (_err) {
      try {
        await authClient.sendVerificationEmail({
          email: targetEmail.trim().toLowerCase(),
        });
      } catch (_e) {
        // ignore
      }
      setResetMessage(t("auth.resendSuccess", { defaultValue: "Verification request submitted. Please check your email inbox." }));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError("Please enter your email address first to request a password reset.");
      return;
    }
    setLoading(true);
    setError(null);
    setResetMessage(null);
    try {
      const res = await authClient.requestPasswordReset({
        email: email.trim().toLowerCase(),
        redirectTo: window.location.origin + "/reset-password",
      });

      if (res.error) {
        setError(res.error.message || "Could not request password reset.");
        return;
      }

      setResetMessage("A password reset link has been sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 min-h-screen p-8">
      <main className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-zinc-100 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size="xl" />
          <h1 className="text-3xl font-bold tracking-tight text-[#1B2B4B]">{t("app.title")}</h1>
          <p className="text-sm font-medium text-zinc-500">{t("app.tagline")}</p>
        </div>

        {error && (
          <div className="ui-alert border-rose-200 bg-rose-50 text-rose-800 text-sm font-semibold rounded-lg p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
            {unverifiedEmail && (
              <form onSubmit={handleVerifyOtp} className="flex flex-col gap-2 mt-2 pt-2 border-t border-rose-200">
                <Input
                  label={t("auth.otpLabel", { defaultValue: "6-Digit Verification Code" })}
                  placeholder={t("auth.otpPlaceholder", { defaultValue: "123456" })}
                  value={otpCode}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtpCode(e.target.value)}
                  type="text"
                  name="signin-verification-otp"
                  maxLength={6}
                  required
                  disabled={loading}
                  className="text-center tracking-widest text-lg font-mono bg-white"
                />
                <Button type="submit" className="w-full" loading={loading}>
                  {t("auth.verifyCodeCta", { defaultValue: "Verify & Sign In" })}
                </Button>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={loading}
                  className="text-xs font-bold text-[#00B4A6] hover:underline text-left mt-1"
                >
                  ✉️ {t("auth.resendCodeTo", { email: unverifiedEmail })}
                </button>
              </form>
            )}
          </div>
        )}

        {resetMessage && (
          <div className="ui-alert border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-lg p-3">
            <span>✅</span>
            <span>{resetMessage}</span>
          </div>
        )}

        <form key="sign-in-form" onSubmit={handleSignIn} autoComplete="off" className="flex flex-col gap-4">
          <Input
            label={t("auth.emailLabel")}
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            type="email"
            name="signin-user-email"
            autoComplete="email"
            required
            disabled={loading}
          />

          <div className="flex flex-col gap-1 relative">
            <Input
              label={t("auth.passwordLabel")}
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              name="signin-user-password"
              autoComplete="current-password"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-xs font-semibold text-zinc-500 hover:text-zinc-800 cursor-pointer"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-[#2563eb] hover:underline cursor-pointer"
                disabled={loading}
              >
                {t("auth.forgotPassword")}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" loading={loading} disabled={!email.trim() || !password.trim()}>
            {t("auth.signInCta")}
          </Button>
        </form>

        <div className="flex items-center my-2">
          <div className="flex-1 h-[1px] bg-zinc-200"></div>
          <span className="px-3 text-xs font-semibold text-zinc-400 uppercase">{t("auth.or")}</span>
          <div className="flex-1 h-[1px] bg-zinc-200"></div>
        </div>

        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors py-2.5 rounded-lg text-sm font-semibold text-zinc-700 disabled:opacity-50"
            disabled={loading}
          >
            <span className="text-lg font-bold text-blue-500">G</span>
            {t("auth.signInWithGoogle")}
          </button>

          <button
            type="button"
            onClick={handleAppleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-black border border-black hover:bg-zinc-800 transition-colors py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            disabled={loading}
          >
            <span className="text-lg font-bold text-white"></span>
            {t("auth.signInWithApple", { defaultValue: "Sign in with Apple" })}
          </button>
        </div>

        <div className="flex justify-center gap-1.5 text-sm mt-2">
          <span className="text-zinc-500">{t("auth.signUpPrompt")}</span>
          <button
            type="button"
            onClick={() => router.push(`/sign-up${redirectUrl !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`)}
            className="font-bold text-[#00B4A6] hover:underline"
          >
            {t("auth.signUpCta")}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center"><Spinner size="lg" /></div>}>
      <SignInContent />
    </Suspense>
  );
}
