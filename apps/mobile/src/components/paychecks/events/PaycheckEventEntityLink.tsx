import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { t } from '@money-matters/i18n';
import { DESIGN_TOKENS, EntityLinkChip } from '@money-matters/ui/mobile';
import type { TimelineEventItem } from '../PaycheckEventSection';

interface PaycheckEventEntityLinkProps {
  readonly item: TimelineEventItem;
}

export const PaycheckEventEntityLink: React.FC<PaycheckEventEntityLinkProps> = ({ item }) => {
  const router = useRouter();

  if (item.kind === 'INCOME' && item.accountId) {
    return (
      <View style={styles.entityContainer}>
        <EntityLinkChip
          label={item.accountName || t('bankAccounts.title')}
          isPrivate={item.isPrivate}
          icon="credit-card"
          onPress={() => {
            router.push('/(app)/settings?tab=bank-accounts&returnTo=/(app)/paychecks' as Href);
          }}
        />
      </View>
    );
  }

  if (item.kind === 'EXPENSE' && item.poolId) {
    return (
      <View style={styles.entityContainer}>
        <EntityLinkChip
          label={item.categoryName || t('categories.title')}
          icon="folder"
          onPress={() => {
            router.push(`/(app)/pools/${item.poolId}?returnTo=/(app)/paychecks` as Href);
          }}
        />
      </View>
    );
  }

  if (item.kind === 'TRANSFER' && item.sourcePoolId) {
    return (
      <View style={styles.entityContainer}>
        <View style={styles.transferEntities}>
          <EntityLinkChip
            label={item.sourcePoolName || t('common.source')}
            icon="folder"
            onPress={() => {
              router.push(`/(app)/pools/${item.sourcePoolId}?returnTo=/(app)/paychecks` as Href);
            }}
          />
          <Text style={styles.transferArrow}>➔</Text>
          {item.destinationPoolId && (
            <EntityLinkChip
              label={item.destinationPoolName || t('common.destination')}
              icon="folder"
              onPress={() => {
                router.push(`/(app)/pools/${item.destinationPoolId}?returnTo=/(app)/paychecks` as Href);
              }}
            />
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.entityContainer}>
      <Text style={styles.entityFallbackText}>
        {item.accountName || item.categoryName || '—'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  entityContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  transferEntities: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  transferArrow: {
    fontSize: 10,
    color: DESIGN_TOKENS.colors.slate[400],
  },
  entityFallbackText: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    fontStyle: 'italic',
  },
});
