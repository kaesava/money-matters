import { settingsSections } from "./settings-sections";

export const settings = {
  "settings": {
    "title": "Settings",
    "loadingSettings": "Loading settings...",
    "tabs": {
      "profile": "Profile",
      "household": "Household",
      "bankAccounts": "Bank",
      "archived": "Archive",
      "accountData": "Plan"
    },
    "archived": {
      "restoreSuccess": "Item restored successfully.",
      "restoreTitle": "Restore Item",
      "restoreConfirm": "Are you sure you want to restore \"{name}\"? It will be active again and its upcoming schedule events will be restored.",
      "restoreAction": "Restore",
      "pools": "Envelopes",
      "income": "Income Schedules",
      "accounts": "Bank Accounts",
      "types": {
        "ENVELOPE": "Envelope",
        "INCOME_SOURCE": "Income Schedule",
        "BANK_ACCOUNT": "Bank Account"
      },
      "searchPlaceholder": "Search archived items...",
      "emptyTitle": "No archived data found",
      "emptySubtitle": "Items you archive will appear here and can be restored anytime.",
      "archivedOn": "Archived on {date}"
    },
    "profile": {
      "title": "Your profile",
      "avatarSizeError": "Avatar image size must be under 200KB.",
      "avatarSourceSizeError": "Original image must be under 5MB.",
      "photoLibraryPermissionDenied": "Please grant access to your photo library to choose a profile avatar.",
      "avatarTypeError": "Please upload a PNG, JPG, or WEBP image.",
      "nameRequired": "Name is required.",
      "phoneInvalid": "Please enter a valid mobile number.",
      "profileSaveFailed": "Failed to save profile.",
      "iconsVisible": "✓ Visible",
      "iconsHidden": "✕ Hidden",
      "biometricLockTitle": "{label} App Lock",
      "biometricLockHint": "Auto-locks after 2 minutes of background inactivity to protect your stealth privacy."
    },
    "household": {
      "title": "Household",
      "stateLabel": "State / Region",
      "postcodeLabel": "Postal / ZIP Code"
    },
    "members": {
      "title": "Household Members",
      "tooltip": "Active members sharing this household budget.",
      "subscribeCta": "Subscribe Now",
      "noMembers": "No members found.",
      "roleOwner": "Owner",
      "roleMember": "Member",
      "removeAction": "Remove",
      "inviteTooltip": "Active members sharing this household budget.",
      "onlyOwnerCanInvite": "Only the household owner can manage members.",
      "trialUpgradeRequired": "Managing members requires an active household subscription.",
      "trialExpiredBadge": "Trial Expired",
      "emailAddressLabel": "Email Address",
      "sendInvitationCta": "Send Invitation →",
      "invalidEmailWarning": "Please enter a valid email address.",
      "inviteSentSuccess": "Invitation sent to {email}.",
      "inviteFailed": "Failed to send invitation.",
      "removeMemberSuccess": "{name} removed from household.",
      "removeMemberFailed": "Failed to remove member.",
      "roleSelectorLabel": "Role",
      "changeRoleSuccess": "Role updated to {role} for {name}.",
      "changeRoleFailed": "Failed to update member role.",
      "demoteSelfTitle": "Demote yourself to Member?",
      "demoteSelfConfirm": "You will immediately lose Owner abilities to manage members and household rules until another Owner upgrades you.",
      "demoteSelfConfirmButton": "Demote to Member",
      "soleOwnerRestricted": "The household must have at least one Owner.",
    },
    "dangerZone": {
      "title": "Danger Zone",
      "tooltip": "Irreversible actions for your household membership and data.",
      "subtitle": "Once executed, these actions cannot be undone.",
      "leaveCta": "Leave Household",
      "deleteCta": "Delete Household & Data",
      "leaveConfirmPhrase": "LEAVE HOUSEHOLD",
      "leaveConfirmLabel": "Type LEAVE HOUSEHOLD to confirm:",
      "deleteConfirmLabel": "Type exact Household Name ({name}) to confirm:",
      "downloadFirstTitle": "Recommendation: Download Your Data First",
      "downloadFirstBody": "We strongly recommend downloading a zipped CSV backup of your records before deleting your household."
    },
    "bankAccountForm": {
      "addTitle": "Add New Bank Account",
      "bankProviderLabel": "Bank Institution",
      "accountTypeLabel": "Account Type",
      "accountNameLabel": "Account Name",
      "accountNamePlaceholder": "e.g. Smart Access Savings",
      "balanceLabel": "Current Balance",
      "bufferLabel": "Set-aside amount",
      "availableLabel": "Amount Available to Budget:",
      "availableTooltip": "Current balance minus set-aside amount. This amount is safely distributable across your envelopes.",
      "privacyLabel": "Private Account",
      "privacyHint": "Only visible to you. Other household members will not see this account, its balances, or envelopes linked to it. (Cannot be modified after creation).",
      "privacyConfirmTitle": "Make Account Private?",
      "privacyConfirmBody": "Making this account private hides all associated balances and history from other household members. This setting cannot be undone once confirmed.",
      "archiveAccountCta": "Archive Account",
      "archiveConfirmLastPrivateBody": "Archiving this will remove your last private bank account. All active income schedules and upcoming paydays will be reset to 100% household contribution.",
      "archiveConfirmTitle": "Archive Bank Account",
      "archiveConfirmBody": "Are you sure you want to archive {name}? Linked history will not be impacted.",
      "bufferExceedsBalance": "Set-aside amount cannot exceed current balance.",
      "createCta": "Create Account",
      "saveCta": "Save Changes"
    },
    "app": {
      "diagnosticsCopied": "Diagnostics copied to clipboard."
    },
    "editProfileTitle": "Edit Profile",
    "displayNameRequired": "Name is required.",
    "typeToConfirmLabel": "Type {phrase} to confirm:",
    "myDetailsTitle": "My Details",
    "displayNameLabel": "Name",
    "displayNamePlaceholder": "e.g. Jane Smith",
    "loginEmailLabel": "Login Email",
    "notificationEmailLabel": "Notification Email",
    "notificationEmailHint": "Where we send notifications.",
    "phoneNumberLabel": "Mobile Phone Number",
    "avatarUploadLabel": "Avatar Photo",
    "positionZoomAvatar": "Position & Zoom Avatar",
    "cropInstruction": "Drag to center your photo within the circle, and adjust zoom slider below.",
    "saveAvatarPhoto": "Save Avatar Photo",
    "addMemberTitle": "Add a Household Member",
    "removeMemberTitle": "Remove Household Member",
    "removeMemberConfirm": "Type exact member name ({name}) to confirm removal:",
    "saveProfileCta": "Save Profile Details",
    "profileSaved": "Profile details saved successfully.",
    "editHouseholdTitle": "Edit Household Details",
    "saveHouseholdCta": "Save Household Details",
    "householdTooltip": "Update your household name, base currency, and location details. Shared across household members.",
    "accounts": "Bank accounts",
    "language": "Language",
    "currency": "Household Currency",
    "currencyLockedTooltip": "Household base currency is locked to preserve transaction history and account integrity.",
    "countryLockedTooltip": "Household country is locked to preserve currency, tax, and regional compliance integrity.",
    "timezone": "Timezone",
    "signOut": "Sign out",
    "signOutConfirm": "You sure?",
    "income": {
      "addSchedule": "Add Income Schedule",
      "scheduleName": "Schedule Name",
      "archiveConfirmTitle": "Archive Income Schedule",
      "archiveConfirmMessage": "Are you sure you want to archive \"{name}\"?"
    },
    "notificationsLink": "Notification Preferences",
    "reportBugLink": "Provide Feedback",
    "versionInfo": {
      "copyDiagnosticsHint": "Click to copy diagnostic info"
    },
    "bankAccounts": {
      "title": "Bank accounts",
      "searchPlaceholder": "Search bank accounts...",
      "addAccount": "Add Bank Account",
      "deleteConfirmTitle": "Delete Bank Account",
      "deleteConfirmBody": "Are you sure you want to delete {name}?"
    },
    "householdProfileAndLocation": "Household Profile & Location",
    "householdProfileTooltip": "Update your household name, base currency, and location details. Shared across household members.",
    "householdNameLabel": "Household Name",
    "countryLabel": "Country",
    "items": {
      "showIcons": "Show information icons",
      "showIconsHint": "Switch information tooltip (i) icons on or off across all screens.",
      "timezone": "Display timezone"
    },
    "paydayRules": {
      "title": "Payday Rules",
      "description": "Control how income is allocated across your bills, everyday spending, and savings goals.",
      "activePresetLabel": "Active Strategy",
      "activeBadge": "Active",
      "customizeButton": "Customise Rules",
      "resetToRecommended": "Reset to Recommended",
      "resetConfirmTitle": "Reset to Recommended Rules",
      "resetConfirmMessage": "Are you sure you want to restore the standard Balanced rules? Any custom order or rule blocks will be replaced.",
      "switchPresetConfirmTitle": "Switch to {presetName}?",
      "switchPresetConfirmMessage": "Are you sure you want to switch to {presetName}? Any active custom rules will be replaced.",
      "switchPresetAction": "Switch to {presetName}",
      "onlyOwnerCanChange": "Only household owners can change household rules.",
      "tabs": {
        "household": "Household Rules",
        "personal": "Personal Rules"
      },
      "customiseToActivate": "Customise to activate",
      "presets": {
        "balanced": {
          "name": "Balanced",
          "description": "Bills due soon and everyday living are protected first, followed by upcoming bills and savings goals."
        },
        "billsFortress": {
          "name": "Bills Fortress",
          "description": "Safeguards all current and upcoming bills before funding everyday spending or savings."
        },
        "payYourselfFirst": {
          "name": "Pay Yourself First",
          "description": "Prioritizes non-negotiable savings goals right after bills due soon, before everyday spending."
        },
        "custom": {
          "name": "Custom Rules",
          "description": "Tailored rule recipe configured specifically for your household."
        }
      },
      "stepTypes": {
        "IMMEDIATE_BILLS": "Bills Due Soon",
        "DEFICIT_REPAIR": "Cover Negative Balances",
        "BILLS_SAFETY_FLOOR": "Bills Safety Cushion",
        "PRO_RATA_BILLS": "Upcoming Bills",
        "EVERYDAY_ALLOWANCE": "Everyday Living Allowance",
        "PRIORITY_BILLS": "Priority Bills",
        "STANDARD_BILLS": "Standard Bills",
        "PRIORITY_GOALS": "Priority Goals",
        "STANDARD_GOALS": "Standard Goals",
        "FIXED_AMOUNT": "Fixed Amount to Envelope",
        "PERCENTAGE_SPLIT": "Percentage Share",
        "SURPLUS_SWEEP": "Remaining Surplus Sweep"
      },
      "stepDescriptions": {
        "IMMEDIATE_BILLS": "Funds bills due before next pay plus buffer days.",
        "DEFICIT_REPAIR": "Restores any envelopes that have dropped into a negative balance.",
        "BILLS_SAFETY_FLOOR": "Ensures bill envelopes maintain their required minimum safety cushion.",
        "PRO_RATA_BILLS": "Paces future bills so money is set aside smoothly ahead of time.",
        "EVERYDAY_ALLOWANCE": "Allocates your regular everyday spending allowance for this pay cycle.",
        "PRIORITY_BILLS": "Paces forward funds for bills marked as priority.",
        "STANDARD_BILLS": "Paces forward funds for standard recurring and flexible bills.",
        "PRIORITY_GOALS": "Funds goals marked as priority milestones.",
        "STANDARD_GOALS": "Allocates regular contributions to your standard savings goals.",
        "FIXED_AMOUNT": "Allocates a dedicated fixed dollar amount to a chosen envelope.",
        "PERCENTAGE_SPLIT": "Distributes a set percentage of remaining income.",
        "SURPLUS_SWEEP": "Sweeps any remaining unallocated income into your designated envelope."
      },
      "pageTitle": "Payday Rules & Allocation Recipe",
      "pageSubtitle": "Customize the priority and order in which your income is allocated across your household envelopes on payday.",
      "moveUp": "Move Up",
      "moveDown": "Move Down",
      "targetEnvelopeLabel": "Target Envelope",
      "saveChanges": "Save Rules",
      "saveSuccess": "Payday rules updated successfully."
    }
  },
  ...settingsSections
} as const;
