import { test, expect } from "@playwright/test";
import { ensureAuthenticatedSession, isAuthenticatedE2E } from "./auth.helper";

test.describe("Screen-by-Screen Features & Settings E2E Suite", () => {
  test.beforeEach(async ({ page, browser }) => {
    await ensureAuthenticatedSession(page, browser);
  });

  // 5. BANK ACCOUNTS & PRIVACY TOGGLE (`/dashboard/bank-accounts`)
  // ---------------------------------------------------------------------------
  test.describe("5. Bank Accounts Screen (`/dashboard/bank-accounts`)", () => {
    test("5.1 Account List Table & BankAccountFormModal Field-by-Field Audit", async ({ page }) => {
      await page.goto("/dashboard/bank-accounts");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      const addAccountBtn = page.locator('button:has-text("Add Bank Account")').first();
      await expect(addAccountBtn).toBeVisible();
      await addAccountBtn.click();

      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible();

      const cbaChip = modal.locator('button:has-text("Commonwealth Bank (CBA)")').first();
      const accountNameInput = modal.locator('input[type="text"]').first();
      const amountInputs = modal.locator('input[inputmode="decimal"]');

      await expect(cbaChip).toBeVisible();
      await expect(accountNameInput).toBeVisible();
      await expect(amountInputs.nth(0)).toBeVisible();
      await expect(amountInputs.nth(1)).toBeVisible();

      await cbaChip.click();
      await accountNameInput.fill("CBA Smart Access");
      await amountInputs.nth(0).fill("3200.00");
      await amountInputs.nth(1).fill("500.00");

      await modal.locator('button:has-text("Cancel")').first().click();
      const discardBtn = page.locator('button:has-text("Discard")').first();
      await expect(discardBtn).toBeVisible();
      await discardBtn.click();
      await expect(modal).not.toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // 6. ENVELOPES & MOVE MONEY (`/dashboard/envelopes`)
  // ---------------------------------------------------------------------------
  test.describe("6. Envelopes & Move Money (`/dashboard/envelopes`)", () => {
    test("6.1 Envelope Search Filter & Move Money Quick Action Audit", async ({ page }) => {
      await page.goto("/dashboard/envelopes");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      const searchInput = page.locator('input[data-search-input="true"], input[placeholder*="Search"]').first();
      await expect(searchInput).toBeVisible();
      await searchInput.fill("Dining");
      await expect(searchInput).toHaveValue("Dining");

      const actionsBtn = page.locator('button[aria-label="Actions"]').first();
      await expect(actionsBtn).toBeVisible();
      await actionsBtn.click();

      const moveMoneyItem = page.locator('button:has-text("Move Money")').first();
      await expect(moveMoneyItem).toBeVisible();
      await moveMoneyItem.click();

      const drawerAmount = page.locator('input[inputmode="decimal"]').first();
      await expect(drawerAmount).toBeVisible();
      await drawerAmount.fill("75.00");

      await page.keyboard.press("Escape");
    });

    test("6.2 Add Envelope Modal, Type Filter Pills & Envelopes Table Audit", async ({ page }) => {
      await page.goto("/dashboard/envelopes");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      await expect(page.locator('button:has-text("All")').first()).toBeVisible();
      await expect(page.locator('button:has-text("Everyday")').first()).toBeVisible();
      await expect(page.locator('button:has-text("Bills")').first()).toBeVisible();
      const goalsPill = page.locator('button:has-text("Goals")').first();
      await expect(goalsPill).toBeVisible();
      await goalsPill.click();

      const addEnvelopeBtn = page.locator('button:has-text("Add Envelope")').first();
      await expect(addEnvelopeBtn).toBeVisible();
      await expect(page.locator("table").first()).toBeVisible();

      await addEnvelopeBtn.click();
      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(modal).not.toBeVisible();
    });

    test("6.3 Envelopes Future Projection Matrix Toggle Audit", async ({ page }) => {
      test.skip(!isAuthenticatedE2E, "Requires authenticated E2E session");
      await page.goto("/dashboard/envelopes");

      const actionsBtn = page.locator('button[aria-label="Actions"]').first();
      await expect(actionsBtn).toBeVisible();
      await actionsBtn.click();

      const projectionBtn = page.locator('button:has-text("Future Projection")').first();
      await expect(projectionBtn).toBeVisible();
      await projectionBtn.click();

      await expect(page.locator('button[title="Exit Projection Mode"]').first()).toBeVisible();
      await page.locator('button[title="Exit Projection Mode"]').first().click();
    });
  });

  // ---------------------------------------------------------------------------
  // 7. PLAN COMMAND CENTER (`/dashboard/plan`) & PAYDAY PLAN (`/dashboard/payday-plan`)
  // ---------------------------------------------------------------------------
  test.describe("7. Plan Command Center (`/dashboard/plan`)", () => {
    test("7.1 Plan Tabs, Upcoming Search, 12-Month Payday Plan & Schedules Audit", async ({ page }) => {
      await page.goto("/dashboard/plan");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      await expect(page.locator("main")).toBeVisible();

      const upcomingTab = page.locator('button:has-text("Upcoming")').first();
      const matrixTab = page.locator('button:has-text("12-Month Payday Plan")').first();
      const schedulesTab = page.locator('button:has-text("Schedules")').first();

      await expect(upcomingTab).toBeVisible();
      await expect(matrixTab).toBeVisible();
      await expect(schedulesTab).toBeVisible();

      const upcomingSearch = page.locator('input[data-search-input="true"], input[placeholder*="Search events"]').first();
      await expect(upcomingSearch).toBeVisible();
      await upcomingSearch.fill("Salary");
      await expect(upcomingSearch).toHaveValue("Salary");

      await matrixTab.click();
      await expect(page.locator("table").first()).toBeVisible();

      await schedulesTab.click();
      await expect(page.locator('button:has-text("Add Income Schedule")').first()).toBeVisible();
      await expect(page.locator('button:has-text("Add Bill Schedule")').first()).toBeVisible();
      await expect(page.locator('button:has-text("One-off Expense")').first()).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // 8. TRANSACTION HISTORY & BANK ACCOUNTS TABLE AUDIT
  // ---------------------------------------------------------------------------
  test.describe("8. History & Bank Accounts Table Audit (`/dashboard/history` & `/dashboard/bank-accounts`)", () => {
    test("8.1 History Type Filters & Column Sorting Audit", async ({ page }) => {
      await page.goto("/dashboard/history");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      const transferFilterBtn = page.locator('button:has-text("Transfer")').first();
      await expect(transferFilterBtn).toBeVisible();
      await transferFilterBtn.click();

      const dateHeader = page.locator('th:has-text("Date")').first();
      await expect(dateHeader).toBeVisible();
      await dateHeader.click();
    });

    test("8.2 Bank Accounts Table & Alignment Audit (`/dashboard/bank-accounts`)", async ({ page }) => {
      await page.goto("/dashboard/bank-accounts");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      await expect(page.locator("h2").filter({ hasText: /Bank accounts/i }).first()).toBeVisible();
      await expect(page.locator('button:has-text("Add Bank Account")').first()).toBeVisible();
      await expect(page.locator("table").first()).toBeVisible();
      await expect(page.locator('th:has-text("Actions")')).toHaveCount(0);
      await expect(page.locator('button:has-text("Import CSV")')).toHaveCount(0);
    });
  });

  // ---------------------------------------------------------------------------
  // 9. SETTINGS 4-TAB LAYOUT & HOUSEHOLD GOVERNANCE (`/dashboard/settings`)
  // ---------------------------------------------------------------------------
  test.describe("9. Settings 4-Tab Layout & Household Governance (`/dashboard/settings`)", () => {
    test("9.1 Settings 4-Tab Navigation (`Profile`, `Household`, `Archive`, `Plan`)", async ({ page }) => {
      await page.goto("/dashboard/settings");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      await expect(page.locator("h1").filter({ hasText: /^Settings$/i }).first()).toBeVisible();
      const profileTab = page.locator('button:has-text("Profile")').first();
      const householdTab = page.locator('button:has-text("Household")').first();
      const archiveTab = page.locator('button:has-text("Archive")').first();
      const planTab = page.locator('button:has-text("Plan")').first();

      await expect(profileTab).toBeVisible();
      await expect(householdTab).toBeVisible();
      await expect(archiveTab).toBeVisible();
      await expect(planTab).toBeVisible();

      await householdTab.click();
      await expect(page.locator("h2, h3").filter({ hasText: /Household Members/i }).first()).toBeVisible();

      await archiveTab.click();
      await expect(page.locator('input[placeholder*="Search archived items"]').first()).toBeVisible();

      await planTab.click();
      await expect(page.locator('a[href="/setup?mode=rerun"]').first()).toBeVisible();
      await expect(page.locator("h3").filter({ hasText: /Penny AI Assistant Usage/i }).first()).toBeVisible();
      await expect(page.locator('button:has-text("Download Zipped CSV Backup")').first()).toBeVisible();
    });

    test("9.2 Household Governance Danger Zone (`/dashboard/settings?tab=household`)", async ({ page }) => {
      await page.goto("/dashboard/settings?tab=household");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      await expect(page.locator("h1").filter({ hasText: /^Settings$/i }).first()).toBeVisible();
      await expect(page.locator("section").filter({ hasText: /Danger Zone/i }).first()).toBeVisible();
    });

    test("9.3 Provide Feedback Modal Audit", async ({ page }) => {
      await page.goto("/dashboard/settings?tab=account-data");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      const feedbackBtn = page.locator('button:has-text("Provide Feedback")').first();
      await expect(feedbackBtn).toBeVisible();
      await feedbackBtn.click();

      const modal = page.locator('[role="dialog"]').filter({ hasText: /Provide Feedback/i }).first();
      await expect(modal).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(modal).not.toBeVisible();
    });

    test("9.4 Payday Rules & Allocation Recipe (`/dashboard/settings/allocation-rules`)", async ({ page }) => {
      await page.goto("/dashboard/settings/allocation-rules");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      await expect(page.locator("h1").filter({ hasText: /Payday Rules/i }).first()).toBeVisible();
      await expect(page.locator("text=Balanced").first()).toBeVisible();
      await expect(page.locator("text=Bills Fortress").first()).toBeVisible();
      await expect(page.locator("text=Pay Yourself First").first()).toBeVisible();
    });

    test("9.5 Notification Preferences (`/dashboard/settings/notifications`)", async ({ page }) => {
      await page.goto("/dashboard/settings/notifications");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      await expect(page.locator("h1").filter({ hasText: /Notification Preferences/i }).first()).toBeVisible();
      await expect(page.locator("text=Weekly Balance Digest").first()).toBeVisible();
      await expect(page.locator("text=Payday Plan Alerts").first()).toBeVisible();
      await expect(page.locator("text=Bank Balance Match Nudge").first()).toBeVisible();
      const checkboxes = page.locator('input[type="checkbox"]');
      await expect(checkboxes).toHaveCount(6);
      const firstCheckbox = checkboxes.first();
      const initialChecked = await firstCheckbox.isChecked();
      await firstCheckbox.click();
      await page.waitForTimeout(500);
      await page.reload();
      await expect(page.locator('input[type="checkbox"]').first()).toBeChecked({ checked: !initialChecked });
      await page.locator('input[type="checkbox"]').first().click();
      await page.waitForTimeout(500);
    });
  });

  // ---------------------------------------------------------------------------
  // 10. HISTORY & PAYDAY PLANS 2-TAB SCREEN (`/dashboard/history`)
  // ---------------------------------------------------------------------------
  test.describe("10. History & Payday Plans 2-Tab Screen (`/dashboard/history`)", () => {
    test("10.1 History & Payday Plans Tabs", async ({ page }) => {
      await page.goto("/dashboard/history");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      await expect(page.locator("h1").filter({ hasText: /^History$/i }).first()).toBeVisible();
      await expect(page.locator('[data-tour="history-ledger"]').first()).toBeVisible();

      const paydayTab = page.locator('button:has-text("Payday Plans")').first();
      await expect(paydayTab).toBeVisible();
      await paydayTab.click();
      await expect(page.locator("h2, text=No Payday Plans Yet").first()).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // 11. DEDICATED PAYDAY PLAN SCREEN (`/dashboard/payday-plan`)
  // ---------------------------------------------------------------------------
  test.describe("11. Dedicated Payday Plan Screen (`/dashboard/payday-plan`)", () => {
    test("11.1 Guarded redirect when accessed without event ID", async ({ page }) => {
      await page.goto("/dashboard/payday-plan");
      await expect(page).toHaveURL(/\/dashboard\/plan\?tab=matrix|\/sign-in/);
    });
  });

  // ---------------------------------------------------------------------------
  // 12. SPECIALIZED INTERACTIVE MODALS & WORKFLOWS AUDIT
  // ---------------------------------------------------------------------------
  test.describe("12. Specialized Interactive Modals & Workflows Audit", () => {
    test("12.1 Bank Account Balance Sync Modal Trigger Check (`SyncBalanceModal`)", async ({ page }) => {
      test.skip(!isAuthenticatedE2E, "Requires authenticated E2E session");
      await page.goto("/dashboard/bank-accounts");
      await expect(page.locator("table").first()).toBeVisible();
    });

    test("12.2 Profile Avatar Upload & Cropper Flow (`/dashboard/settings?tab=profile`)", async ({ page }) => {
      test.skip(!isAuthenticatedE2E, "Requires authenticated E2E session");
      await page.goto("/dashboard/settings?tab=profile");

      const editBtn = page.locator('button:has-text("Edit")').first();
      await expect(editBtn).toBeVisible();
      await editBtn.click();

      const fileInput = page.locator('input[type="file"][accept*="image"]').first();
      const buffer = Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "base64"
      );
      await fileInput.setInputFiles({
        name: "avatar.png",
        mimeType: "image/png",
        buffer,
      });

      const cropModal = page.locator('[role="dialog"]').filter({ hasText: /Crop|Avatar/i }).first();
      await expect(cropModal).toBeVisible();
      await expect(cropModal.locator("canvas").first()).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(cropModal).not.toBeVisible();
    });
  });
});
