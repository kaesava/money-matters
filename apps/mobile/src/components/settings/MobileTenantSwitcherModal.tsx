import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@money-matters/i18n';
import { MobileModalDialog, useMobileToast } from '@money-matters/ui/mobile';
import { trpc, switchActiveTenant } from '../../lib/trpc';

interface MobileTenantSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MobileTenantSwitcherModal({ visible, onClose }: MobileTenantSwitcherModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const { data: tenants, isLoading } = trpc.listUserTenants.useQuery(undefined, {
    enabled: visible,
  });

  const handleSelectTenant = async (tenantId: string, tenantName: string, isCurrent: boolean) => {
    if (isCurrent) {
      onClose();
      return;
    }
    try {
      await switchActiveTenant(tenantId, utils);
      toast.success(t('tenantSwitcher.switchSuccess', { name: tenantName }));
      onClose();
    } catch {
      toast.error(t('tenantSwitcher.switchError'));
    }
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('tenantSwitcher.title')}
      subtitle={t('tenantSwitcher.subtitle')}
    >
      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#2563eb" />
          </View>
        ) : (
          <View style={styles.list}>
            {tenants?.map((tenant) => {
              const isCurrent = Boolean(tenant.isCurrent);
              return (
                <TouchableOpacity
                  key={tenant.id}
                  style={[styles.itemCard, isCurrent && styles.activeItemCard]}
                  onPress={() => handleSelectTenant(tenant.id, tenant.name, isCurrent)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={[styles.iconCircle, isCurrent && styles.activeIconCircle]}>
                      <Feather
                        name="home"
                        size={18}
                        color={isCurrent ? '#2563eb' : '#64748B'}
                      />
                    </View>
                    <View style={styles.itemMeta}>
                      <Text style={[styles.tenantName, isCurrent && styles.activeTenantName]}>
                        {tenant.name}
                      </Text>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>{tenant.role}</Text>
                      </View>
                    </View>
                  </View>
                  {isCurrent ? (
                    <View style={styles.activePill}>
                      <Feather name="check" size={14} color="#16A34A" />
                      <Text style={styles.activePillText}>{t('tenantSwitcher.active')}</Text>
                    </View>
                  ) : (
                    <Feather name="chevron-right" size={18} color="#94A3B8" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeItemCard: {
    backgroundColor: '#EFF6FF',
    borderColor: '#93C5FD',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconCircle: {
    backgroundColor: '#DBEAFE',
  },
  itemMeta: {
    flex: 1,
  },
  tenantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  activeTenantName: {
    color: '#1E3A8A',
    fontWeight: '700',
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
  },
});
