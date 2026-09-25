"use client";

import React, { useState } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Button, FormLabel, FormFieldError, FormErrorBanner } from "@money-matters/ui/web";
import { SUPPORTED_COUNTRIES, SignUpInputSchema, isValidEmail, getCountryDefaults } from "@money-matters/types";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator";

export interface PendingTenantData {
  name: string;
  country: string;
  currency: string;
  timezone: string;
}

interface SignUpFormProps {
  redirectUrl: string;
  onSuccess: () => void;
  onNeedOtp: (email: string, password?: string, pendingTenant?: PendingTenantData) => void;
  onExistingUser?: (email: string) => void;
  onError?: (msg: string) => void;
  autoFocus?: boolean;
}

export function SignUpForm({
  redirectUrl,
  onSuccess,
  onNeedOtp,
  onExistingUser,
  onError,
  autoFocus = true,
}: SignUpFormProps) {
  const [name, setName] = useState("");
  const [country, setCountry] = useState("AU");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    country?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    agreedToTerms?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);

  const createTenant = trpc.createTenant.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const validation = SignUpInputSchema.safeParse({
      name: name.trim(),
      country,
      email: email.trim().toLowerCase(),
      password,
      confirmPassword,
      agreedToTerms,
    });

    if (!validation.success) {
      const errMap: {
        name?: string;
        country?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
        agreedToTerms?: string;
      } = {};

      for (const issue of validation.error.issues) {
        const field = issue.path[0] as string;
        if (field === "name") errMap.name = t("auth.fillAllFields");
        if (field === "country") errMap.country = t("auth.fillAllFields");
        if (field === "email") {
          errMap.email = issue.message === "invalidEmail" ? t("validation.invalidEmail") : t("auth.fillAllFields");
        }
        if (field === "password") errMap.password = t("auth.passwordTooShort");
        if (field === "confirmPassword") {
          errMap.confirmPassword =
            issue.message === "passwordsMustMatch" ? t("auth.passwordsMustMatch") : t("auth.passwordTooShort");
        }
        if (field === "agreedToTerms") errMap.agreedToTerms = t("auth.mustAgreeToTerms");
      }

      setFieldErrors(errMap);
      const topError =
        errMap.agreedToTerms || errMap.confirmPassword || errMap.password || errMap.email || t("auth.fillAllFields");
      setFormError(topError);
      onError?.(topError);
      return;
    }

    setLoading(true);

    try {
      const signUpResult = await authClient.signUp.email({
        email: email.trim().toLowerCase(),
        password,
        name: name.trim(),
      });

      if (signUpResult.error) {
        const msg = signUpResult.error.message || "";
        const errCode = (signUpResult.error as { code?: string }).code || "";
        const isExistingUser =
          errCode === "USER_ALREADY_EXISTS" ||
          msg.toLowerCase().includes("already") ||
          msg.toLowerCase().includes("exist");

        if (isExistingUser) {
          const displayError = t("auth.userAlreadyExists");
          setFormError(displayError);
          onError?.(displayError);
          setLoading(false);
          if (onExistingUser) {
            onExistingUser(email.trim().toLowerCase());
          }
          return;
        }

        const displayError = msg || t("auth.signUpErrorTitle");
        setFormError(displayError);
        onError?.(displayError);
        setLoading(false);
        return;
      }

      const defaults = getCountryDefaults(country);
      const pendingTenant: PendingTenantData = {
        name: name.trim(),
        country,
        currency: defaults.currency,
        timezone: defaults.timezone,
      };

      const sessionData = await authClient.getSession();
      if (sessionData.data?.session) {
        try {
          await createTenant.mutateAsync(pendingTenant);
        } catch (_tErr) {
          // Non-blocking on initial tenant creation
        }
        onSuccess();
        window.location.href = redirectUrl === "/dashboard" ? "/setup" : redirectUrl;
      } else {
        onNeedOtp(email.trim().toLowerCase(), password, pendingTenant);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "";
      if (errMsg.includes("Authentication required") || errMsg.includes("UNAUTHORIZED")) {
        const defaults = getCountryDefaults(country);
        onNeedOtp(email.trim().toLowerCase(), password, {
          name: name.trim(),
          country,
          currency: defaults.currency,
          timezone: defaults.timezone,
        });
      } else {
        const displayErr = errMsg || t("auth.unexpectedError");
        setFormError(displayErr);
        onError?.(displayErr);
      }
      setLoading(false);
    }
  };

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const isFormValid =
    name.trim().length >= 2 &&
    country.length === 2 &&
    isValidEmail(email) &&
    password.length >= 8 &&
    confirmPassword === password &&
    agreedToTerms;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5 w-full">
      {formError && <FormErrorBanner message={formError} />}

      <div>
        <FormLabel required={true} htmlFor="signup-name">
          {t("auth.nameLabel")}
        </FormLabel>
        <input
          id="signup-name"
          type="text"
          autoFocus={autoFocus}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }));
          }}
          placeholder={t("auth.namePlaceholder")}
          className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
            fieldErrors.name ? "border-rose-400 focus:ring-rose-400" : "border-slate-200 focus:ring-[#2563eb]"
          } focus:outline-none focus:ring-2`}
        />
        <FormFieldError error={fieldErrors.name} />
      </div>

      <div>
        <FormLabel required={true} htmlFor="signup-country">
          {t("auth.countryLabel")}
        </FormLabel>
        <select
          id="signup-country"
          value={country}
          onChange={(e) => {
            setCountry(e.target.value);
            if (fieldErrors.country) setFieldErrors((prev) => ({ ...prev, country: undefined }));
          }}
          className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] bg-white text-slate-900"
        >
          {SUPPORTED_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
        <FormFieldError error={fieldErrors.country} />
      </div>

      <div>
        <FormLabel required={true} htmlFor="signup-email">
          {t("auth.emailLabel")}
        </FormLabel>
        <input
          id="signup-email"
          type="email"
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
        <FormLabel required={true} htmlFor="signup-password">
          {t("auth.passwordLabel")}
        </FormLabel>
        <input
          id="signup-password"
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
        {password.length > 0 && <PasswordStrengthIndicator password={password} />}
      </div>

      <div>
        <FormLabel required={true} htmlFor="signup-confirm-password">
          {t("auth.confirmPasswordLabel")}
        </FormLabel>
        <input
          id="signup-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          placeholder={t("auth.confirmPasswordPlaceholder")}
          className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
            fieldErrors.confirmPassword || passwordMismatch
              ? "border-rose-400 focus:ring-rose-400"
              : "border-slate-200 focus:ring-[#2563eb]"
          } focus:outline-none focus:ring-2`}
        />
        <FormFieldError
          error={
            fieldErrors.confirmPassword ||
            (passwordMismatch ? t("auth.passwordsMustMatch") : undefined)
          }
        />
      </div>

      <div className="flex flex-col gap-1 pt-1">
        <div className="flex items-start gap-2.5">
          <input
            id="agree-terms-checkbox"
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => {
              setAgreedToTerms(e.target.checked);
              if (fieldErrors.agreedToTerms) setFieldErrors((prev) => ({ ...prev, agreedToTerms: undefined }));
            }}
            className="mt-0.5 w-4 h-4 rounded text-[#2563eb] border-slate-300 focus:ring-[#2563eb]"
          />
          <label htmlFor="agree-terms-checkbox" className="text-[11px] text-slate-600 leading-snug">
            {t("auth.agreeTermsPrefix")}{" "}
            <Link href="/terms" target="_blank" className="text-[#2563eb] hover:underline font-semibold">
              {t("landing.footerTerms")}
            </Link>{" "}
            {t("auth.agreeTermsAnd")}{" "}
            <Link href="/privacy" target="_blank" className="text-[#2563eb] hover:underline font-semibold">
              {t("landing.footerPrivacy")}
            </Link>
          </label>
        </div>
        <FormFieldError error={fieldErrors.agreedToTerms} />
      </div>

      <Button
        type="submit"
        loading={loading}
        disabled={!isFormValid || loading}
        className="w-full mt-1 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-xs transition-all cursor-pointer"
      >
        {t("landing.createAccount")}
      </Button>
    </form>
  );
}

