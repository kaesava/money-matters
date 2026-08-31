"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Button, Input, Logo, Spinner } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/dashboard";
  const redirectUrl = (rawRedirect.startsWith("/") && !rawRedirect.startsWith("//")) ? rawRedirect : "/dashboard";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needVerification, setNeedVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const createTenant = trpc.createTenant.useMutation();

  useEffect(() => {
    // Clear form state on mount to prevent browser autofill retention from sign-in
    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);

    // If already signed in with an active session, push to dashboard
    authClient.getSession().then(({ data }) => {
      if (data?.session) {
        router.push(redirectUrl);
      }
    });
  }, [router, redirectUrl]);

  const [otpCode, setOtpCode] = useState("");
  const [otpError, setOtpError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !name) {
      setError(t("auth.fillAllFields", { defaultValue: "Please fill in all fields." }));
      return;
    }

    if (password.length < 8) {
      setError(t("auth.passwordTooShort", { defaultValue: "Password must be at least 8 characters long." }));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordsMustMatch", { defaultValue: "Passwords do not match." }));
      return;
    }

    if (!agreedToTerms) {
      setError(t("auth.mustAgreeToTerms", { defaultValue: "You must accept the Terms of Service and Privacy Policy to create an account." }));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create the Better Auth / Neon Auth account
      const signUpResult = await authClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
      });

      if (signUpResult.error) {
        const msg = signUpResult.error.message || "Failed to create account. Please try again.";
        if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exist")) {
          setError(t("auth.userAlreadyExists", { defaultValue: "An account with this email already exists. Please sign in." }));
        } else {
          setError(msg);
        }
        return;
      }

      // 2. Check if an active session was granted upon registration
      const sessionData = await authClient.getSession();
      if (sessionData.data?.session) {
        try {
          await createTenant.mutateAsync({ name: name.trim() });
        } catch (_tenantErr) {
          // Ignore if tenant creation fails during initial auth token propagation
        }
        router.push(redirectUrl === "/dashboard" ? "/setup" : redirectUrl);
      } else {
        // Email verification code is required by Neon Auth before session token can be issued
        setNeedVerification(true);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Failed to sign up.";
      if (errMsg.includes("Authentication required") || errMsg.includes("UNAUTHORIZED")) {
        setNeedVerification(true);
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 6) {
      setOtpError(t("auth.invalidOtp", { defaultValue: "Please enter a valid 6-digit verification code." }));
      return;
    }

    setLoading(true);
    setOtpError(null);

    try {
      const res = await authClient.emailOtp.verifyEmail({
        email: email.trim().toLowerCase(),
        otp: otpCode.trim(),
      });

      if (res.error) {
        setOtpError(res.error.message || t("auth.invalidOtp", { defaultValue: "Invalid or expired verification code." }));
        return;
      }

      const sessionData = await authClient.getSession();
      if (sessionData.data?.session) {
        try {
          await createTenant.mutateAsync({ name: name.trim() });
        } catch (_tErr) {
          // ignore duplicate tenant creation
        }
        window.location.href = redirectUrl === "/dashboard" ? "/setup" : redirectUrl;
      } else {
        window.location.href = "/sign-in";
      }
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : "Failed to verify code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    setResendStatus(null);
    setOtpError(null);
    try {
      await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "email-verification",
      });
      setResendStatus(t("auth.resendSuccess", { defaultValue: "Verification code sent! Please check your email inbox." }));
    } catch (_err) {
      try {
        await authClient.sendVerificationEmail({
          email: email.trim().toLowerCase(),
        });
      } catch (_e) {
        // ignore
      }
      setResendStatus(t("auth.resendSuccess", { defaultValue: "Verification request submitted. Please check your email inbox." }));
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
      setError(err instanceof Error ? err.message : "Failed to sign up with Google.");
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
      setError(err instanceof Error ? err.message : "Failed to sign up with Apple.");
      setLoading(false);
    }
  };

  if (needVerification) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 min-h-screen p-8">
        <main className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-zinc-100 flex flex-col gap-6 text-center">
          <div className="flex flex-col items-center gap-3">
            <Logo size="xl" />
            <div className="w-14 h-14 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center text-2xl my-1">
              ✉️
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1B2B4B]">
              {t("auth.checkYourEmailTitle", { defaultValue: "Check Your Email" })}
            </h1>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {t("auth.verificationSentMessage", {
                defaultValue: "We've created your account! Enter the 6-digit verification code sent to",
              })}{" "}
              <strong className="text-zinc-900">{email}</strong>.
            </p>
          </div>

          {otpError && (
            <div className="ui-alert border-rose-200 bg-rose-50 text-rose-800 text-xs font-semibold rounded-lg p-3">
              <span>⚠️</span>
              <span>{otpError}</span>
            </div>
          )}

          {resendStatus && (
            <div className="ui-alert border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg p-3">
              <span>✅</span>
              <span>{resendStatus}</span>
            </div>
          )}

          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4 text-left">
            <Input
              label={t("auth.otpLabel", { defaultValue: "6-Digit Verification Code" })}
              placeholder={t("auth.otpPlaceholder", { defaultValue: "123456" })}
              value={otpCode}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtpCode(e.target.value)}
              type="text"
              name="verification-otp"
              maxLength={6}
              required
              disabled={loading}
              className="text-center tracking-widest text-lg font-mono"
            />

            <Button type="submit" className="w-full mt-1" loading={loading}>
              {t("auth.verifyCodeCta", { defaultValue: "Verify Code" })}
            </Button>
          </form>

          <div className="flex flex-col gap-3 mt-1">
            <button
              type="button"
              onClick={handleResendOtp}
              disabled={loading}
              className="text-xs font-semibold text-[#00B4A6] hover:underline py-1 disabled:opacity-50"
            >
              {t("auth.resendVerificationLink", { defaultValue: "Didn't receive a code? Resend code" })}
            </button>

            <button
              type="button"
              onClick={() => router.push(`/sign-in${redirectUrl !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`)}
              className="text-xs font-semibold text-zinc-500 hover:underline"
            >
              {t("auth.signInCta", { defaultValue: "Go to Sign In" })}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 min-h-screen p-8">
      <main className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-zinc-100 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size="xl" />
          <h1 className="text-3xl font-bold tracking-tight text-[#1B2B4B]">{t("app.title")}</h1>
          <p className="text-sm font-medium text-zinc-500">{t("app.tagline")}</p>
        </div>

        {error && (
          <div className="ui-alert border-rose-200 bg-rose-50 text-rose-800 text-sm font-semibold rounded-lg p-3">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form key="sign-up-form" onSubmit={handleSignUp} autoComplete="off" className="flex flex-col gap-4">
          <Input
            label={t("auth.nameLabel")}
            placeholder={t("auth.namePlaceholder")}
            value={name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
            type="text"
            name="signup-user-name"
            autoComplete="name"
            required
            disabled={loading}
          />

          <Input
            label={t("auth.emailLabel")}
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            type="email"
            name="signup-user-email"
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
              name="signup-user-password"
              autoComplete="new-password"
              required
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-8 text-xs font-semibold text-zinc-500 hover:text-zinc-800"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
            {password && (
              <div className="text-xs font-semibold flex items-center gap-1 mt-1">
                <div className={`h-1.5 flex-1 rounded-full ${password.length < 6 ? 'bg-[#ba1a1a]' : password.length < 10 ? 'bg-amber-500' : 'bg-[#22c55e]'}`} />
                <div className={`h-1.5 flex-1 rounded-full ${password.length < 10 ? 'bg-zinc-200' : 'bg-[#22c55e]'}`} />
                <div className={`h-1.5 flex-1 rounded-full ${password.length < 12 ? 'bg-zinc-200' : 'bg-[#22c55e]'}`} />
                <span className={`ml-2 ${password.length < 6 ? 'text-[#ba1a1a]' : password.length < 10 ? 'text-amber-500' : 'text-[#22c55e]'}`}>
                  {password.length < 6 ? t("passwordStrength.weak") : password.length < 10 ? t("passwordStrength.medium") : t("passwordStrength.strong")}
                </span>
              </div>
            )}
          </div>

          <div className="relative">
            <Input
              label={t("auth.confirmPasswordLabel")}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              value={confirmPassword}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
              type={showPassword ? "text" : "password"}
              name="signup-user-confirm-password"
              autoComplete="new-password"
              required
              disabled={loading}
            />
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="signup-terms-checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 text-[#2563eb] focus:ring-[#2563eb] cursor-pointer"
              required
            />
            <label htmlFor="signup-terms-checkbox" className="text-xs text-zinc-600 leading-normal select-none cursor-pointer">
              I agree to the{" "}
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] font-bold hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#2563eb] font-bold hover:underline">
                Privacy Policy
              </a>
              .
            </label>
          </div>

          <Button type="submit" className="w-full mt-2" loading={loading} disabled={!name.trim() || !email.trim() || !password.trim() || !agreedToTerms}>
            {t("auth.signUpCta")}
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
            {t("auth.signUpWithGoogle")}
          </button>

          <button
            type="button"
            onClick={handleAppleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-black border border-black hover:bg-zinc-800 transition-colors py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            disabled={loading}
          >
            <span className="text-lg font-bold text-white"></span>
            {t("auth.signUpWithApple", { defaultValue: "Sign up with Apple" })}
          </button>
        </div>

        <div className="flex justify-center gap-1.5 text-sm mt-2">
          <span className="text-zinc-500">{t("auth.signInPrompt")}</span>
          <button
            type="button"
            onClick={() => router.push(`/sign-in${redirectUrl !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectUrl)}` : ""}`)}
            className="font-bold text-[#00B4A6] hover:underline"
          >
            {t("auth.signInCta")}
          </button>
        </div>
      </main>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center"><Spinner size="lg" /></div>}>
      <SignUpContent />
    </Suspense>
  );
}
