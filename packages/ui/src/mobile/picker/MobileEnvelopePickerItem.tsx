import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { styles } from './MobileEnvelopePickerStyles';

export interface MobileEnvelopeOption {
  id: string;
  name: string;
  poolType?: string;
  envelopeType?: string;
  fundingMode?: string | null;
  isPrivate?: boolean | null;
  currentBalance?: string | number;
  categories?: Array<{ id: string; name: string }>;
}

export interface MobileEnvelopePickerItemProps {
  item: MobileEnvelopeOption;
  selectedPoolId: string;
  selectedCategoryId?: string | null;
  allowCategorySelection: boolean;
  searchQuery: string;
  balText: string | null;
  badge: { label: string; tagKey: string };
  badgeStyle: { bg: string; border: string; text: string };
  onSelect: (poolId: string, categoryId: string | null) => void;
}

export const MobileEnvelopePickerItem: React.FC<MobileEnvelopePickerItemProps> = ({
  item,
  selectedPoolId,
  selectedCategoryId,
  allowCategorySelection,
  searchQuery,
  balText,
  badge,
  badgeStyle,
  onSelect,
}) => {
  const isPoolSelected =
    item.id === selectedPoolId && (!allowCategorySelection || !selectedCategoryId);

  return (
    <View key={item.id} style={styles.poolContainer}>
      <TouchableOpacity
        style={[styles.itemRow, isPoolSelected && styles.itemRowSelected]}
        onPress={() => onSelect(item.id, null)}
        activeOpacity={0.7}
      >
        <View style={styles.itemInfo}>
          <Feather
            name="folder"
            size={14}
            color={isPoolSelected ? '#2563eb' : '#64748B'}
          />
          <Text
            style={[styles.itemText, isPoolSelected && styles.itemTextSelected]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View
            style={[
              styles.itemBadgeWrap,
              { backgroundColor: badgeStyle.bg, borderColor: badgeStyle.border },
            ]}
          >
            <Text style={[styles.itemBadgeText, { color: badgeStyle.text }]}>
              {badge.label}
            </Text>
          </View>
        </View>
        <View style={styles.itemRight}>
          {balText && (
            <Text
              style={[
                styles.itemBalance,
                isPoolSelected && styles.itemBalanceSelected,
              ]}
            >
              {balText}
            </Text>
          )}
          {isPoolSelected && <Feather name="check" size={16} color="#2563eb" />}
        </View>
      </TouchableOpacity>

      {allowCategorySelection &&
        item.categories &&
        item.categories.length > 0 && (() => {
          const q = searchQuery.toLowerCase().trim();
          const poolMatches =
            !q ||
            item.name.toLowerCase().includes(q) ||
            badge.label.toLowerCase().includes(q) ||
            Boolean(item.poolType && item.poolType.toLowerCase().includes(q));
          const visibleCats = poolMatches
            ? item.categories
            : item.categories.filter((c) => c.name.toLowerCase().includes(q));
          if (visibleCats.length === 0) return null;

          return (
            <View style={styles.catSubList}>
              {visibleCats.map((cat) => {
                const isCatSelected =
                  item.id === selectedPoolId && selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catRow, isCatSelected && styles.catRowSelected]}
                    onPress={() => onSelect(item.id, cat.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.itemInfo}>
                      <Feather
                        name="tag"
                        size={12}
                        color={isCatSelected ? '#2563eb' : '#94A3B8'}
                      />
                      <Text
                        style={[
                          styles.catText,
                          isCatSelected && styles.catTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </View>
                    {isCatSelected && (
                      <Feather name="check" size={14} color="#2563eb" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })()}
    </View>
  );
};
