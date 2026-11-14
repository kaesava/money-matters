import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { useRouter, type Href } from 'expo-router';
import { t } from '@money-matters/i18n';
import type { AssistantResult, QuickActionInitialData } from '@money-matters/types';
import {
  MobileCommandPaletteSheet,
  type SearchResultPage,
} from '@money-matters/ui/mobile';
import { trpc } from '../lib/trpc';
import { authClient } from '../lib/auth';
import { useAppFeatures } from './useAppFeatures';
import { QuickExpenseModal, type QuickActionType } from '../components/QuickExpenseModal';

interface CommandPaletteContextValue {
  isOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue>({
  isOpen: false,
  openCommandPalette: () => {},
  closeCommandPalette: () => {},
});

const MOBILE_SCREEN_ROUTES: Record<string, string> = {
  home: '/(app)/home',
  dashboard: '/(app)/home',
  plan: '/(app)/plan',
  'income-and-bills': '/(app)/plan',
  envelopes: '/(app)/envelopes',
  history: '/(app)/history',
  'bank-accounts': '/(app)/settings?tab=bank-accounts',
  'afford-check': '/(app)/afford-check',
  reports: '/(app)/reports',
  settings: '/(app)/settings',
  projection: '/(app)/envelopes/projection',
};

function buildMobilePages(hasSimulation: boolean, hasReports: boolean): SearchResultPage[] {
  const pages: SearchResultPage[] = [
    { id: 'home', title: t('commandPalette.pages.home'), subtitle: t('commandPalette.pages.homeSub'), route: '/(app)/home', keywords: ['overview', 'summary', 'payday'] },
    { id: 'envelopes', title: t('commandPalette.pages.envelopes'), subtitle: t('commandPalette.pages.envelopesSub'), route: '/(app)/envelopes', keywords: ['categories', 'bills', 'goals', 'everyday'] },
    { id: 'plan', title: t('commandPalette.pages.plan'), subtitle: t('commandPalette.pages.planSub'), route: '/(app)/plan', keywords: ['timeline', 'upcoming', 'events'] },
    { id: 'schedules', title: t('commandPalette.pages.schedules'), subtitle: t('commandPalette.pages.schedulesSub'), route: '/(app)/plan/schedules', keywords: ['recurring', 'payday', 'bills', 'income schedule'] },
    { id: 'projection', title: t('commandPalette.pages.projection'), subtitle: t('commandPalette.pages.projectionSub'), route: '/(app)/envelopes/projection', keywords: ['forecast', '12 month'] },
    { id: 'history', title: t('commandPalette.pages.history'), subtitle: t('commandPalette.pages.historySub'), route: '/(app)/history', keywords: ['transactions', 'spent'] },
    { id: 'bank-accounts', title: t('commandPalette.pages.bankAccounts'), subtitle: t('commandPalette.pages.bankAccountsSub'), route: '/(app)/settings?tab=bank-accounts', keywords: ['accounts', 'balance', 'match balance'] },
    { id: 'settings', title: t('commandPalette.pages.settings'), subtitle: t('commandPalette.pages.settingsSub'), route: '/(app)/settings', keywords: ['profile', 'household', 'subscription'] },
    { id: 'quick-expense', title: t('commandPalette.pages.quickExpense'), subtitle: t('commandPalette.pages.quickExpenseSub'), route: '#quick-expense', keywords: ['expense', 'income', 'transfer', 'log'], isAction: true },
  ];
  if (hasSimulation) {
    pages.splice(4, 0, { id: 'afford-check', title: t('commandPalette.pages.affordCheck'), subtitle: t('commandPalette.pages.affordCheckSub'), route: '/(app)/afford-check', keywords: ['afford', 'simulate'] });
  }
  if (hasReports) {
    pages.splice(pages.length - 2, 0, { id: 'reports', title: t('commandPalette.pages.reports'), subtitle: t('commandPalette.pages.reportsSub'), route: '/(app)/reports', keywords: ['analytics', 'spending'] });
  }
  return pages;
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const { hasAiAssistant, hasSimulation, hasReports } = useAppFeatures();
  const utils = trpc.useUtils();

  const [isOpen, setIsOpen] = useState(false);
  const [quickVisible, setQuickVisible] = useState(false);
  const [quickType, setQuickType] = useState<QuickActionType>('DEBIT');
  const [quickInitialData, setQuickInitialData] = useState<QuickActionInitialData | undefined>(undefined);

  const enabled = Boolean(session?.user) && isOpen;
  const accountsQuery = trpc.listBankAccountsWithExpected.useQuery(undefined, { enabled, staleTime: 30_000 });
  const envelopesQuery = trpc.listEnvelopes.useQuery(undefined, { enabled, staleTime: 30_000 });
  const incomeQuery = trpc.listIncomeEvents.useQuery(undefined, { enabled, staleTime: 30_000 });
  const expenseQuery = trpc.listExpenseEvents.useQuery(undefined, { enabled, staleTime: 30_000 });
  const usageQuery = trpc.assistantUsage.useQuery(undefined, {
    enabled: Boolean(session?.user) && hasAiAssistant && isOpen,
    staleTime: 30_000,
  });
  const askMutation = trpc.assistantAsk.useMutation();

  const searchPages = useMemo(() => buildMobilePages(hasSimulation, hasReports), [hasSimulation, hasReports]);
  const searchAccounts = useMemo(
    () => (accountsQuery.data ?? []).map((a) => ({ id: a.id, name: a.name, type: a.accountType, currentBalance: parseFloat(a.expectedBalance || a.lastKnownBalance || '0') })),
    [accountsQuery.data]
  );
  const searchEnvelopes = useMemo(
    () => (envelopesQuery.data ?? []).map((e) => ({ id: e.id, name: e.name, type: e.envelopeType, currentBalance: e.currentBalance })),
    [envelopesQuery.data]
  );
  const searchEvents = useMemo(() => {
    const inc = (incomeQuery.data ?? [])
      .filter((e) => !e.status || e.status === 'PENDING')
      .map((e) => ({ id: e.id, name: e.name, amount: parseFloat(e.expectedAmount), dueDate: e.expectedDate, type: 'INCOME' as const }));
    const exp = (expenseQuery.data ?? [])
      .filter((e) => !e.status || e.status === 'PENDING')
      .map((e) => ({ id: e.id, name: e.name, amount: parseFloat(e.expectedAmount), dueDate: e.expectedDate, type: 'EXPENSE' as const }));
    return [...inc, ...exp];
  }, [incomeQuery.data, expenseQuery.data]);

  const handleSearchTransactions = useCallback(
    async (q: string) => {
      const res = await utils.searchTransactions.fetch({ query: q, limit: 10 });
      return res.map((tx) => ({
        id: tx.id,
        recordedAt: tx.recordedAt,
        amount: parseFloat(tx.amount),
        note: tx.note,
        flowType: tx.flowType,
        envelopeName: tx.envelopeName,
        envelopeId: tx.envelopeId,
        bankAccountId: tx.bankAccountId,
      }));
    },
    [utils]
  );

  const handlePrefill = useCallback(
    (prefill: Extract<AssistantResult, { type: 'prefill' }>) => {
      const p = prefill.params ?? {};
      if (prefill.target === 'add-transaction' || prefill.target === 'mark-paid') {
        const billOrMerchant = String(p.billName || p.merchant || p.entityName || '');
        setQuickInitialData({ type: 'DEBIT', name: billOrMerchant, amount: p.amount ? String(p.amount) : undefined, date: p.date ? String(p.date) : undefined, envelopeName: billOrMerchant });
        setQuickType('DEBIT');
        setQuickVisible(true);
      } else if (prefill.target === 'transfer') {
        setQuickInitialData({ type: 'TRANSFER', amount: p.amount ? String(p.amount) : undefined, sourcePoolName: p.sourceAccount ? String(p.sourceAccount) : undefined, destinationPoolName: p.destinationAccount ? String(p.destinationAccount) : undefined });
        setQuickType('TRANSFER');
        setQuickVisible(true);
      } else if (prefill.target === 'afford-check' && hasSimulation) {
        const qs = p.amount ? `?amount=${encodeURIComponent(String(p.amount))}` : '';
        router.push(`/(app)/afford-check${qs}` as Href);
      } else if (prefill.target === 'create-envelope') {
        const qs = p.name ? `&name=${encodeURIComponent(String(p.name))}` : '';
        router.push(`/(app)/envelopes?create=1${qs}` as Href);
      } else if (prefill.target === 'edit-envelope' && p.id) {
        router.push(`/(app)/envelopes/${encodeURIComponent(String(p.id))}` as Href);
      } else if (prefill.target === 'create-bill') {
        const qs = new URLSearchParams({ createBill: '1' });
        if (p.name) qs.set('name', String(p.name));
        if (p.amount && Number(p.amount) > 0) qs.set('amount', String(p.amount));
        router.push(`/(app)/plan/schedules?${qs.toString()}` as Href);
      } else if (prefill.target === 'edit-bill' && p.id) {
        router.push(`/(app)/plan/schedules?editBillId=${encodeURIComponent(String(p.id))}` as Href);
      } else if (prefill.target === 'create-income') {
        router.push('/(app)/plan/schedules?createIncome=1' as Href);
      } else if (prefill.target === 'edit-income' && p.id) {
        router.push(`/(app)/plan/schedules?editIncomeId=${encodeURIComponent(String(p.id))}` as Href);
      } else if (prefill.target === 'history-filter') {
        const qs = new URLSearchParams();
        if (p.envelopeId) qs.set('poolId', String(p.envelopeId));
        if (p.category) qs.set('search', String(p.category));
        const str = qs.toString();
        router.push((str ? `/(app)/history?${str}` : '/(app)/history') as Href);
      } else if (prefill.target === 'navigate') {
        const screen = String(p.targetScreen || p.screen || 'home');
        if (screen === 'afford-check' && !hasSimulation) return;
        router.push((MOBILE_SCREEN_ROUTES[screen] ?? '/(app)/home') as Href);
      }
    },
    [hasSimulation, router]
  );

  const openCommandPalette = useCallback(() => setIsOpen(true), []);
  const closeCommandPalette = useCallback(() => setIsOpen(false), []);

  return (
    <CommandPaletteContext.Provider value={{ isOpen, openCommandPalette, closeCommandPalette }}>
      {children}
      <MobileCommandPaletteSheet
        isOpen={isOpen}
        onClose={closeCommandPalette}
        hasAiAssistant={hasAiAssistant}
        hasSimulation={hasSimulation}
        pages={searchPages}
        accounts={searchAccounts}
        envelopes={searchEnvelopes}
        upcomingEvents={searchEvents}
        onSearchTransactions={handleSearchTransactions}
        remainingCalls={hasAiAssistant && usageQuery.data ? Math.max(0, usageQuery.data.limit - usageQuery.data.used) : undefined}
        onAskPenny={
          hasAiAssistant
            ? async (q) => {
                const res = await askMutation.mutateAsync({ query: q });
                usageQuery.refetch();
                return res;
              }
            : undefined
        }
        onNavigatePrefill={handlePrefill}
        onSelectPage={(page) => {
          if (page.isAction) {
            setQuickInitialData(undefined);
            setQuickType('DEBIT');
            setQuickVisible(true);
            return;
          }
          router.push(page.route as Href);
        }}
        onSelectAccount={(acc) => router.push(`/(app)/settings?tab=bank-accounts&id=${encodeURIComponent(acc.id)}` as Href)}
        onSelectEnvelope={(env) => router.push(`/(app)/envelopes/${encodeURIComponent(env.id)}` as Href)}
        onSelectEvent={(ev) => router.push(`/(app)/plan?tab=events&search=${encodeURIComponent(ev.name)}` as Href)}
        onSelectTransaction={(tx) => router.push(`/(app)/history?search=${encodeURIComponent(tx.note || tx.envelopeName || String(tx.amount))}` as Href)}
        onViewAllTransactions={(q) => router.push(`/(app)/history?search=${encodeURIComponent(q)}` as Href)}
      />
      <QuickExpenseModal
        visible={quickVisible}
        initialType={quickType}
        initialData={quickInitialData}
        onClose={() => {
          setQuickVisible(false);
          setQuickInitialData(undefined);
        }}
      />
    </CommandPaletteContext.Provider>
  );
}

export function useCommandPalette(): CommandPaletteContextValue {
  return useContext(CommandPaletteContext);
}
