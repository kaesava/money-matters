"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Button, Input } from "@money-matters/ui/web";
import { authClient } from "../../lib/auth";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  useEffect(() => {
    // If already signed in, push to dashboard
    const token = localStorage.getItem("session_token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError(null);
    setResetMessage(null);

    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.error) {
        setError(result.error.message || "Failed to sign in. Please check your credentials.");
        return;
      }

      const sessionToken = result.data?.token;
      if (sessionToken) {
        localStorage.setItem("session_token", sessionToken);
      }
      router.push("/dashboard");
    } catch (_err) {
      setError("An unexpected error occurred. Please try again.");
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
      setError(err instanceof Error ? err.message : "Failed to sign in with Google.");
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
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-4xl text-[#00B4A6]">⬡</span>
          <h1 className="text-3xl font-bold tracking-tight text-[#1B2B4B]">{t("app.title")}</h1>
          <p className="text-sm text-zinc-500">{t("auth.hint")}</p>
        </div>

        {error && (
          <div className="ui-alert border-rose-200 bg-rose-50 text-rose-800 text-sm font-semibold rounded-lg p-3">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {resetMessage && (
          <div className="ui-alert border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-lg p-3">
            <span>✅</span>
            <span>{resetMessage}</span>
          </div>
        )}

        <form onSubmit={handleSignIn} className="flex flex-col gap-4">
          <Input
            label={t("auth.emailLabel")}
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            disabled={loading}
          />

          <div className="flex flex-col gap-1">
            <Input
              label={t("auth.passwordLabel")}
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              disabled={loading}
            />
            <div className="flex justify-end mt-1">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-[#00B4A6] hover:underline"
                disabled={loading}
              >
                {t("auth.forgotPassword")}
              </button>
            </div>
          </div>

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? "Signing in..." : t("auth.signInCta")}
          </Button>
        </form>

        <div className="flex items-center my-2">
          <div className="flex-1 h-[1px] bg-zinc-200"></div>
          <span className="px-3 text-xs font-semibold text-zinc-400 uppercase">{t("auth.or")}</span>
          <div className="flex-1 h-[1px] bg-zinc-200"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors py-2.5 rounded-lg text-sm font-semibold text-zinc-700 disabled:opacity-50"
          disabled={loading}
        >
          <span className="text-lg font-bold text-blue-500">G</span>
          {t("auth.signInWithGoogle")}
        </button>

        <div className="flex justify-center gap-1.5 text-sm mt-2">
          <span className="text-zinc-500">{t("auth.signUpPrompt")}</span>
          <button
            onClick={() => router.push("/sign-up")}
            className="font-bold text-[#00B4A6] hover:underline"
          >
            {t("auth.signUpCta")}
          </button>
        </div>
      </main>
    </div>
  );
}
