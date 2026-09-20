"use client";

import React, { useState } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Button, FormLabel, FormFieldError, FormErrorBanner } from "@money-matters/ui/web";
import { SignInInputSchema, isValidEmail } from "@money-matters/types";
import { authClient } from "../../lib/auth";

interface SignInFormProps {
  redirectUrl: string;
  onSuccess: () => void;
  onNeedOtp: (email: string) => void;
  onError?: (msg: string) => void;
  autoFocus?: boolean;
}

export function SignInForm({
  redirectUrl,
  onSuccess,
  onNeedOtp,
  onError,
  autoFocus = true,
}: SignInFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const validation = SignInInputSchema.safeParse({
      email: email.trim().toLowerCase(),
      password,
    });

    if (!validation.success) {
      const errMap: { email?: string; password?: string } = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === "email") {
          errMap.email = issue.message === "invalidEmail" ? t("validation.invalidEmail") : t("auth.fillAllFields");
        } else if (issue.path[0] === "password") {
          errMap.password = t("auth.fillAllFields");
        }
      }
      setFieldErrors(errMap);
      setFormError(t("auth.fillAllFields"));
      onError?.(t("auth.fillAllFields"));
      return;
    }

    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (result.error) {
        const errMsg = result.error.message || "";
        const errCode = (result.error as { code?: string }).code || "";
        if (errCode === "EMAIL_NOT_VERIFIED" || errMsg.toLowerCase().includes("not verified")) {
          onNeedOtp(email.trim().toLowerCase());
        } else {
          const displayErr = t("auth.signInFailed");
          setFormError(displayErr);
          onError?.(displayErr);
        }
        setLoading(false);
        return;
      }

      onSuccess();
      window.location.href = redirectUrl;
    } catch (_err) {
      const displayErr = t("auth.unexpectedError");
      setFormError(displayErr);
      onError?.(displayErr);
      setLoading(false);
    }
  };

  const isFormValid = isValidEmail(email) && password.length > 0;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full">
      {formError && <FormErrorBanner message={formError} />}

      <div>
        <FormLabel required={true} htmlFor="signin-email">
          {t("auth.emailLabel")}
        </FormLabel>
        <input
          id="signin-email"
          type="email"
          autoFocus={autoFocus}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
          }}
          placeholder={t("auth.emailPlaceholder")}
          className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
            fieldErrors.email ? "border-rose-400 focus:ring-rose-400" : "border-slate-200 focus:ring-[#2563eb]"
          } focus:outline-none focus:ring-2`}
        />
        <FormFieldError error={fieldErrors.email} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <FormLabel required={true} htmlFor="signin-password">
            {t("auth.passwordLabel")}
          </FormLabel>
          <Link
            href="/forgot-password"
            className="text-[11px] font-semibold text-[#2563eb] hover:underline"
          >
            {t("auth.forgotPassword")}
          </Link>
        </div>
        <input
          id="signin-password"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
          }}
          placeholder={t("auth.passwordPlaceholder")}
          className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
            fieldErrors.password ? "border-rose-400 focus:ring-rose-400" : "border-slate-200 focus:ring-[#2563eb]"
          } focus:outline-none focus:ring-2`}
        />
        <FormFieldError error={fieldErrors.password} />
      </div>

      <Button
        type="submit"
        loading={loading}
        disabled={!isFormValid || loading}
        className="w-full mt-1 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-xs transition-all cursor-pointer"
      >
        {t("auth.signInCta")}
      </Button>
    </form>
  );
}

