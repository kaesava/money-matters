"use client";

import React, { useState, useEffect } from "react";
import { trpc } from "../../../../lib/trpc";
import { useToast, validateAustralianPostcode, isFormDirty, ConfirmDialog } from "@money-matters/ui/web";
import { t } from "@money-matters/i18n";
import { HouseholdReadOnlyView } from "./HouseholdReadOnlyView";
import { HouseholdEditForm } from "./HouseholdEditForm";

export function HouseholdDetailsSection() {
  const toast = useToast();
  const utils = trpc.useUtils();
  
  const govQuery = trpc.getHouseholdGovernanceInfo.useQuery();
  const gov = govQuery.data;

  const [isEditing, setIsEditing] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  
  const [householdName, setHouseholdName] = useState("");
  const [country, setCountry] = useState("AU");
  const [currency, setCurrency] = useState("AUD");
  const [timezone, setTimezone] = useState("Australia/Sydney");
  const [pendingCurrency, setPendingCurrency] = useState<string | null>(null);
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (gov) {
      setHouseholdName(gov.householdName || "");
      setCountry(gov.country || "AU");
      setCurrency(gov.currency || "AUD");
      setTimezone(gov.timezone || "Australia/Sydney");
      setState(gov.state || "");
      setPostcode(gov.postcode || "");
    }
  }, [gov]);

  const updateHouseholdMut = trpc.updateHousehold.useMutation({
    onSuccess: () => {
      utils.getHouseholdGovernanceInfo.invalidate();
      utils.getUserPreferences.invalidate();
      setIsEditing(false);
      toast.success("Household details updated successfully");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update household details");
    },
  });

  const isOwner = gov?.isOwner ?? false;
  const initialState = gov ? {
    householdName: gov.householdName || "",
    country: gov.country || "AU",
    currency: gov.currency || "AUD",
    timezone: gov.timezone || "Australia/Sydney",
    state: gov.state || "",
    postcode: gov.postcode || "",
  } : null;

  const currentState = {
    householdName,
    country,
    currency,
    timezone,
    state,
    postcode,
  };
  const isDirty = isFormDirty(initialState, currentState);

  const handleCancel = () => {
    if (isDirty) {
      setShowDiscardDialog(true);
    } else {
      setIsEditing(false);
    }
  };

  const handleDiscardConfirm = () => {
    if (gov) {
      setHouseholdName(gov.householdName || "");
      setCountry(gov.country || "AU");
      setCurrency(gov.currency || "AUD");
      setTimezone(gov.timezone || "Australia/Sydney");
      setState(gov.state || "");
      setPostcode(gov.postcode || "");
    }
    setShowDiscardDialog(false);
    setIsEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gov?.isOwner) return;

    if (!householdName.trim()) {
      toast.error("Household name cannot be blank.");
      return;
    }

    if (country === "AU" && postcode.trim() && !validateAustralianPostcode(postcode)) {
      toast.error("Australian postcode must be exactly 4 digits.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      await updateHouseholdMut.mutateAsync({
        name: householdName.trim(),
        country: country.trim(),
        currency: currency.trim(),
        timezone: timezone.trim(),
        state: state.trim(),
        postcode: postcode.trim(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
      {isEditing ? (
        <HouseholdEditForm
          householdName={householdName}
          setHouseholdName={setHouseholdName}
          currency={currency}
          setCurrency={setCurrency}
          timezone={timezone}
          setTimezone={setTimezone}
          country={country}
          setCountry={setCountry}
          state={state}
          setState={setState}
          postcode={postcode}
          setPostcode={setPostcode}
          isDirty={isDirty}
          isSubmitting={isSubmitting}
          onSave={handleSave}
          onCancel={handleCancel}
          setPendingCurrency={setPendingCurrency}
          govCurrency={gov?.currency}
        />
      ) : (
        <HouseholdReadOnlyView
          householdName={householdName}
          currency={currency}
          timezone={timezone}
          country={country}
          state={state}
          postcode={postcode}
          isOwner={isOwner}
          onEdit={() => setIsEditing(true)}
        />
      )}

      {showDiscardDialog && (
        <ConfirmDialog
          isOpen={showDiscardDialog}
          title={t("modals.discardChanges.title")}
          description={t("modals.discardChanges.description")}
          confirmLabel={t("modals.discardChanges.discard")}
          cancelLabel={t("modals.discardChanges.cancel")}
          variant="danger"
          onConfirm={handleDiscardConfirm}
          onClose={() => setShowDiscardDialog(false)}
        />
      )}

      {pendingCurrency && (
        <ConfirmDialog
          isOpen={!!pendingCurrency}
          title={t("settings.currencyConfirmTitle")}
          description={t("settings.currencyConfirmBody", {
            oldCurrency: gov?.currency || "AUD",
            newCurrency: pendingCurrency,
          })}
          confirmLabel={t("common.confirm")}
          cancelLabel={t("common.cancel")}
          variant="warning"
          onConfirm={() => {
            setCurrency(pendingCurrency);
            setPendingCurrency(null);
          }}
          onClose={() => {
            setPendingCurrency(null);
          }}
        />
      )}
    </section>
  );
}
