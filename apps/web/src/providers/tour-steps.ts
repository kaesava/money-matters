export const TOUR_STEPS: Array<{
  id: string;
  route: string;
  selector: string;
  titleKey: string;
  descKey: string;
  badgeKey?: string;
}> = [
  {
    id: 'envelopes-row',
    route: '/dashboard',
    selector: '[data-tour="envelopes-row"]',
    titleKey: 'tour.steps.envelopesRow.title',
    descKey: 'tour.steps.envelopesRow.desc',
    badgeKey: 'tour.steps.envelopesRow.badge',
  },
  {
    id: 'payday-card',
    route: '/dashboard',
    selector: '[data-tour="payday-card"]',
    titleKey: 'tour.steps.payday.title',
    descKey: 'tour.steps.payday.desc',
    badgeKey: 'tour.steps.payday.badge',
  },
  {
    id: 'afford-check',
    route: '/dashboard',
    selector: '[data-tour="afford-check"]',
    titleKey: 'tour.steps.affordCheck.title',
    descKey: 'tour.steps.affordCheck.desc',
    badgeKey: 'tour.steps.affordCheck.badge',
  },
  {
    id: 'quick-actions',
    route: '/dashboard',
    selector: '[data-tour="quick-actions"]',
    titleKey: 'tour.steps.quickActions.title',
    descKey: 'tour.steps.quickActions.desc',
    badgeKey: 'tour.steps.quickActions.badge',
  },
  {
    id: 'bank-accounts',
    route: '/dashboard/envelopes',
    selector: '[data-tour="bank-accounts"]',
    titleKey: 'tour.steps.bankAccounts.title',
    descKey: 'tour.steps.bankAccounts.desc',
    badgeKey: 'tour.steps.bankAccounts.badge',
  },
  {
    id: 'upcoming-events',
    route: '/dashboard/plan?tab=events',
    selector: '[data-tour="upcoming-events"]',
    titleKey: 'tour.steps.upcomingEvents.title',
    descKey: 'tour.steps.upcomingEvents.desc',
    badgeKey: 'tour.steps.upcomingEvents.badge',
  },
  {
    id: 'schedules-tab',
    route: '/dashboard/plan?tab=streams',
    selector: '[data-tour="schedules-tab"]',
    titleKey: 'tour.steps.schedulesTab.title',
    descKey: 'tour.steps.schedulesTab.desc',
    badgeKey: 'tour.steps.schedulesTab.badge',
  },
  {
    id: 'history-ledger',
    route: '/dashboard/history',
    selector: '[data-tour="history-ledger"]',
    titleKey: 'tour.steps.historyLedger.title',
    descKey: 'tour.steps.historyLedger.desc',
    badgeKey: 'tour.steps.historyLedger.badge',
  },
  {
    id: 'ask-penny',
    route: '/dashboard',
    selector: '[data-tour="ask-penny"]',
    titleKey: 'tour.steps.askPenny.title',
    descKey: 'tour.steps.askPenny.desc',
    badgeKey: 'tour.steps.askPenny.badge',
  },
];
