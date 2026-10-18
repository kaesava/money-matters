import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import {
  DESIGN_TOKENS,
  MobileScreenWrapper,
  MobileCategoryDetailSheet,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { MobileIncomeEventInlineCard } from '../../../components/paychecks/MobileIncomeEventInlineCard';
import { MobilePaydayCelebrationCard } from '../../../components/paychecks/MobilePaydayCelebrationCard';
import { MobilePaydayTransferModal } from '../../../components/paychecks/MobilePaydayTransferModal';
import { MobileUnsavedSplitExitDialog } from '../../../components/paychecks/MobileUnsavedSplitExitDialog';
import { MobileIncomeSplitPoolList } from '../../../components/paychecks/MobileIncomeSplitPoolList';
import { usePaycheckStudio } from '../../../components/paychecks/usePaycheckStudio';

export default function IncomeSplitStudioScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const router = useRouter();
  const [selectedPoolForSheet, setSelectedPoolForSheet] = useState<string | null>(null);
  const [showTableDetails, setShowTableDetails] = useState(false);

  const {
    session, isLoading, previewData, pools, bankAccounts,
    sourceName, setSourceName, actualAmount, setActualAmount,
    selectedDate, setSelectedDate, linesMap, reasoningMap,
    isSavedPlan, isConfirmedPlan, isReadOnly, isFutureDate,
    isDirty, isDeficit, sweepPool, sweepPoolRemainder,
    everydayAllocated, billsAllocated, goalsAllocated, groupedLines,
    submitting, attemptExit, handleRecalculateTrigger,
    handleResetAllEdits,
    handleDeleteIncome, handleSaveSplit, handleConfirmSplit,
    handleLineAmountChange, handleLineReasoningChange,
    showTransferModal, setShowTransferModal,
    showExitDialog, setShowExitDialog,
    handleSaveAndExit, handleDiscardAndExit,
  } = usePaycheckStudio(id, returnTo);

  const activePoolObj = pools.find((p) => p.id === selectedPoolForSheet);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.sereneBlue} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const receivingAccountId = previewData?.receivingAccountId;

  const handleCloseTransferModal = () => {
    setShowTransferModal(false);
    if (returnTo) {
      router.push(returnTo as never);
    } else {
      router.back();
    }
  };

  return (
    <MobileScreenWrapper
      title={sourceName || t('paydayDrawer.title')}
      user={session?.user}
      showBack
      onBackPress={attemptExit}
    >
      <View style={styles.rootContainer}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top In-Line Editable Card */}
          <MobileIncomeEventInlineCard
            sourceName={sourceName}
            onSourceNameChange={setSourceName}
            actualAmount={actualAmount}
            onActualAmountChange={setActualAmount}
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            isReadOnly={isReadOnly}
            onDeleteIncome={handleDeleteIncome}
            onBack={attemptExit}
          />

          {/* Celebration Card with 4 Additive Buckets and Action Buttons */}
          <MobilePaydayCelebrationCard
            everydayAllocated={everydayAllocated}
            billsAllocated={billsAllocated}
            goalsAllocated={goalsAllocated}
            safeToSpend={sweepPoolRemainder}
            isConfirmed={isConfirmedPlan}
            isLocked={isSavedPlan}
            isDirty={isDirty}
            isFutureDate={isFutureDate}
            submitting={submitting}
            isDeficit={isDeficit}
            onConfirm={handleConfirmSplit}
            onUnlockAndRecalculate={handleRecalculateTrigger}
            onRecalculate={handleRecalculateTrigger}
            onLockSplit={handleSaveSplit}
            onSaveChanges={handleSaveSplit}
            onDiscardEdits={handleResetAllEdits}
          />

          {/* Progressive Disclosure Toggle Button for Detailed Breakdown */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowTableDetails((prev) => !prev)}
            style={styles.detailsToggleBtn}
          >
            <Text style={styles.detailsToggleText}>
              {showTableDetails ? t('paydayDrawer.hideDetailedAllocations') : t('paydayDrawer.showDetailedAllocations')}
            </Text>
            <Feather
              name={showTableDetails ? 'chevron-up' : 'chevron-down'}
              size={16}
              color={DESIGN_TOKENS.colors.sereneBlue}
            />
          </TouchableOpacity>

          {showTableDetails && (
            <MobileIncomeSplitPoolList
              groups={groupedLines}
              pools={pools}
              sweepPoolId={sweepPool?.id}
              sweepPoolRemainder={sweepPoolRemainder}
              linesMap={linesMap}
              reasoningMap={reasoningMap}
              isReadOnly={isReadOnly}
              onPoolPress={(poolId) => setSelectedPoolForSheet(poolId)}
              onLineAmountChange={handleLineAmountChange}
              onLineReasoningChange={handleLineReasoningChange}
            />
          )}
        </ScrollView>

        <MobilePaydayTransferModal
          isOpen={showTransferModal}
          onClose={handleCloseTransferModal}
          receivingAccountId={receivingAccountId}
          pools={pools}
          linesMap={linesMap}
          sweepPoolId={sweepPool?.id}
          sweepPoolRemainder={sweepPoolRemainder}
          bankAccounts={bankAccounts}
        />

        <MobileUnsavedSplitExitDialog
          visible={showExitDialog}
          isDeficit={isDeficit}
          deficitAmount={`$${Math.abs(sweepPoolRemainder).toFixed(2)}`}
          submitting={submitting}
          onClose={() => setShowExitDialog(false)}
          onDiscardAndExit={handleDiscardAndExit}
          onSaveAndExit={handleSaveAndExit}
        />

        {selectedPoolForSheet && activePoolObj && (
          <MobileCategoryDetailSheet
            visible={!!selectedPoolForSheet}
            poolId={selectedPoolForSheet}
            poolName={activePoolObj.name}
            poolType={activePoolObj.envelopeType}
            currentBalance={activePoolObj.currentBalance}
            targetAmount={activePoolObj.targetAmount}
            targetDate={activePoolObj.endDate}
            onClose={() => setSelectedPoolForSheet(null)}
          />
        )}
      </View>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.slate[500],
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  detailsToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailsToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
});
