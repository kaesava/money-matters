import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  DESIGN_TOKENS,
  MobileScreenWrapper,
  MobileCategoryDetailSheet,
} from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { MobileBankTransferRollupCard } from '../../../components/paychecks/MobileBankTransferRollupCard';
import { MobileIncomeSplitCommandPanel } from '../../../components/paychecks/MobileIncomeSplitCommandPanel';
import { MobileIncomeSplitPoolList } from '../../../components/paychecks/MobileIncomeSplitPoolList';
import { PaycheckStudioSubheader } from '../../../components/paychecks/PaycheckStudioSubheader';
import { PaycheckStudioFooter } from '../../../components/paychecks/PaycheckStudioFooter';
import { usePaycheckStudio } from '../../../components/paychecks/usePaycheckStudio';
import { trpc } from '../../../lib/trpc';

export default function IncomeSplitStudioScreen() {
  const { id, returnTo } = useLocalSearchParams<{ id: string; returnTo?: string }>();
  const [selectedPoolForSheet, setSelectedPoolForSheet] = useState<string | null>(null);

  const {
    session,
    isLoading,
    previewData,
    pools,
    bankAccounts,
    sourceName,
    setSourceName,
    actualAmount,
    setActualAmount,
    initialAmount,
    selectedDate,
    setSelectedDate,
    linesMap,
    reasoningMap,
    isSavedPlan,
    isConfirmedPlan,
    isReadOnly,
    isFutureDate,
    isDirty,
    isDeficit,
    numericActual,
    sweepPool,
    sweepPoolRemainder,
    everydayAllocated,
    billsAllocated,
    goalsAllocated,
    groupedLines,
    submitting,
    attemptExit,
    handleRecalculateTrigger,
    handleRecalculateWaterfall,
    handleResetPlan,
    handleResetAllEdits,
    handleDeleteIncome,
    handleSaveSplit,
    handleConfirmSplit,
    handleLineAmountChange,
    handleLineReasoningChange,
  } = usePaycheckStudio(id, returnTo);

  const poolCategoriesQuery = trpc.listCategories.useQuery(undefined, {
    enabled: !!selectedPoolForSheet,
  });

  const activePoolObj = pools.find((p) => p.id === selectedPoolForSheet);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.sereneBlue} />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const receivingAccountId = previewData?.incomeEvent?.receivingAccountId;

  return (
    <MobileScreenWrapper
      title={sourceName || t('paydayDrawer.title')}
      user={session?.user}
      showBack
      onBackPress={attemptExit}
    >
      <View style={styles.rootContainer}>
        <PaycheckStudioSubheader
          isConfirmedPlan={isConfirmedPlan}
          isSavedPlan={isSavedPlan}
          selectedDate={selectedDate}
          isReadOnly={isReadOnly}
          isDirty={isDirty}
          submitting={submitting}
          onRecalculate={handleRecalculateTrigger}
          onResetPlan={handleResetPlan}
          onResetEdits={handleResetAllEdits}
          onDeleteIncome={handleDeleteIncome}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <MobileIncomeSplitCommandPanel
            sourceName={sourceName}
            onSourceNameChange={setSourceName}
            actualAmount={actualAmount}
            onActualAmountChange={setActualAmount}
            selectedDate={selectedDate}
            onSelectedDateChange={setSelectedDate}
            numericActual={numericActual}
            sweepPoolName={sweepPool?.name || t('poolTypes.everyday')}
            sweepPoolRemainder={sweepPoolRemainder}
            isDeficit={isDeficit}
            everydayAllocated={everydayAllocated}
            billsAllocated={billsAllocated}
            goalsAllocated={goalsAllocated}
            isReadOnly={isReadOnly}
            isAmountModified={actualAmount !== initialAmount}
            onRecalculateWaterfall={handleRecalculateWaterfall}
            submitting={submitting}
            isConfirmedPlan={isConfirmedPlan}
          />

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

          {!isConfirmedPlan && (
            <MobileBankTransferRollupCard
              receivingAccountId={receivingAccountId}
              pools={pools}
              linesMap={linesMap}
              sweepPoolId={sweepPool?.id}
              sweepPoolRemainder={sweepPoolRemainder}
              bankAccounts={bankAccounts}
            />
          )}
        </ScrollView>

        {!isReadOnly && (
          <PaycheckStudioFooter
            isFutureDate={isFutureDate}
            isDeficit={isDeficit}
            submitting={submitting}
            onSaveSplit={handleSaveSplit}
            onConfirmSplit={handleConfirmSplit}
          />
        )}

        {selectedPoolForSheet && activePoolObj && (
          <MobileCategoryDetailSheet
            visible={!!selectedPoolForSheet}
            poolId={selectedPoolForSheet}
            poolName={activePoolObj.name}
            poolType={activePoolObj.poolType}
            currentBalance={activePoolObj.currentBalance}
            targetAmount={activePoolObj.targetAmount}
            targetDate={activePoolObj.targetDate}
            subcategories={(poolCategoriesQuery.data || [])
              .filter((c) => c.poolId === selectedPoolForSheet)
              .map((c) => ({
                id: c.id,
                name: c.name,
                targetAmount: parseFloat(c.enteredAmount || c.monthlyAmount || '0'),
              }))}
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
    paddingBottom: 90,
  },
});
