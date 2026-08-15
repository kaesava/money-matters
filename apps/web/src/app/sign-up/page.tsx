"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Button, Input, Logo } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
        router.push("/dashboard");
      }
    });
  }, [router]);

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
        router.push("/setup");
      } else {
        // Email verification is required by Neon Auth before session token can be issued
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

  const handleResendVerification = async () => {
    setLoading(true);
    setResendStatus(null);
    try {
      await authClient.sendVerificationEmail({
        email: email.trim().toLowerCase(),
      });
      setResendStatus(t("auth.resendSuccess", { defaultValue: "Verification email sent! Please check your inbox and spam folder." }));
    } catch (_err) {
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
        callbackURL: window.location.origin + "/dashboard",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up with Google.");
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
                defaultValue: "We've created your account! A verification link has been sent to",
              })}{" "}
              <strong className="text-zinc-900">{email}</strong>. {t("auth.verifyPrompt", { defaultValue: "Please click the link in your email to verify your address, then sign in to get started." })}
            </p>
          </div>

          {resendStatus && (
            <div className="ui-alert border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-lg p-3">
              <span>✅</span>
              <span>{resendStatus}</span>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-2">
            <Button onClick={() => router.push("/sign-in")} className="w-full">
              {t("auth.signInCta", { defaultValue: "Go to Sign In" })}
            </Button>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={loading}
              className="text-xs font-semibold text-[#00B4A6] hover:underline py-2 disabled:opacity-50"
            >
              {t("auth.resendVerificationLink", { defaultValue: "Didn't receive an email? Resend link" })}
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
          <h1 className="text-3xl font-bold tracking-tight text-[#1B2B4B]">{t("auth.signUp")}</h1>
          <p className="text-sm text-zinc-500">{t("app.description")}</p>
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

          <Input
            label={t("auth.passwordLabel")}
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            type="password"
            name="signup-user-password"
            autoComplete="new-password"
            required
            disabled={loading}
          />

          <Input
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
            type="password"
            name="signup-user-confirm-password"
            autoComplete="new-password"
            required
            disabled={loading}
          />

          <Button type="submit" className="w-full mt-2" loading={loading}>
            {t("auth.signUpCta")}
          </Button>
        </form>

        <div className="flex items-center my-2">
          <div className="flex-1 h-[1px] bg-zinc-200"></div>
          <span className="px-3 text-xs font-semibold text-zinc-400 uppercase">{t("auth.or")}</span>
          <div className="flex-1 h-[1px] bg-zinc-200"></div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors py-2.5 rounded-lg text-sm font-semibold text-zinc-700 disabled:opacity-50"
          disabled={loading}
        >
          <span className="text-lg font-bold text-blue-500">G</span>
          Sign up with Google
        </button>

        <div className="flex justify-center gap-1.5 text-sm mt-2">
          <span className="text-zinc-500">Already have an account?</span>
          <button
            type="button"
            onClick={() => router.push("/sign-in")}
            className="font-bold text-[#00B4A6] hover:underline"
          >
            {t("auth.signInCta")}
          </button>
        </div>
      </main>
    </div>
  );
}
