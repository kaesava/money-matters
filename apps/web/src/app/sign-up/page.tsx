"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Button, Input } from "@money-matters/ui/web";
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

  const createTenant = trpc.createTenant.useMutation();

  useEffect(() => {
    // If already signed in, push to dashboard
    const token = localStorage.getItem("session_token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword || !name) {
      setError("Please fill in all fields.");
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
      // 1. Create the Better Auth account
      const signUpResult = await authClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
      });

      if (signUpResult.error) {
        setError(signUpResult.error.message || "Failed to create account. Please try again.");
        return;
      }

      const sessionToken = signUpResult.data?.token;
      if (sessionToken) {
        localStorage.setItem("session_token", sessionToken);
      }

      // 2. Create the tenant/household (uses transactional token context)
      await createTenant.mutateAsync({
        name: name.trim(),
      });

      // 3. Complete onboarding signup redirects
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign up.");
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

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 min-h-screen p-8">
      <main className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg border border-zinc-100 flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-[#1B2B4B]">{t("auth.signUp")}</h1>
          <p className="text-sm text-zinc-500">{t("app.description")}</p>
        </div>

        {error && (
          <div className="ui-alert border-rose-200 bg-rose-50 text-rose-800 text-sm font-semibold rounded-lg p-3">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <Input
            label={t("auth.nameLabel")}
            placeholder={t("auth.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            type="text"
            required
            disabled={loading}
          />

          <Input
            label={t("auth.emailLabel")}
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            disabled={loading}
          />

          <Input
            label={t("auth.passwordLabel")}
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            required
            disabled={loading}
          />

          <Input
            label="Confirm Password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            type="password"
            required
            disabled={loading}
          />

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? "Creating Account..." : t("auth.signUpCta")}
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
          Sign up with Google
        </button>

        <div className="flex justify-center gap-1.5 text-sm mt-2">
          <span className="text-zinc-500">Already have an account?</span>
          <button
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
