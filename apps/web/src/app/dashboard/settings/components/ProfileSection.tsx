"use client";

import React, { useState, useEffect, useRef } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { PhoneInput, Spinner, useToast } from "@money-matters/ui/web";

interface ProfileSectionProps {
  user?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  currentTimezone: string;
}

export function ProfileSection({ user, currentTimezone }: ProfileSectionProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const updateProfileMutation = trpc.updateUserProfile.useMutation();
  const updatePrefMutation = trpc.updateUserPreferences.useMutation();

  const [displayName, setDisplayName] = useState(user?.name || "");
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.image || "");
  const [notificationEmail, setNotificationEmail] = useState(user?.email || "");
  const [phoneCountryCode, setPhoneCountryCode] = useState("+61");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [timezone, setTimezone] = useState(currentTimezone);
  const [showIcons, setShowIcons] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userPrefQuery.data) {
      setNotificationEmail(userPrefQuery.data.notificationEmail || user?.email || "");
      setPhoneCountryCode(userPrefQuery.data.phoneCountryCode || "+61");
      setPhoneNumber(userPrefQuery.data.phoneNumber || "");
      setTimezone(userPrefQuery.data.timezone || "Australia/Sydney");
      setShowIcons(userPrefQuery.data.showIcons ?? true);
    }
  }, [userPrefQuery.data, user?.email]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar image size must be under 2MB.");
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Please upload a PNG, JPG, or WEBP image.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxDim = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/webp", 0.85);
        setAvatarUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast.error("Name is required.");
      return;
    }

    if (!notificationEmail.trim()) {
      toast.error("Notification email is required.");
      return;
    }

    setIsSaving(true);
    try {
      await updateProfileMutation.mutateAsync({
        displayName: displayName.trim(),
        notificationEmail: notificationEmail.trim(),
        phoneCountryCode,
        phoneNumber,
        avatarUrl,
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
      {/* Header & Avatar Upload */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
        <div className="relative group shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-14 h-14 rounded-full object-cover border-2 border-[#1B2B4B] shadow-xs"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#1B2B4B] flex items-center justify-center text-white text-lg font-extrabold shadow-xs">
              {initials}
            </div>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#2563eb] text-white flex items-center justify-center text-xs shadow-md hover:bg-blue-700 transition-colors cursor-pointer"
            title={t("settings.avatarUploadLabel")}
          >
            📷
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png, image/jpeg, image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>
        <div>
          <h2 className="text-base font-extrabold text-[#1B2B4B]">{displayName || "User"}</h2>
          <p className="text-xs text-slate-500">{user?.email}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{t("settings.avatarUploadHint")}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Name (Mandatory) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#1B2B4B]">
            {t("settings.displayNameLabel")} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
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

        {/* Notification Email (Mandatory) */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#1B2B4B]">
            {t("settings.notificationEmailLabel")} <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            value={notificationEmail}
            onChange={(e) => setNotificationEmail(e.target.value)}
            placeholder="alerts@example.com"
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
          />
          <p className="text-[11px] text-slate-500">{t("settings.notificationEmailHint")}</p>
        </div>

        {/* Mobile Phone Number */}
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
          className="px-5 py-2.5 bg-[#1B2B4B] hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
        >
          {isSaving && <Spinner size="sm" />}
          <span>{t("settings.saveProfileCta")}</span>
        </button>
      </div>
    </form>
  );
}
