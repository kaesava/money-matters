import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { t } from '@money-matters/i18n';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { MobileMatrixPlanTab } from '../../components/paychecks/MobileMatrixPlanTab';
import {
  MobileCategoryDetailModal,
  CategoryScheduledEvent,
} from '../../components/paychecks/MobileCategoryDetailModal';

export default function SplitIncomeScreen() {
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [activeCategoryDetail, setActiveCategoryDetail] = useState<{
    poolId: string;
    poolName: string;
    poolType?: string;
    currentBalance?: number;
    targetAmount?: number;
    events: CategoryScheduledEvent[];
  } | null>(null);

  return (
    <AppScreenWrapper
      title={t('nav.splitIncome')}
      scrollable={false}
      infoTooltip={{
        title: t('nav.splitIncome'),
        content: t('tooltips.incomeBills.content'),
      }}
    >
      <View style={styles.container}>
        <MobileMatrixPlanTab
          onOpenCategoryModal={(params) => {
            setActiveCategoryDetail(params);
            setCategoryModalVisible(true);
          }}
        />

        {activeCategoryDetail && (
          <MobileCategoryDetailModal
            visible={categoryModalVisible}
            poolId={activeCategoryDetail.poolId}
            poolName={activeCategoryDetail.poolName}
            poolType={activeCategoryDetail.poolType}
            currentBalance={activeCategoryDetail.currentBalance}
            targetAmount={activeCategoryDetail.targetAmount}
            events={activeCategoryDetail.events}
            onClose={() => {
              setCategoryModalVisible(false);
              setActiveCategoryDetail(null);
            }}
          />
        )}
      </View>
    </AppScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
