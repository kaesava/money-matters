export const translations = {
  en: {
    app: {
      title: "money matters",
      description: "The forward-looking income allocation system engineered for absolute financial clarity without administrative friction.",
    },
    common: {
      save: "Save",
      cancel: "Cancel",
      confirm: "Confirm",
      next: "Next",
      back: "Back",
      done: "Done",
      edit: "Edit",
      delete: "Delete",
      archive: "Archive",
      restore: "Restore",
      loading: "Loading…",
      error: "Something went wrong. Please try again.",
      retry: "Retry",
      empty: "Nothing here yet.",
      emptySubtitle: "Get started by adding your first item.",
      required: "This field is required.",
      optional: "Optional",
      saveChanges: "Save Changes",
      close: "Close",
      add: "Add",
      remove: "Remove",
    },
    auth: {
      cta: "Sign In / Register",
      hint: "Start managing your money at the exact point of income arrival.",
      signIn: "Sign In",
      signUp: "Create Account",
      emailLabel: "Email",
      emailPlaceholder: "you@example.com",
      passwordLabel: "Password",
      passwordPlaceholder: "••••••••",
      nameLabel: "Your Name",
      namePlaceholder: "Jane Smith",
      signInCta: "Sign In",
      signUpCta: "Create Account",
      signInPrompt: "Already have an account?",
      signUpPrompt: "New to money matters?",
      forgotPassword: "Forgot password?",
      signingIn: "Signing in…",
      signingUp: "Creating account…",
      signInErrorTitle: "Sign In Failed",
      signInErrorGeneric: "Invalid email or password. Please try again.",
      signUpErrorTitle: "Sign Up Failed",
      signUpErrorGeneric: "Could not create account. Please try again.",
      enterEmailPrompt: "Please enter your email address first.",
      forgotPasswordError: "Could not request password reset.",
      forgotPasswordSuccess: "A password reset link has been sent to your email.",
      resetPassword: "Reset Password",
      resetPasswordSubtitle: "Enter a new secure password for your account.",
      resetPasswordErrorTitle: "Reset Error",
      resetPasswordGenericError: "Failed to reset password.",
      resetPasswordSuccessTitle: "Success",
      resetPasswordSuccessMessage: "Your password has been successfully reset. Please sign in with your new password.",
      invalidToken: "Invalid or expired link. Please request a new password reset link.",
      passwordRequired: "Password is required.",
      passwordsMustMatch: "Passwords do not match.",
      newPasswordLabel: "New Password",
      confirmPasswordLabel: "Confirm New Password",
      passwordTooShort: "Password must be at least 8 characters long.",
      confirmPasswordPlaceholder: "Confirm Password",
    },
    setup: {
      title: "Setup Your Household",
      stepOf: "Step {step} of {total}",
      income: {
        title: "Income Sources",
        subtitle: "Add the income sources your household receives.",
        addIncome: "Add Income Source",
        nameLabel: "Income Name",
        namePlaceholder: "e.g. Salary – Jane",
        typeLabel: "Income Type",
        typeSalary: "Salary",
        typeFreelance: "Freelance",
        typeOther: "Other",
        amountLabel: "Expected Net Amount",
        amountPlaceholder: "0.00",
        scheduleLabel: "Pay Frequency",
        scheduleWeekly: "Weekly",
        scheduleFortnightly: "Fortnightly",
        scheduleMonthly: "Monthly",
        scheduleCustom: "Custom (RRULE)",
        startDateLabel: "First Expected Payment",
        addCta: "Add This Income",
        skipHint: "You can add more income sources in Settings later.",
      },
      categories: {
        title: "Your Expense Categories",
        subtitle: "Select the categories that apply to your household. You can customise these later.",
        selectedCount: "{count} selected",
        addCustom: "Add Custom Category",
        customNamePlaceholder: "e.g. Pet Expenses",
        majorSection: "Save Toward (Major)",
        recurringSection: "Regular Bills (Recurring)",
        everydaySection: "Day-to-Day Spending",
      },
      configure: {
        title: "Configure Categories",
        subtitle: "Set a target amount and schedule for each MAJOR and RECURRING category.",
        targetLabel: "Target Amount",
        targetPlaceholder: "0.00",
        scheduleLabel: "Schedule",
        dueDateLabel: "Due Date",
        priorityLabel: "Priority Rank",
        priorityHint: "1 = highest priority. Same number = funded together.",
        excessLabel: "Default Excess Bucket",
        excessHint: "Surplus income flows here (usually Emergency Fund).",
      },
      bankAccounts: {
        title: "Bank Accounts",
        subtitle: "Register the bank accounts your household uses for budgeting.",
        addAccount: "Add Account",
        nameLabel: "Account Name",
        namePlaceholder: "e.g. Commonwealth Savings",
        purposeLabel: "Account Purpose",
        purposeIncomeLanding: "Income Landing",
        purposeSavings: "Savings / Bills",
        purposeEveryday: "Everyday Spending",
        isOffsetLabel: "This is an offset account",
        addCta: "Add This Account",
      },
      complete: {
        title: "You're All Set!",
        subtitle: "Your household is configured. Your first allocation plan will be ready when your next paycheck arrives.",
        goDashboard: "Go to Dashboard",
      },
    },
    home: {
      title: "Home",
      nextPaycheck: "Next Paycheck",
      paydayIn: "Payday in {days} days",
      paydayToday: "Payday today!",
      expectedAmount: "Expected {amount}",
      onTrack: "{count} on track",
      atRisk: "{count} at risk",
      reviewAllocation: "Review Allocation",
      noUpcomingPaycheck: "No upcoming paycheck found.",
      addPaycheck: "Add Paycheck Event",
      categoryHealth: "Category Health",
      noCategories: "No categories yet.",
      setupCategories: "Complete setup to see your categories.",
      allOnTrack: "All categories on track 🎉",
    },
    buckets: {
      title: "Categories",
      balance: "Balance",
      target: "Target",
      progressPct: "{pct}% funded",
      nextDue: "Due {date}",
      noDueDate: "No due date",
      funded: "Funded",
      majorSection: "Save Toward",
      recurringSection: "Regular Bills",
      everydaySection: "Day-to-Day",
      detail: {
        title: "Category Detail",
        currentBalance: "Current Balance",
        targetAmount: "Target Amount",
        progressBar: "Progress",
        history: "Transaction History",
        noHistory: "No transactions yet.",
      },
    },
    transactions: {
      title: "Transactions",
      recent: "Recent Transactions",
      noTransactions: "No transactions yet.",
      addExpense: "Add Expense",
      newExpense: {
        title: "Quick Add Expense",
        amountLabel: "Amount",
        amountPlaceholder: "0.00",
        categoryLabel: "Category",
        categoryPlaceholder: "Select a category…",
        noteLabel: "Note",
        notePlaceholder: "Optional description",
        submitCta: "Record Expense",
        submitting: "Recording…",
        successMessage: "Expense recorded.",
      },
      debit: "Expense",
      credit: "Allocation",
      shortfallBorrow: "Shortfall Borrow",
    },
    paychecks: {
      title: "Paychecks",
      noPaychecks: "No income events yet.",
      addManual: "Add Manual Paycheck",
      upcoming: "Upcoming",
      draft: "Ready to Review",
      reviewed: "Reviewed",
      confirmed: "Confirmed",
      expectedDate: "Expected {date}",
      expectedAmount: "Expected {amount}",
      review: {
        title: "Paycheck Review",
        incomeAmount: "Income Amount",
        allocationBreakdown: "Allocation Breakdown",
        totalAllocated: "Total Allocated",
        remaining: "Remaining",
        confirmCta: "Confirm Allocation",
        confirming: "Confirming…",
        confirmed: "Allocation Confirmed ✓",
        reasoning: "Reasoning",
        adjustHint: "Tap an amount to adjust",
        transferInstructions: "Transfer Instructions",
        transferTo: "Transfer {amount} to {account}",
        offsetAccount: "Offset account — no transfer needed",
      },
    },
    settings: {
      title: "Settings",
      household: {
        title: "Household",
        nameLabel: "Household Name",
        members: "Members",
        ownerBadge: "Owner",
        memberBadge: "Member",
      },
      bankAccounts: {
        title: "Bank Accounts",
        noAccounts: "No bank accounts registered.",
        addAccount: "Add Account",
      },
      categories: {
        title: "Categories",
        noCategories: "No categories yet.",
        addCategory: "Add Category",
      },
      incomeSources: {
        title: "Income Sources",
        noSources: "No income sources yet.",
        addSource: "Add Income Source",
      },
      signOut: "Sign Out",
      version: "Version {version}",
    },
    shortfall: {
      alertTitle: "Shortfall Alert",
      alertBody: "{category} is overdrawn by {amount}.",
      recommendedDonor: "Suggested donor: {category} (surplus: {amount})",
      approveCta: "Approve Transfer",
      chooseDifferent: "Choose Different Donor",
    },
  },
} as const;

// Typed key path helper
export type TranslationKey = string;

export function t(
  key: TranslationKey,
  optionsOrLocale?: "en" | { defaultValue?: string;[key: string]: unknown }
): string {
  const parts = key.split(".");
  let current: unknown = translations.en;

  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      current = undefined;
      break;
    }
  }

  let result = typeof current === "string" ? current : undefined;

  if (
    !result &&
    optionsOrLocale &&
    typeof optionsOrLocale === "object" &&
    "defaultValue" in optionsOrLocale &&
    typeof optionsOrLocale.defaultValue === "string"
  ) {
    result = optionsOrLocale.defaultValue;
  }

  if (!result) {
    result = key;
  }

  // Basic template variable injection: {key}
  if (optionsOrLocale && typeof optionsOrLocale === "object") {
    for (const [k, v] of Object.entries(optionsOrLocale)) {
      if (k !== "defaultValue") {
        result = result.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
  }

  return result;
}
