"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { authClient } from "../../../../lib/auth";
import { Spinner, useToast } from "@money-matters/ui/web";

export default function HouseholdGovernancePage() {
  const router = useRouter();
  const toast = useToast();

  const [deleteTypedName, setDeleteTypedName] = useState("");
  const [leaveTypedText, setLeaveTypedText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const deleteMutation = trpc.deleteMyAccount.useMutation();
  const leaveMutation = trpc.leaveMyHousehold.useMutation();

  const gov = govQuery.data;

  if (govQuery.isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!gov) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold">
        Could not load household governance information.
      </div>
    );
  }

  const isDeleteInputValid = deleteTypedName.trim().toLowerCase() === gov.householdName.trim().toLowerCase();
  const isLeaveInputValid = leaveTypedText.trim().toUpperCase() === "LEAVE HOUSEHOLD";

  const handleDeleteHousehold = async () => {
    if (!isDeleteInputValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await deleteMutation.mutateAsync();
      toast.success(t("privacy.deletionSuccess"));
      setTimeout(async () => {
        await authClient.signOut();
        router.push("/");
      }, 1500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete household.");
      setIsSubmitting(false);
    }
  };

  const handleLeaveHousehold = async () => {
    if (!isLeaveInputValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await leaveMutation.mutateAsync();
      toast.success(t("privacy.leftHouseholdSuccess"));
      setTimeout(async () => {
        await authClient.signOut();
        router.push("/");
      }, 1500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to leave household.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl pb-16 animate-in fade-in duration-200">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col gap-1">
        <Link
          href="/dashboard/settings?tab=account-data"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition-all shadow-xs w-max mb-4"
        >
          <span>←</span> {t("privacy.backToSettings")}
        </Link>
        <h1 className="text-2xl font-extrabold text-[#1B2B4B]">
          {t("privacy.manageGovernance")}
        </h1>
        <p className="text-xs text-slate-500">
          {t("privacy.manageGovernanceSub")}
        </p>
      </div>

      {/* Context Badge */}
      <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400 font-medium">{t("privacy.currentHouseholdLabel")}</p>
          <p className="text-base font-extrabold text-[#1B2B4B]">{gov.householdName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-blue-50 text-[#2563eb] border border-blue-200 text-xs font-bold rounded-lg">
            Role: {gov.isOwner ? "Household Owner" : "Partner / Member"}
          </span>
          <span className="px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold rounded-lg">
            Members: {gov.memberCount}
          </span>
        </div>
      </div>

      {/* Leave Household Card */}
      {(!gov.isSoleOwner || !gov.isOwner) && (
        <section className="p-6 bg-white border border-amber-200 rounded-2xl shadow-xs space-y-4">
          <h2 className="text-base font-bold text-amber-900">{t("privacy.leaveHouseholdTitle")}</h2>

          {/* Prominent Warning Callout */}
          <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl space-y-1 text-amber-950 font-medium">
            <div className="flex items-center gap-2 font-extrabold text-amber-900 text-xs uppercase tracking-wider">
              <span>⚠️</span> Household Ownership & Private Pools Notice
            </div>
            <p className="text-xs leading-relaxed font-semibold">
              {gov.isOwner
                ? t("privacy.leaveOwnerWarning", { email: gov.partnerEmail || "your partner" })
                : t("privacy.leaveMemberWarning", { householdName: gov.householdName, email: gov.partnerEmail || "the owner" })}
            </p>
          </div>

          <div className="p-3 bg-amber-50/50 border border-amber-200 rounded-xl space-y-2">
            <p className="text-xs font-bold text-amber-900">
              {t("privacy.typeLeaveHouseholdToConfirm")}
            </p>
            <input
              type="text"
              value={leaveTypedText}
              onChange={(e) => setLeaveTypedText(e.target.value)}
              placeholder="LEAVE HOUSEHOLD"
              className="w-full px-3 py-2 text-xs font-mono border border-amber-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
            />
          </div>

          <button
            type="button"
            onClick={handleLeaveHousehold}
            disabled={!isLeaveInputValid || isSubmitting}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-xs"
          >
            {isSubmitting && <Spinner size="sm" />}
            {t("privacy.confirmLeaveCta")}
          </button>
        </section>
      )}

      {/* Delete Household Card (Owners Only) */}
      <section className="p-6 bg-white border border-red-200 rounded-2xl shadow-xs space-y-4">
        <h2 className="text-base font-bold text-[#ba1a1a]">{t("privacy.deleteHouseholdTitle")}</h2>

        {/* Prominent Irreversible Warning Callout */}
        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-xl space-y-1.5 text-red-950 font-medium">
          <div className="flex items-center gap-2 font-extrabold text-red-900 text-xs uppercase tracking-wider">
            <span>🛑</span> Irreversible Permanent Erasure Warning
          </div>
          <p className="text-xs leading-relaxed font-bold text-red-900">
            {t("privacy.deleteHouseholdNotice")}
          </p>
          {gov.partnerEmail && gov.isOwner && (
            <p className="text-xs font-semibold text-red-800 pt-1.5 border-t border-red-200">
              ⚠️ {t("privacy.deletePartnerWarning", { email: gov.partnerEmail })}
            </p>
          )}
        </div>

        {!gov.isOwner ? (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
            ℹ️ {t("privacy.ownerOnlyDeleteNotice", { email: gov.partnerEmail || "the owner" })}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl space-y-2">
              <p className="text-xs font-bold text-red-900">
                {t("privacy.typeHouseholdNameToConfirm", { name: gov.householdName })}
              </p>
              <input
                type="text"
                value={deleteTypedName}
                onChange={(e) => setDeleteTypedName(e.target.value)}
                placeholder={gov.householdName}
                className="w-full px-3 py-2 text-xs font-mono border border-red-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-bold"
              />
            </div>

            <button
              type="button"
              onClick={handleDeleteHousehold}
              disabled={!isDeleteInputValid || isSubmitting}
              className="w-full py-2.5 bg-[#ba1a1a] hover:bg-red-800 text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50 shadow-xs flex items-center justify-center gap-1.5"
            >
              {isSubmitting && <Spinner size="sm" />}
              {t("privacy.confirmDeleteHouseholdCta")}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
