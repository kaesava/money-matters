import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { DESIGN_TOKENS, MobileScreenWrapper } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { trpc } from '../../lib/trpc';
import { AffordCheckInputControls } from '../../components/afford-check/AffordCheckInputControls';
import { AffordCheckVerdictCard } from '../../components/afford-check/AffordCheckVerdictCard';
import { AffordCheckBreakdownCard } from '../../components/afford-check/AffordCheckBreakdownCard';

export default function AffordCheckScreen() {
  const router = useRouter();

  const [rawAmount, setRawAmount] = useState('');
  const [mode, setMode] = useState<'ONE_OFF' | 'RECURRING'>('ONE_OFF');
  const [frequency, setFrequency] = useState<
    'WEEKLY' | 'FORTNIGHTLY' | 'MONTHLY' | 'ANNUALLY'
  >('MONTHLY');
  const [itemName, setItemName] = useState('');
  const [includePersonal, setIncludePersonal] = useState(false);

  const parsedAmount = parseFloat(rawAmount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  const { data, isLoading } = trpc.canAfford.useQuery(
    {
      amount: rawAmount,
      mode,
      frequency,
      itemName: itemName.trim() || undefined,
      includePersonal,
    },
    {
      enabled: isValidAmount,
    }
  );

  const handleAmountChange = (text: string) => {
    if (text === '' || /^\d{0,12}(\.\d{0,2})?$/.test(text)) {
      setRawAmount(text);
    }
  };

  return (
    <MobileScreenWrapper
      title={t('canIAfford.title')}
      showBack
      onBackPress={() => router.back()}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <AffordCheckInputControls
          mode={mode}
          setMode={setMode}
          frequency={frequency}
          setFrequency={setFrequency}
          itemName={itemName}
          setItemName={setItemName}
          rawAmount={rawAmount}
          onAmountChange={handleAmountChange}
          includePersonal={includePersonal}
          setIncludePersonal={setIncludePersonal}
        />

        {isLoading && isValidAmount ? (
          <ActivityIndicator color={DESIGN_TOKENS.colors.sereneBlue} style={styles.loadingIndicator} />
        ) : data ? (
          <View style={styles.resultSection}>
            <AffordCheckVerdictCard
              verdict={data.verdict}
              rationaleSteps={data.rationaleSteps}
            />
            <AffordCheckBreakdownCard data={data} />
          </View>
        ) : null}
      </ScrollView>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  loadingIndicator: {
    marginVertical: 30,
  },
  resultSection: {
    gap: 14,
    marginTop: 8,
  },
});
