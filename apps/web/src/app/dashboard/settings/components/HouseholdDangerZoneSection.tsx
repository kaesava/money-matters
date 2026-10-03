"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { authClient } from "../../../../lib/auth";
import { useToast, InfoTooltip, TypedConfirmDialog } from "@money-matters/ui/web";

export function HouseholdDangerZoneSection() {
  const router = useRouter();
  const toast = useToast();

  const [activeModal, setActiveModal] = useState<"LEAVE" | "DELETE" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const deleteMutation = trpc.deleteMyAccount.useMutation();
  const leaveMutation = trpc.leaveMyHousehold.useMutation();

  const gov = govQuery.data;

  if (!gov) return null;

  const handleLeaveHousehold = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await leaveMutation.mutateAsync();
      toast.success(t("privacy.leftHouseholdSuccess"));
      setActiveModal(null);
      setTimeout(async () => {
        await authClient.signOut();
        router.push(res.hasOtherHousehold ? "/sign-in" : "/");
      }, 1500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.errorTryAgain"));
      setIsSubmitting(false);
    }
  };

  const handleDeleteHousehold = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await deleteMutation.mutateAsync();
      toast.success(t("toasts.deleted"));
      setActiveModal(null);
      setTimeout(async () => {
        await authClient.signOut();
        router.push("/");
      }, 1500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t("common.errorTryAgain"));
      setIsSubmitting(false);
    }
  };

  const leaveWarningText = gov.leaveWarning
    ? t(gov.leaveWarning.key, gov.leaveWarning.params)
    : "";

  const deleteWarningText = gov.deleteWarning
    ? t(gov.deleteWarning.key, gov.deleteWarning.params)
    : "";

  return (
    <section className="p-6 bg-red-50/40 border border-red-200 rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-extrabold text-red-700 tracking-wide uppercase">
          {t("settings.dangerZone.title")}
        </h2>
        <InfoTooltip content={t("settings.dangerZone.tooltip")} />
      </div>

      <p className="text-xs text-slate-600 font-medium">
        {t("settings.dangerZone.subtitle")}
      </p>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {(!gov.isSoleOwner || !gov.isOwner) && (
          <button
            type="button"
            onClick={() => setActiveModal("LEAVE")}
            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            {t("settings.dangerZone.leaveCta")}
          </button>
        )}

        {gov.isOwner && (
          <button
            type="button"
            onClick={() => setActiveModal("DELETE")}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            {t("settings.dangerZone.deleteCta")}
          </button>
        )}
      </div>

      {/* Leave Household Modal */}
      <TypedConfirmDialog
        isOpen={activeModal === "LEAVE"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleLeaveHousehold}
        title={t("privacy.leaveHouseholdModalTitle")}
        subtitle={t("privacy.leaveHouseholdModalSubtitle")}
        confirmPhrase={t("settings.dangerZone.leaveConfirmPhrase")}
        confirmLabel={t("settings.dangerZone.leaveConfirmLabel")}
        confirmButtonText={t("privacy.confirmLeaveCta")}
        variant="danger"
        isLoading={isSubmitting}
      >
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-950">
          <p className="text-xs font-semibold leading-relaxed">
            {leaveWarningText}
          </p>
        </div>
      </TypedConfirmDialog>

      {/* Delete Household Modal */}
      <TypedConfirmDialog
        isOpen={activeModal === "DELETE"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleDeleteHousehold}
        title={t("privacy.deleteHouseholdModalTitle")}
        subtitle={t("privacy.deleteHouseholdModalTooltip")}
        confirmPhrase={gov.householdName}
        confirmLabel={t("settings.dangerZone.deleteConfirmLabel", { name: gov.householdName })}
        confirmButtonText={t("privacy.confirmDeleteHouseholdCta")}
        variant="danger"
        isLoading={isSubmitting}
      >
        <div className="space-y-3">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-red-950">
            <p className="text-xs font-semibold leading-relaxed">
              {t("privacy.deleteHouseholdNotice")}
            </p>
            {deleteWarningText && (
              <p className="text-xs font-bold text-red-900 pt-1 border-t border-red-200">
                ⚠️ {deleteWarningText}
              </p>
            )}
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium space-y-1.5">
            <div className="flex items-center gap-1.5 font-bold text-amber-950">
              <span>💡</span>
              <span>{t("settings.dangerZone.downloadFirstTitle")}</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {t("settings.dangerZone.downloadFirstBody")}
            </p>
            <Link
              href="/dashboard/settings?tab=account-data"
              onClick={() => setActiveModal(null)}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#2563eb] hover:underline pt-1 cursor-pointer"
            >
              <span>{t("privacy.downloadZipBackup")}</span>
            </Link>
          </div>
        </div>
      </TypedConfirmDialog>
    </section>
  );
}
