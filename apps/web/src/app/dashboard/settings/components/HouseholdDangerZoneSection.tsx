"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { authClient } from "../../../../lib/auth";
import { useToast, InfoTooltip, Button } from "@money-matters/ui/web";
import { ModalDialog } from "../../../../components/web/ModalDialog";

export function HouseholdDangerZoneSection() {
  const router = useRouter();
  const toast = useToast();

  const [activeModal, setActiveModal] = useState<"LEAVE" | "DELETE" | null>(null);
  const [typedConfirm, setTypedConfirm] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const deleteMutation = trpc.deleteMyAccount.useMutation();
  const leaveMutation = trpc.leaveMyHousehold.useMutation();

  const gov = govQuery.data;

  if (!gov) return null;

  const isLeaveValid = typedConfirm.trim().toUpperCase() === "LEAVE HOUSEHOLD";
  const isDeleteValid = typedConfirm.trim().toLowerCase() === (gov.householdName || "").trim().toLowerCase();

  const handleLeaveHousehold = async () => {
    if (!isLeaveValid || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await leaveMutation.mutateAsync();
      toast.success(t("privacy.leftHouseholdSuccess"));
      setTimeout(async () => {
        await authClient.signOut();
        router.push(res.hasOtherHousehold ? "/sign-in" : "/");
      }, 1500);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to leave household.");
      setIsSubmitting(false);
    }
  };

  const handleDeleteHousehold = async () => {
    if (!isDeleteValid || isSubmitting) return;
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

  return (
    <section className="p-6 bg-red-50/40 border border-red-200 rounded-2xl shadow-xs space-y-4">
      <div className="flex items-center gap-2">
        <h2 className="text-base font-extrabold text-red-700 tracking-wide uppercase">
          DANGER ZONE
        </h2>
        <InfoTooltip content={t("partner.dangerZoneTooltip")} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        {(!gov.isSoleOwner || !gov.isOwner) && (
          <button
            type="button"
            onClick={() => {
              setTypedConfirm("");
              setActiveModal("LEAVE");
            }}
            className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-extrabold rounded-xl transition-all shadow-xs"
          >
            Leave Household
          </button>
        )}

        {gov.isOwner && (
          <button
            type="button"
            onClick={() => {
              setTypedConfirm("");
              setActiveModal("DELETE");
            }}
            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-extrabold rounded-xl transition-all shadow-xs"
          >
            Delete Household & Data
          </button>
        )}
      </div>

      {/* Leave Household Modal Confirmation */}
      <ModalDialog
        isOpen={activeModal === "LEAVE"}
        onClose={() => setActiveModal(null)}
        title="Confirm Departure: Leave Household"
        subtitle="Remove yourself from this shared household space."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-amber-950">
            <p className="text-xs font-semibold leading-relaxed">
              {gov.isOwner
                ? t("privacy.leaveOwnerWarning", { email: gov.partnerEmail || "your partner" })
                : t("privacy.leaveMemberWarning", { householdName: gov.householdName, email: gov.partnerEmail || "the owner" })}
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Type <span className="font-mono text-amber-900 font-bold">LEAVE HOUSEHOLD</span> to confirm:
            </label>
            <input
              type="text"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder="LEAVE HOUSEHOLD"
              className="w-full px-3 py-2 text-xs font-mono border border-amber-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
            >
              Cancel
            </button>
            <Button
              type="button"
              variant="danger"
              onClick={handleLeaveHousehold}
              loading={isSubmitting}
              disabled={!isLeaveValid}
            >
              Confirm &amp; Leave
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* Delete Household & Data Modal Confirmation */}
      <ModalDialog
        isOpen={activeModal === "DELETE"}
        onClose={() => setActiveModal(null)}
        title="Irreversible Action: Delete Household & Data"
        subtitle="Permanently erase all household records, categories, plans, and ledgers."
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-red-950">
            <p className="text-xs font-semibold leading-relaxed">
              {t("privacy.deleteHouseholdNotice")}
            </p>
            {gov.partnerEmail && (
              <p className="text-xs font-bold text-red-900 pt-1 border-t border-red-200">
                ⚠️ {t("privacy.deletePartnerWarning", { email: gov.partnerEmail })}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
              Type exact Household Name (<span className="font-mono text-red-900 font-bold">{gov.householdName}</span>) to confirm:
            </label>
            <input
              type="text"
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              placeholder={gov.householdName}
              className="w-full px-3 py-2 text-xs font-mono border border-red-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-red-500 font-bold"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl"
            >
              Cancel
            </button>
            <Button
              type="button"
              variant="danger"
              onClick={handleDeleteHousehold}
              loading={isSubmitting}
              disabled={!isDeleteValid}
            >
              Confirm &amp; Delete Permanently
            </Button>
          </div>
        </div>
      </ModalDialog>
    </section>
  );
}
