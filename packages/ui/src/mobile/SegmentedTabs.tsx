import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';

export interface SegmentTabItem<T extends string = string> {
  key: T;
  label: string;
  icon?: React.ComponentProps<typeof Feather>['name'];
  badgeCount?: number;
}

export interface SegmentedTabsProps<T extends string = string> {
  tabs: SegmentTabItem<T>[];
  activeKey: T;
  onChange: (key: T) => void;
}

export function SegmentedTabs<T extends string = string>({
  tabs,
  activeKey,
  onChange,
}: SegmentedTabsProps<T>) {
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <TouchableOpacity
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, isActive && styles.tabActive]}
            activeOpacity={0.7}
          >
            {tab.icon && (
              <Feather
                name={tab.icon}
                size={14}
                color={isActive ? '#2563eb' : '#64748B'}
                style={styles.icon}
              />
            )}
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
            {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
              <View style={[styles.badge, isActive && styles.badgeActive]}>
                <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                  {tab.badgeCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 3,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 9,
  },
  tabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    marginRight: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  labelActive: {
    color: '#2563eb',
    fontWeight: '700',
  },
  badge: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  badgeActive: {
    backgroundColor: '#DBEAFE',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  badgeTextActive: {
    color: '#1E40AF',
  },
});

export default SegmentedTabs;
