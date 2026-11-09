export const dashboard = {
  "dashboard": {
    "title": "Home",
    "quickAction": "+ Quick Action",
    "recordExpense": "Record Bill or Goal Spend",
    "recordIncome": "Record Income",
    "moveMoney": "Move Money",
    "transferBetweenPools": "Transfer between Envelopes",
    "emailLabel": "Email",
    "emailPlaceholder": "you@example.com",
    "loading": "Loading...",
    "deleteIncomeTitle": "Delete Income",
    "deleteIncomeConfirmPrompt": "Are you sure you want to delete \"{name}\"?",
    "upcoming": {
      "healthOnTrack": "On Track",
      "healthNeedsAttention": "Needs Attention",
      "healthBehind": "Behind"
    },
    "hero": {
      "everydayEnvelopeTitle": "Everyday Envelope",
      "safeToSpendLabel": "Safe to Spend Right Now",
      "alignBalance": "Sync Balance",
      "alignBalanceTooltip": "Sync this account with your actual bank balance",
      "atRisk": "Heads up",
      "dueToday": "Payday today! 🎉",
      "bufferProtected": "{amount} buffer protected",
      "everydayAllowanceCycle": "Target Allowance: {amount}",
      "estRemaining": "~{amount} est. remaining · {days} days to payday",
      "estRemainingToday": "~{amount} est. remaining · Payday is today!",
      "billsPoolTitle": "Bills Envelope",
      "billsRingFencedSubtitle": "Ring-fenced for committed bills",
      "billsFullyCovered": "Next 14 days of bills are fully covered!",
      "targetMonthlyBills": "Target Monthly Bills: {amount}",
      "coverShortfall": "Cover →",
      "shortfallOf": "Shortfall of {amount}",
      "billsDueSummary": "{count} bill(s) totaling {amount} due in 14 days",
      "firstPaydayPendingBadge": "Awaiting First Payday",
      "firstPaydayBillsNotice": "Bills will be funded automatically once your first payday is planned.",
      "balanceMatchNudgeTitle": "Balance sync overdue",
      "balanceMatchNudgeDesc": "It's been over 14 days since your last bank balance sync. Sync now to keep your everyday safe-to-spend accurate.",
      "balanceMatchNudgeAction": "Sync Balance"
    },
    "attention": {
      "categoryFunded": "Covered ✓",
      "categoryShort": "Short by {amount}"
    },
    "goals": {
      "title": "Goals",
      "cardTitle": "Goals & Savings",
      "totalSavedInvested": "Total Saved & Invested",
      "milestonesFunded": "{funded} of {target} ({percent}%)",
      "recurringPace": "{amount}/mo recurring pace",
      "goalBreakdown": "{total} Goals · {targetCount} Target Date, {recurringCount} Recurring",
      "noGoalsSubtitle": "Create a goal to start building your savings.",
      "addGoalAction": "+ Add Goal",
      "onTrack": "{count} of {total} on track",
      "allOnTrack": "All {total} goals on track",
      "viewAll": "View All Goals",
      "pacingTarget": "Pacing Target: {percent}%",
      "justBehind": "Just Behind",
      "lagging": "Lagging",
      "onTrackBadge": "On Track",
      "pace": "({percent}% pace)",
      "funded": "{percent}% funded",
      "ongoingPill": "Ongoing",
      "savedLabel": "Total Saved",
      "targetAmount": "Target: {amount}",
      "reached": "Goal reached!",
      "targetPassed": "Target date passed",
      "behindSchedule": "Behind schedule",
      "onSchedule": "On schedule",
      "slightlyBehind": "Slightly behind",
      "noTargetDate": "No target date set"
    },
    "upcomingExpensesTransfers": {
      "title": "Upcoming Expenses & Transfers",
      "tooltip": "Upcoming bill commitments and scheduled envelope transfers.",
      "empty": "✨ All caught up! All bills are covered until your next payday.",
      "daysAway": "{count} day{plural} away",
      "daysOverdue": "{count} day{plural} overdue",
      "dueToday": "Due today!",
      "availableSuffix": "· {amount} available"
    },
    "nextPay": {
      "reviewSplits": "Review and edit plan",
      "upcomingIncome": "Upcoming Income",
      "upcomingIncomeWithCount": "Upcoming Income ({count})",
      "noUpcoming": "No upcoming paydays scheduled.",
      "upcomingEventsLink": "Upcoming Events →",
      "twelveMonthPlanLink": "12-Month Plan →",
      "twelveMonthSplit": "12-Month Plan",
      "nextPaydayBadge": "Next Payday",
      "allocatePayday": "Allocate Payday",
      "savedBadge": "Locked"
    }
  },
  "home": {
    "deleteTransferTitle": "Delete Scheduled Transfer",
    "deleteTransferMessage": "Are you sure you want to delete this scheduled transfer?"
  },
  "cards": {
    "paydayTransfer": {
      "badge": "1-Tap Payday Transfer Plan",
      "sourceAccountDefault": "Paycheck Account",
      "destAccountDefault": "External Account",
      "rollupDescription": "Bank transfers are rolled up by destination account so you only make 1 transfer per bank:",
      "allRetainedDescription": "All allocations remain in your source account. No external bank transfers needed!",
      "retainedTitle": "Retained in",
      "noTransferNeeded": "No transfer required — funds stay in this account for:",
      "transfersRequired": "Required Transfers",
      "copyTooltip": "Copy amount to clipboard for banking app",
      "coversPools": "Covers {count} envelopes: ",
      "singleAccountProTipTitle": "💡 Unlock Guilt-Free Tap & Go",
      "singleAccountProTipDesc": "Your everyday spending money sits in the same account as your bills buffer. Moving Everyday spending to a separate card lets you tap and spend freely without worrying about dipping into rent.",
      "singleAccountLearnMore": "Learn how it works →",
      "copiedCheck": "✓ Copied",
      "copyAmount": "Copy {symbol}"
    }
  },
  "assistant": {
    "trigger": "Ask Penny",
    "triggerTitle": "Ask Penny",
    "placeholder": "Ask about your goals, bills, payday, or envelopes...",
    "subtitle": "Your intelligent Money Matters companion. Suggested questions are always free.",
    "remainingUsage": "{remaining} of {limit} AI questions left this month (resets {resetsOn})",
    "suggestedTitle": "Suggested Questions",
    "chips": {
      "goalDate": "When can I achieve my Goal?",
      "everydayBalance": "How much is left in Everyday?",
      "canAfford": "Can I afford 250 next week?",
      "nextPayday": "When is my next payday?",
      "billsDue": "Which bills are due this week?",
      "internetPaid": "I paid my internet bill $190 on 23-Jan"
    },
    "answers": {
      "goalProjection": "Based on your current plan, you are projected to reach {goal} ({target}) on {date}.",
      "noGoalFound": "We couldn't find a goal named '{goal}'. Check your Goals envelopes in Budgeting.",
      "poolBalance": "Your {envelopeName} envelope currently has {balance} available.",
      "nextPayday": "Your next scheduled payday is on {date} with an expected {amount} to allocate.",
      "nextPaydayNotScheduled": "No upcoming income event is scheduled yet. Add an income schedule to preview your next payday.",
      "billsDue": "You have {count} bill(s) due within the next {days} days.",
      "billPaid": "✓ {bill} ({amount}) has been paid and confirmed.",
      "billCovered": "✓ {bill} ({amount}) is fully funded in your envelope and ready for its due date.",
      "billUnpaid": "⚠ {bill} ({amount}) currently has a shortfall or is unfunded.",
      "billStatusNotFound": "Couldn't find an envelope or bill named '{bill}'."
    },
    "clarify": {
      "generic": "I couldn't quite understand that. Would one of these help?"
    },
    "unavailable": {
      "quota_exceeded": "Monthly AI limit reached (150 calls). Suggested questions and deterministic calculations are still available!",
      "read_only_grace": "Your account is in read-only grace period. AI responses are paused, but suggested questions still work.",
      "disabled": "Ask Penny is currently disabled for this tenant.",
      "rate_limited": "Too many questions in a short period. Please take a breath and try again in a minute.",
      "unauthenticated": "Please sign in to ask questions."
    },
    "settingsCard": {
      "title": "Penny AI Assistant Usage",
      "description": "Ask Penny gives you instant forward-looking answers about goals, upcoming bills, and payday plans.",
      "usedLabel": "{used} of {limit} monthly AI questions used",
      "resetsOn": "Usage resets on {date}",
      "freeNotice": "Suggested questions and quick-action navigation are always 100% free and unlimited."
    }
  }
} as const;
