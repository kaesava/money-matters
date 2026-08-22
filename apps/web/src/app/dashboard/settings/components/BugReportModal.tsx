"use client";

import React, { useState, useEffect } from "react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BugReportModal({ isOpen, onClose }: BugReportModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<
    "budgeting" | "transactions" | "bank_accounts" | "ui_ux" | "auth" | "other"
  >("budgeting");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [description, setDescription] = useState("");
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Environment diagnostics metadata
  const [envDetails, setEnvDetails] = useState({
    platform: "web" as const,
    appVersion: "1.0.0-beta",
    pageUrl: "",
    deviceInfo: "",
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      setEnvDetails({
        platform: "web",
        appVersion: "1.0.0-beta",
        pageUrl: window.location.href,
        deviceInfo: navigator.userAgent,
      });
    }
  }, [isOpen]);

  const mutation = trpc.createBugReport.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setErrorText(null);
    },
    onError: (err) => {
      setErrorText(err.message || t("bugReport.errorMsg"));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3 || description.trim().length < 10) {
      setErrorText(t("bugReport.errorMsg"));
      return;
    }

    mutation.mutate({
      title: title.trim(),
      description: description.trim(),
      category,
      severity,
      platform: envDetails.platform,
      appVersion: envDetails.appVersion,
      pageUrl: envDetails.pageUrl,
      deviceInfo: envDetails.deviceInfo,
    });
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setCategory("budgeting");
    setSeverity("medium");
    setSubmitted(false);
    setErrorText(null);
    setShowDiagnostics(false);
    onClose();
  };

  if (!isOpen) return null;

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
              <span>🐛</span> {t("bugReport.title")}
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
          {/* Beta Callout Banner */}
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3 text-amber-900">
            <span className="text-lg leading-none mt-0.5">🧪</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-amber-900">
                {t("bugReport.betaNoticeTitle")}
              </span>
              <span className="text-xs text-amber-800/90 font-normal leading-relaxed">
                {t("bugReport.betaNoticeBody")}
              </span>
            </div>
          </div>

          {submitted ? (
            <div className="py-8 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#22c55e] flex items-center justify-center text-2xl font-bold">
                ✓
              </div>
              <h3 className="text-base font-extrabold text-[#1B2B4B]">
                {t("bugReport.successMsg")}
              </h3>
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
                <label className="text-xs font-bold text-[#1B2B4B]">
                  {t("bugReport.formTitleLabel")} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("bugReport.formTitlePlaceholder")}
                  className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all"
                />
              </div>

              {/* Category & Severity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#1B2B4B]">
                    {t("bugReport.formCategoryLabel")}
                  </label>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(
                        e.target.value as
                          | "budgeting"
                          | "transactions"
                          | "bank_accounts"
                          | "ui_ux"
                          | "auth"
                          | "other"
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  >
                    <option value="budgeting">{t("bugReport.categories.budgeting")}</option>
                    <option value="transactions">{t("bugReport.categories.transactions")}</option>
                    <option value="bank_accounts">{t("bugReport.categories.bank_accounts")}</option>
                    <option value="ui_ux">{t("bugReport.categories.ui_ux")}</option>
                    <option value="auth">{t("bugReport.categories.auth")}</option>
                    <option value="other">{t("bugReport.categories.other")}</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-[#1B2B4B]">
                    {t("bugReport.formSeverityLabel")}
                  </label>
                  <select
                    value={severity}
                    onChange={(e) =>
                      setSeverity(
                        e.target.value as "low" | "medium" | "high" | "critical"
                      )
                    }
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                  >
                    <option value="low">{t("bugReport.severities.low")}</option>
                    <option value="medium">{t("bugReport.severities.medium")}</option>
                    <option value="high">{t("bugReport.severities.high")}</option>
                    <option value="critical">{t("bugReport.severities.critical")}</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#1B2B4B]">
                  {t("bugReport.formDescriptionLabel")} <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("bugReport.formDescriptionPlaceholder")}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb] focus:border-transparent transition-all resize-none"
                />
              </div>

              {/* Environment Collapsible Section */}
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
                    <div>
                      <strong className="font-semibold text-slate-700">{t("bugReport.pageUrl")}:</strong>{" "}
                      {envDetails.pageUrl}
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
                  disabled={mutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#2563eb] text-white hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs"
                >
                  {mutation.isPending ? t("bugReport.submitting") : t("bugReport.submitBtn")}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
