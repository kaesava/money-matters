"use client";

import React, { useState, useEffect } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { PhoneInput, Spinner, useToast } from "@money-matters/ui/web";

interface ProfileSectionProps {
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
  currentTimezone: string;
}

export function ProfileSection({ user, currentTimezone }: ProfileSectionProps) {
  const toast = useToast();
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updateProfileMutation = trpc.updateUserProfile.useMutation();
  const updatePrefMutation = trpc.updateUserPreferences.useMutation();

  const [displayName, setDisplayName] = useState(user?.name || "");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+61");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [timezone, setTimezone] = useState(currentTimezone);
  const [showIcons, setShowIcons] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.name) setDisplayName(user.name);
  }, [user?.name]);

  useEffect(() => {
    if (userPrefQuery.data) {
      setNotificationEmail(userPrefQuery.data.notificationEmail || "");
      setPhoneCountryCode(userPrefQuery.data.phoneCountryCode || "+61");
      setPhoneNumber(userPrefQuery.data.phoneNumber || "");
      setTimezone(userPrefQuery.data.timezone || "Australia/Sydney");
      setShowIcons(userPrefQuery.data.showIcons ?? true);
    }
  }, [userPrefQuery.data]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfileMutation.mutateAsync({
        displayName,
        notificationEmail,
        phoneCountryCode,
        phoneNumber,
      });

      await updatePrefMutation.mutateAsync({
        timezone,
        showIcons,
      });

      userPrefQuery.refetch();
      toast.success(t("settings.profileSaved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const initials = displayName
    ? displayName
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <form onSubmit={handleSave} className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-6">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
        <div className="w-12 h-12 rounded-full bg-[#00B4A6] flex items-center justify-center text-white text-base font-extrabold shrink-0 shadow-xs">
          {initials}
        </div>
        <div>
          <h2 className="text-base font-extrabold text-[#1B2B4B]">{displayName || "User"}</h2>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Display Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#1B2B4B]">{t("settings.displayNameLabel")}</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("settings.displayNamePlaceholder")}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
        </div>

        {/* Login Email (Primary Auth - Read Only) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-slate-500">{t("settings.loginEmailLabel")}</label>
          <input
            type="email"
            value={user?.email || ""}
            disabled
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed"
          />
        </div>

        {/* Notification Email (Optional) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#1B2B4B]">{t("settings.notificationEmailLabel")}</label>
          <input
            type="email"
            value={notificationEmail}
            onChange={(e) => setNotificationEmail(e.target.value)}
            placeholder="partner-alerts@example.com"
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
          <p className="text-[11px] text-slate-500">{t("settings.notificationEmailHint")}</p>
        </div>

        {/* Mobile Phone Number (Optional) */}
        <div>
          <PhoneInput
            countryCode={phoneCountryCode}
            onCountryCodeChange={setPhoneCountryCode}
            phoneNumber={phoneNumber}
            onPhoneNumberChange={setPhoneNumber}
            label={t("settings.phoneNumberLabel")}
          />
          <p className="text-[11px] text-slate-500 pt-1">{t("settings.phoneNumberHint")}</p>
        </div>

        {/* Timezone */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#1B2B4B]">{t("settings.items.timezone")}</label>
          <select
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          >
            <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
            <option value="Australia/Melbourne">Australia/Melbourne (AEST)</option>
            <option value="Australia/Brisbane">Australia/Brisbane (AEST - No DST)</option>
            <option value="Australia/Adelaide">Australia/Adelaide (ACST)</option>
            <option value="Australia/Perth">Australia/Perth (AWST)</option>
            <option value="Pacific/Auckland">Pacific/Auckland (NZST)</option>
            <option value="UTC">UTC</option>
          </select>
        </div>

        {/* Show Decorative Icons Toggle */}
        <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl bg-slate-50/50">
          <div>
            <p className="text-xs font-bold text-[#1B2B4B]">{t("settings.items.showIcons")}</p>
            <p className="text-[11px] text-slate-500">{t("settings.items.showIconsHint")}</p>
          </div>
          <input
            type="checkbox"
            checked={showIcons}
            onChange={(e) => setShowIcons(e.target.checked)}
            className="w-4 h-4 rounded text-[#2563eb] focus:ring-[#2563eb]"
          />
        </div>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
        >
          {isSaving && <Spinner size="sm" />}
          <span>{t("settings.saveProfileCta")}</span>
        </button>
      </div>
    </form>
  );
}
