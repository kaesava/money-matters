import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { t } from '@money-matters/i18n';
import { AppScreenWrapper } from '../../components/AppScreenWrapper';
import { MobileMatrixPlanTab } from '../../components/paychecks/MobileMatrixPlanTab';
import { MobileCategoryDetailSheet, MobileCategoryDetailItem } from '@money-matters/ui/mobile';

export default function SplitIncomeScreen() {
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [activeCategoryDetail, setActiveCategoryDetail] = useState<{
    poolId: string;
    poolName: string;
    poolType?: string;
    currentBalance?: number;
    targetAmount?: number;
    events: MobileCategoryDetailItem[];
  } | null>(null);

  return (
    <AppScreenWrapper
      title={t('incomeBillsTabs.twelveMonthIncomeSplit')}
      scrollable={false}
      infoTooltip={{
        title: t('incomeBillsTabs.twelveMonthIncomeSplit'),
        content: t('incomeBillsTabs.twelveMonthIncomeSplitTooltip'),
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
          <MobileCategoryDetailSheet
            visible={categoryModalVisible}
            poolId={activeCategoryDetail.poolId}
            poolName={activeCategoryDetail.poolName}
            poolType={activeCategoryDetail.poolType}
            currentBalance={activeCategoryDetail.currentBalance}
            targetAmount={activeCategoryDetail.targetAmount}
            upcomingEvents={activeCategoryDetail.events}
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
