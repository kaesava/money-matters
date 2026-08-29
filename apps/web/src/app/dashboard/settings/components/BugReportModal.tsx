"use client";

import React, { useState, useEffect, useId } from "react";
import { t } from "@money-matters/i18n";
import { useToast } from "@money-matters/ui/web";
import { trpc } from "../../../../lib/trpc";
import { authClient } from "../../../../lib/auth";
import { getWebVersionInfo } from "../../../../lib/version";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export type WorkflowCategory =
  | "setup"
  | "waterfall"
  | "transactions_sync"
  | "categories_bills"
  | "ui_ux"
  | "account_auth"
  | "other";

export function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const toast = useToast();
  const titleId = useId();
  const categoryId = useId();
  const descriptionId = useId();
  const consentId = useId();
  const emailInputId = useId();

  const { data: session } = authClient.useSession();
  const userPrefQuery = trpc.getUserPreferences.useQuery(undefined, { enabled: isOpen });

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<WorkflowCategory>("setup");
  const [frustrationLevel, setFrustrationLevel] = useState<1 | 2 | 3 | 4>(2);
  const [description, setDescription] = useState("");
  const [contactConsent, setContactConsent] = useState(true);
  const [contactEmail, setContactEmail] = useState("");
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const versionInfo = getWebVersionInfo();
  const createBugReportMutation = trpc.createBugReport.useMutation();

  useEffect(() => {
    if (isOpen) {
      const prefEmail = userPrefQuery.data?.notificationEmail;
      const sessEmail = session?.user?.email;
      setContactEmail(prefEmail || sessEmail || "");
    }
  }, [isOpen, userPrefQuery.data?.notificationEmail, session?.user?.email]);

  // Environment diagnostics metadata
  const [envDetails, setEnvDetails] = useState({
    platform: "web" as const,
    appVersion: versionInfo.formattedVersion,
    pageUrl: "",
    deviceInfo: "",
  });

  function formatErrorMessage(err: unknown): string {
    if (err instanceof Error) {
      try {
        const parsed = JSON.parse(err.message);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const messages = parsed
            .map((item: { message?: string }) => item.message)
            .filter(Boolean);
          if (messages.length > 0) {
            return messages.join(". ");
          }
        }
      } catch (_e) {
        // Not a JSON error string
      }
      return err.message;
    }
    return "Failed to submit feedback. Please check your inputs.";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (!title.trim()) {
      setErrorText("Feedback Summary is required");
      return;
    }

    if (!description.trim()) {
      setErrorText("Description & Details is required");
      return;
    }

    try {
      const res = await createBugReportMutation.mutateAsync({
        title: title.trim(),
        category,
        frustrationLevel,
        description: description.trim(),
        contactConsent,
        userEmail: contactConsent && contactEmail ? contactEmail : undefined,
        platform: "web",
        appVersion: versionInfo.formattedVersion,
        pageUrl: envDetails.pageUrl,
        deviceInfo: envDetails.deviceInfo,
      });
      setSubmittedRef(res.id.slice(0, 8));
      toast.success(t("toasts.bugReportSuccess"));
    } catch (err) {
      setErrorText(formatErrorMessage(err));
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      let browserOS = "Web Browser";
      if (ua.includes("Chrome")) browserOS = "Chrome on macOS / Windows";
      else if (ua.includes("Safari")) browserOS = "Safari on macOS / iOS";
      else if (ua.includes("Firefox")) browserOS = "Firefox";

      setEnvDetails({
        platform: "web",
        appVersion: versionInfo.formattedVersion,
        pageUrl: window.location.href,
        deviceInfo: `${browserOS} (${navigator.platform || "Desktop"})`,
      });
    }
  }, [isOpen, versionInfo.formattedVersion]);

  const handleClose = React.useCallback(() => {
    setTitle("");
    setDescription("");
    setCategory("setup");
    setFrustrationLevel(2);
    setContactConsent(true);
    setSubmittedRef(null);
    setErrorText(null);
    setShowDiagnostics(false);
    onClose();
  }, [onClose]);

  // Handle Escape key dismissal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleClose]);

  if (!isOpen) return null;

  const frustrations: Array<{
    level: 1 | 2 | 3 | 4;
    emoji: string;
    label: string;
    sub: string;
    border: string;
    bg: string;
    text: string;
  }> = [
    {
      level: 1,
      emoji: "🟢",
      label: t("bugReport.frustrations.level1", { defaultValue: "Nice to fix" }),
      sub: t("bugReport.frustrations.level1Subtitle", { defaultValue: "Minor visual / cosmetic hiccup" }),
      border: "border-emerald-300",
      bg: "bg-emerald-50 text-emerald-900",
      text: "text-emerald-700",
    },
    {
      level: 2,
      emoji: "🟡",
      label: t("bugReport.frustrations.level2", { defaultValue: "Mild annoyance" }),
      sub: t("bugReport.frustrations.level2Subtitle", { defaultValue: "Small inconvenience, workaround exists" }),
      border: "border-amber-300",
      bg: "bg-amber-50 text-amber-900",
      text: "text-amber-700",
    },
    {
      level: 3,
      emoji: "🟠",
      label: t("bugReport.frustrations.level3", { defaultValue: "Frustrating" }),
      sub: t("bugReport.frustrations.level3Subtitle", { defaultValue: "Feature isn't working as expected" }),
      border: "border-orange-300",
      bg: "bg-orange-50 text-orange-900",
      text: "text-orange-700",
    },
    {
      level: 4,
      emoji: "🔴",
      label: t("bugReport.frustrations.level4", { defaultValue: "Pissed me off!" }),
      sub: t("bugReport.frustrations.level4Subtitle", { defaultValue: "Complete blocker / major crash" }),
      border: "border-rose-300",
      bg: "bg-rose-50 text-rose-900",
      text: "text-rose-700",
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: "var(--dash-surface, #FFFFFF)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h2 className="text-lg font-extrabold text-[#1B2B4B] flex items-center gap-2">
              <span>💬</span> {t("bugReport.title")}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              {t("bugReport.subtitle")}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label={t("bugReport.closeBtn")}
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-5">
          {submittedRef ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#22c55e] flex items-center justify-center text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-base font-extrabold text-[#1B2B4B]">
                {t("bugReport.successMsg")}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {t("bugReport.ticketRef", { ref: submittedRef })}
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="mt-2 px-6 py-2.5 rounded-xl bg-[#2563eb] text-white text-xs font-bold hover:bg-blue-700 transition-all shadow-xs"
              >
                {t("bugReport.closeBtn")}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {errorText && (
                <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-[#ba1a1a]">
                  {errorText}
                </div>
              )}

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor={titleId} className="text-xs font-bold text-[#1B2B4B]">
                  {t("bugReport.formTitleLabel")} <span className="text-rose-500">*</span>
                </label>
                <input
                  id={titleId}
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("bugReport.formTitlePlaceholder")}
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all"
                />
              </div>

              {/* Frustration Scale Pills */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-[#1B2B4B]">
                  {t("bugReport.formSeverityLabel", { defaultValue: "Frustration Level" })}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {frustrations.map((item) => {
                    const isSelected = frustrationLevel === item.level;
                    return (
                      <button
                        key={item.level}
                        type="button"
                        onClick={() => setFrustrationLevel(item.level)}
                        className={`p-2.5 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                          isSelected
                            ? `${item.border} ${item.bg} ring-2 ring-offset-1 ring-blue-500`
                            : "border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold text-xs">
                          <span>{item.emoji}</span>
                          <span>{item.label}</span>
                        </div>
                        <span className={`text-[10px] ${isSelected ? item.text : "text-slate-500"}`}>
                          {item.sub}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Workflow Category */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor={categoryId} className="text-xs font-bold text-[#1B2B4B]">
                  {t("bugReport.formCategoryLabel")}
                </label>
                <select
                  id={categoryId}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as WorkflowCategory)}
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                >
                  <option value="setup">🚀 {t("bugReport.categories.setup")}</option>
                  <option value="waterfall">💸 {t("bugReport.categories.waterfall")}</option>
                  <option value="transactions_sync">💳 {t("bugReport.categories.transactions_sync")}</option>
                  <option value="categories_bills">🏷️ {t("bugReport.categories.categories_bills")}</option>
                  <option value="ui_ux">🎨 {t("bugReport.categories.ui_ux")}</option>
                  <option value="account_auth">🔐 {t("bugReport.categories.account_auth")}</option>
                  <option value="other">💬 {t("bugReport.categories.other")}</option>
                </select>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor={descriptionId} className="text-xs font-bold text-[#1B2B4B]">
                  {t("bugReport.formDescriptionLabel")} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id={descriptionId}
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("bugReport.formDescriptionPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Contact Consent Checkbox */}
              <div className="flex items-center gap-2.5 pt-1">
                <input
                  id={consentId}
                  type="checkbox"
                  checked={contactConsent}
                  onChange={(e) => setContactConsent(e.target.checked)}
                  className="w-4 h-4 rounded text-[#2563eb] border-slate-300 focus:ring-[#2563eb]"
                />
                <label htmlFor={consentId} className="text-xs font-medium text-slate-700 cursor-pointer select-none">
                  {t("bugReport.contactConsentLabel", { defaultValue: "Email me updates & receipt regarding this ticket" })}
                </label>
              </div>

              {/* Conditional Notification Email Field */}
              {contactConsent && (
                <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
                  <label htmlFor={emailInputId} className="text-xs font-bold text-[#1B2B4B]">
                    {t("bugReport.formEmailLabel")} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id={emailInputId}
                    type="email"
                    required={contactConsent}
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={t("bugReport.formEmailPlaceholder")}
                    className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all"
                  />
                </div>
              )}

              {/* System Telemetry Collapsible Section */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900"
                >
                  <span>🔧 {t("bugReport.environmentSectionTitle")}</span>
                  <span>{showDiagnostics ? "▲" : "▼"}</span>
                </button>
                {showDiagnostics && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex flex-col gap-1 text-[11px] text-slate-500 font-mono">
                    <div>
                      <strong className="font-semibold text-slate-700">{t("bugReport.platform")}:</strong>{" "}
                      {envDetails.platform}
                    </div>
                    <div>
                      <strong className="font-semibold text-slate-700">{t("bugReport.appVersion")}:</strong>{" "}
                      {envDetails.appVersion}
                    </div>
                    <div className="truncate">
                      <strong className="font-semibold text-slate-700">{t("bugReport.deviceInfo")}:</strong>{" "}
                      {envDetails.deviceInfo}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {t("bugReport.closeBtn")}
                </button>
                <button
                  type="submit"
                  disabled={createBugReportMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2563eb] text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs"
                >
                  {createBugReportMutation.isPending ? t("bugReport.submitting") : t("bugReport.submitBtn")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
