import { useState } from 'react';
import { t } from '@money-matters/i18n';
import { useMobileToast, showMobileConfirm } from '@money-matters/ui/mobile';
import type { EstimatedCategoryItem } from '@money-matters/types';
import type { EnvelopeDraftPayload, EnvelopeItem } from '../components/EnvelopeFormModal';
import { useSetupWizard } from './SetupWizardContext';

/**
 * Manages category/goal draft editing, addition, and removal handlers for the Setup Categories screen.
 */
export function useSetupCategoriesDraftHandlers() {
  const toast = useMobileToast();
  const [showAddEnvelopeModal, setShowAddEnvelopeModal] = useState(false);
  const [envelopeToEditDraft, setEnvelopeToEditDraft] = useState<EnvelopeItem | null>(null);
  const {
    isRerun,
    goals,
    setGoals,
    handleRemoveGoal,
    activeEveryday,
    activeRegular,
    activeGoals,
    bankAccounts,
    categoryFrequencies,
    setCategoryFrequencies,
    setAmountOverrides,
    setBillTypeOverrides,
    setRemovedCategoryNames,
    setCustomCategories,
    convertFromMonthly,
  } = useSetupWizard();

  const executeRemoveCategory = (name: string) => {
    setRemovedCategoryNames((prev) => new Set(prev).add(name));
    const matchedGoal = goals.find((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (matchedGoal) handleRemoveGoal(matchedGoal.id);
  };

  const handleAttemptRemoveCategory = (name: string) => {
    const allItems = [...activeEveryday, ...activeRegular, ...activeGoals];
    const matchedCat = allItems.find((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
    const matchedGoal = goals.find((g) => g.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (matchedCat?.isSurplusTarget || matchedGoal?.isSurplusTarget) {
      toast.error(t('setup.surplusTargetDeleteWarning', { name }), t('setup.protectedPoolTitle'));
      return;
    }
    const isExistingDbItem = Boolean(
      (matchedCat?.id && !matchedCat.id.startsWith('temp-')) ||
        (matchedGoal?.id && !matchedGoal.id.startsWith('g-'))
    );
    if (isRerun && isExistingDbItem) {
      showMobileConfirm({
        title: t('setup.confirmArchiveEnvelopeTitle'),
        message: t('setup.confirmArchiveEnvelopeDesc', { name }),
        confirmText: t('common.remove'),
        isDestructive: true,
        onConfirm: () => executeRemoveCategory(name),
      });
      return;
    }
    executeRemoveCategory(name);
  };

  const handleOpenEditCategory = (cat: EstimatedCategoryItem) => {
    const rawFreq =
      categoryFrequencies[cat.name] ||
      (cat.budgetFrequency === 'ANNUALLY' ? 'YEARLY' : cat.budgetFrequency) ||
      'MONTHLY';
    const displayAmt =
      cat.type === 'GOAL'
        ? cat.enteredAmount ?? cat.targetAmount ?? cat.monthlyAud
        : convertFromMonthly(
            cat.monthlyAud,
            rawFreq as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'
          );
    const budgetFreq = rawFreq === 'YEARLY' ? 'ANNUALLY' : rawFreq;
    setEnvelopeToEditDraft({
      id: cat.id || `temp-${cat.name}`,
      name: cat.name,
      type: cat.type,
      envelopeType: cat.envelopeType || (cat.type === 'EVERYDAY' ? 'EVERYDAY' : cat.type === 'GOAL' ? 'GOAL' : 'BILL'),
      fundingMode: cat.fundingMode || (cat.type === 'EVERYDAY' || cat.type === 'GOAL' ? 'TARGET_BALANCE' : 'RECURRING'),
      isPriority: cat.isPriority ?? true,
      isSurplusTarget: cat.isSurplusTarget ?? false,
      bankAccountId: cat.bankAccountId || bankAccounts[0]?.id,
      safetyBufferFloor: cat.safetyBufferFloor !== undefined ? String(cat.safetyBufferFloor) : '0.00',
      monthlyAmount: String(cat.monthlyAud || '0'),
      enteredAmount: String(displayAmt || '0'),
      targetAmount: String(cat.targetAmount ?? displayAmt ?? '0'),
      budgetFrequency: budgetFreq,
      startDate: cat.startDate,
      endDate: cat.endDate,
      rrule: cat.rrule,
      generateEvents: cat.generateEvents ?? true,
      hasScheduledEvents: isRerun ? Boolean(cat.hasScheduledEvents) : false,
    });
    setShowAddEnvelopeModal(true);
  };

  const handleSaveEnvelopeDraft = (draft: EnvelopeDraftPayload) => {
    const oldName = envelopeToEditDraft?.name;
    if (oldName && oldName.trim().toLowerCase() !== draft.name.trim().toLowerCase()) {
      setRemovedCategoryNames((prev) => new Set(prev).add(oldName));
    }
    if (draft.isSurplusTarget) {
      setGoals((prev) => prev.map((g) => ({ ...g, isSurplusTarget: false })));
      setCustomCategories((prev) => prev.map((c) => ({ ...c, isSurplusTarget: false })));
    }
    const num = parseFloat(draft.monthlyAmount || draft.targetAmount || '0') || 0;
    if (draft.type === 'GOAL') {
      const id = envelopeToEditDraft?.id && !envelopeToEditDraft.id.startsWith('temp-') ? envelopeToEditDraft.id : `g-${Date.now()}`;
      const targetVal = parseFloat(draft.targetAmount || draft.enteredAmount || String(num)) || 0;
      const enteredVal = parseFloat(draft.enteredAmount || draft.targetAmount || String(num)) || 0;
      let goalMonthly = num;
      if (draft.fundingMode === 'TARGET_BALANCE' && !draft.monthlyAmount) {
        const now = new Date();
        const target = draft.endDate ? new Date(draft.endDate) : new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
        const months = Math.max(1, (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth()));
        goalMonthly = Math.round(targetVal / months);
      }
      setGoals((prev) => [
        ...prev.filter(
          (g) =>
            g.id !== id &&
            g.name.trim().toLowerCase() !== draft.name.trim().toLowerCase() &&
            (!oldName || g.name.trim().toLowerCase() !== oldName.trim().toLowerCase())
        ),
        {
          id,
          name: draft.name,
          targetAmount: targetVal,
          enteredAmount: enteredVal,
          dueDate: draft.fundingMode === 'RECURRING' ? null : draft.endDate || null,
          fundingMode: draft.fundingMode || 'TARGET_BALANCE',
          isPriority: draft.isPriority ?? true,
          isSurplusTarget: draft.isSurplusTarget ?? false,
          bankAccountId: draft.bankAccountId,
          monthlyAmount: goalMonthly,
          budgetFrequency: draft.budgetFrequency || 'MONTHLY',
          startDate: draft.startDate,
          rrule: draft.rrule,
          icon: 'target',
        },
      ]);
      setRemovedCategoryNames((prev) => {
        const next = new Set(prev);
        next.delete(draft.name);
        return next;
      });
    } else {
      const existingId = envelopeToEditDraft?.id && !envelopeToEditDraft.id.startsWith('temp-') ? envelopeToEditDraft.id : undefined;
      const updatedMonthly = draft.type === 'EVERYDAY' ? (parseFloat(envelopeToEditDraft?.monthlyAmount || '0') || num) : num;
      setCustomCategories((prev) => [
        ...prev.filter(
          (c) =>
            (!existingId || c.id !== existingId) &&
            c.name.trim().toLowerCase() !== draft.name.trim().toLowerCase() &&
            (!oldName || c.name.trim().toLowerCase() !== oldName.trim().toLowerCase())
        ),
        {
          id: existingId,
          name: draft.name,
          type: draft.envelopeType,
          envelopeType: draft.envelopeType,
          fundingMode: draft.fundingMode,
          isPriority: draft.isPriority ?? true,
          isSurplusTarget: draft.isSurplusTarget ?? false,
          bankAccountId: draft.bankAccountId,
          safetyBufferFloor: draft.safetyBufferFloor ? parseFloat(draft.safetyBufferFloor) : 0,
          enteredAmount: draft.enteredAmount ? parseFloat(draft.enteredAmount) : updatedMonthly,
          targetAmount: draft.targetAmount ? parseFloat(draft.targetAmount) : null,
          monthlyAud: updatedMonthly,
          startDate: draft.startDate,
          endDate: draft.endDate,
          rrule: draft.rrule,
          budgetFrequency: draft.budgetFrequency,
          generateEvents: draft.generateEvents,
          icon: draft.type === 'BILL' ? '📌' : '🛒',
        },
      ]);
      setRemovedCategoryNames((prev) => {
        const next = new Set(prev);
        next.delete(draft.name);
        return next;
      });
      if (draft.budgetFrequency) {
        setCategoryFrequencies((prev) => ({
          ...prev,
          [draft.name]:
            draft.budgetFrequency === 'ANNUALLY'
              ? 'YEARLY'
              : (draft.budgetFrequency as 'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'QUARTERLY'),
        }));
      }
      if (draft.type !== 'EVERYDAY') {
        setAmountOverrides((prev) => ({ ...prev, [draft.name]: updatedMonthly }));
      }
      if (draft.fundingMode) {
        setBillTypeOverrides((prev) => ({ ...prev, [draft.name]: draft.fundingMode || 'RECURRING' }));
      }
    }
    setShowAddEnvelopeModal(false);
    setEnvelopeToEditDraft(null);
  };

  return {
    showAddEnvelopeModal,
    setShowAddEnvelopeModal,
    envelopeToEditDraft,
    setEnvelopeToEditDraft,
    handleAttemptRemoveCategory,
    handleOpenEditCategory,
    handleSaveEnvelopeDraft,
  };
}
