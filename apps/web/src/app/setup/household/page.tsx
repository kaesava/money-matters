"use client";

import React, { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import {
  Button,
  FormLabel,
  FormFieldError,
  FormErrorBanner,
  GenericSelectField,
  Logo,
} from "@money-matters/ui/web";
import {
  SUPPORTED_COUNTRIES,
  COMMON_TIMEZONES,
  getCountryDefaults,
  detectBestGuessCountry,
} from "@money-matters/types";
import { trpc } from "../../../lib/trpc";

export default function HouseholdSetupPage() {
  const router = useRouter();
  const createTenant = trpc.createTenant.useMutation();
  const utils = trpc.useUtils();

  const nameId = useId();
  const countryId = useId();
  const currencyId = useId();
  const timezoneId = useId();

  const detectedTimezone = React.useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "Australia/Sydney";
    } catch {
      return "Australia/Sydney";
    }
  }, []);

  const detectedCountry = React.useMemo(() => {
    try {
      const browserLocale =
        typeof navigator !== "undefined"
          ? navigator.languages?.[0] || navigator.language || ""
          : "";
      return detectBestGuessCountry(browserLocale, detectedTimezone);
    } catch {
      return "AU";
    }
  }, [detectedTimezone]);

  const [name, setName] = useState("");
  const [country, setCountry] = useState(() => detectedCountry);
  const [currency, setCurrency] = useState(() => getCountryDefaults(detectedCountry).currency);
  const [timezone, setTimezone] = useState(() => detectedTimezone);
  const [error, setError] = useState<string | null>(null);

  const handleCountryChange = (nextCountry: string) => {
    setCountry(nextCountry);
    const defaults = getCountryDefaults(nextCountry);
    setCurrency(defaults.currency);
    setTimezone(defaults.timezone);
  };

  const isFormValid = name.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || createTenant.isPending) return;

    setError(null);
    try {
      await createTenant.mutateAsync({
        name: name.trim(),
        country,
        currency,
        timezone,
      });

      await utils.getTenantStatus.invalidate();
      router.push("/setup");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t("settings.household.saveHouseholdFailed");
      setError(message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans">
      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10 flex flex-col gap-6">
          <div className="text-center flex flex-col items-center gap-2">
            <Logo size="lg" />
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1B2B4B]">
              {t("auth.householdNameLabel")}
            </h1>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              {t("auth.countrySetupDescription")}
            </p>
          </div>

          {error && <FormErrorBanner message={error} />}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <FormLabel htmlFor={nameId} required>
                {t("auth.householdNameLabel")}
              </FormLabel>
              <input
                id={nameId}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("auth.householdNamePlaceholder")}
                autoFocus
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
              />
              {!name.trim() && (
                <FormFieldError error={t("auth.householdNameRequired")} />
              )}
            </div>

            <div>
              <GenericSelectField
                id={countryId}
                label={t("auth.countryLabel")}
                value={country}
                options={SUPPORTED_COUNTRIES.map((c) => ({
                  value: c.code,
                  label: `${c.flag} ${c.name}`,
                }))}
                onChange={handleCountryChange}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <GenericSelectField
                  id={currencyId}
                  label={t("auth.currencyLabel")}
                  value={currency}
                  options={[
                    { value: "AUD", label: "AUD ($)" },
                    { value: "NZD", label: "NZD ($)" },
                    { value: "USD", label: "USD ($)" },
                    { value: "GBP", label: "GBP (£)" },
                    { value: "EUR", label: "EUR (€)" },
                    { value: "CAD", label: "CAD ($)" },
                    { value: "SGD", label: "SGD ($)" },
                  ]}
                  onChange={setCurrency}
                />
              </div>

              <div>
                <GenericSelectField
                  id={timezoneId}
                  label={t("auth.timezoneLabel")}
                  value={timezone}
                  options={COMMON_TIMEZONES.map((tz) => ({
                    value: tz.value,
                    label: tz.label,
                  }))}
                  onChange={setTimezone}
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3 mt-2 rounded-xl text-sm font-semibold"
              disabled={!isFormValid || createTenant.isPending}
              loading={createTenant.isPending}
            >
              {t("common.continue")}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}
