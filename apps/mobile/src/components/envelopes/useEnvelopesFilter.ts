import { useMemo, useState } from 'react';

export type PoolSortField = 'name' | 'currentBalance' | 'targetAmount';
export type PoolTypeFilter = 'ALL' | 'EVERYDAY' | 'REGULAR' | 'GOAL';
export type PrivacyFilter = 'ALL' | 'SHARED' | 'PRIVATE';

export interface EnvelopeFilterablePool {
  id: string;
  name: string;
  envelopeType?: string | null;
  currentBalance?: number | null;
  targetAmount?: string | null;
  bankAccountId?: string | null;
  isPrivate?: boolean | null;
}

export interface BankAccountItem {
  id: string;
  name: string;
}

export interface UseEnvelopesFilterOptions {
  pools: EnvelopeFilterablePool[];
  bankAccounts: BankAccountItem[];
  initialPoolId?: string | null;
}

export function useEnvelopesFilter({
  pools,
  bankAccounts,
  initialPoolId = null,
}: UseEnvelopesFilterOptions) {
  const [activePoolIdFilter, setActivePoolIdFilter] = useState<string | null>(initialPoolId);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<PoolSortField>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [typeFilter, setTypeFilter] = useState<PoolTypeFilter>('ALL');
  const [privacyFilter, setPrivacyFilter] = useState<PrivacyFilter>('ALL');

  const activeFilterCount =
    (typeFilter !== 'ALL' ? 1 : 0) +
    (privacyFilter !== 'ALL' ? 1 : 0) +
    (sortField !== 'name' || sortOrder !== 'asc' ? 1 : 0);

  const filteredPools = useMemo(() => {
    return pools
      .filter((p) => {
        if (activePoolIdFilter && p.id !== activePoolIdFilter) return false;
        const pType =
          p.envelopeType === 'EVERYDAY'
            ? 'EVERYDAY'
            : p.envelopeType === 'TARGET_GOAL' || p.envelopeType === 'ONGOING_GOAL'
            ? 'GOAL'
            : 'REGULAR';
        if (typeFilter !== 'ALL' && pType !== typeFilter) return false;
        if (privacyFilter === 'SHARED' && p.isPrivate) return false;
        if (privacyFilter === 'PRIVATE' && !p.isPrivate) return false;
        if (!searchQuery.trim()) return true;

        const q = searchQuery.toLowerCase().trim();
        const matchesPool = p.name.toLowerCase().includes(q);
        const bank = bankAccounts.find((b) => b.id === p.bankAccountId);
        const matchesBank = bank?.name.toLowerCase().includes(q);
        return matchesPool || matchesBank;
      })
      .sort((a, b) => {
        if (sortField === 'name') {
          const res = a.name.localeCompare(b.name);
          return sortOrder === 'asc' ? res : -res;
        }
        if (sortField === 'currentBalance') {
          return sortOrder === 'asc'
            ? (a.currentBalance || 0) - (b.currentBalance || 0)
            : (b.currentBalance || 0) - (a.currentBalance || 0);
        }
        const aTgt = a.targetAmount ? parseFloat(a.targetAmount) : 0;
        const bTgt = b.targetAmount ? parseFloat(b.targetAmount) : 0;
        return sortOrder === 'asc' ? aTgt - bTgt : bTgt - aTgt;
      });
  }, [pools, activePoolIdFilter, typeFilter, privacyFilter, searchQuery, sortField, sortOrder, bankAccounts]);

  const resetFilters = () => {
    setSortField('name');
    setSortOrder('asc');
    setTypeFilter('ALL');
    setPrivacyFilter('ALL');
  };

  return {
    activePoolIdFilter,
    setActivePoolIdFilter,
    searchQuery,
    setSearchQuery,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    typeFilter,
    setTypeFilter,
    privacyFilter,
    setPrivacyFilter,
    activeFilterCount,
    filteredPools,
    resetFilters,
  };
}
