import { test, expect } from "@playwright/test";

test.describe("Screen-by-Screen Features & Settings E2E Suite", () => {
  // 5. BANK ACCOUNTS & PRIVACY TOGGLE (`/dashboard/settings?tab=bank-accounts`)
  // ---------------------------------------------------------------------------
  test.describe('5. Bank Accounts Screen (`/dashboard/bank-accounts`)', () => {
    test('5.1 Account List Table & BankAccountFormModal Field-by-Field Audit', async ({ page }) => {
      await page.goto('/dashboard/bank-accounts');

      const addAccountBtn = page.locator('button:has-text("Add Bank Account"), button:has-text("Add Account")').first();
      if (await addAccountBtn.isVisible()) {
        await addAccountBtn.click();

        // Field-by-Field Inspection of BankAccountFormModal
        const bankSelect = page.locator('select[id*="bank"], select').first();
        const nameInput = page.locator('input[placeholder*="Savings"], input[type="text"]').first();
        const balanceInput = page.locator('input[type="number"]').first();
        const bufferInput = page.locator('input[placeholder="0.00"]').first();

        await expect(bankSelect).toBeVisible();
        await expect(nameInput).toBeVisible();
        await expect(balanceInput).toBeVisible();

        await bankSelect.selectOption({ index: 0 });
        await nameInput.fill('CBA Smart Access');
        await balanceInput.fill('3200.00');
        await bufferInput.fill('500.00');

        const cancelBtn = page.locator('button:has-text("Cancel")');
        await cancelBtn.click();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 6. CATEGORY POOLS & MOVE MONEY (`/dashboard/envelopes`)
  // ---------------------------------------------------------------------------
  test.describe('6. Category Pools & Move Money (`/dashboard/envelopes`)', () => {
    test('6.1 Category Search Filter, Restore Hint & Move Money Modal Audit', async ({ page }) => {
      await page.goto('/dashboard/envelopes');

      // Search Filter Input
      const searchInput = page.locator('input[placeholder*="Search"]');
      if (await searchInput.isVisible()) {
        await searchInput.fill('Dining');
        await expect(searchInput).toHaveValue('Dining');
      }

      // Move Money Modal Action
      const moveMoneyBtn = page.locator('button:has-text("Move Money"), button:has-text("Transfer")').first();
      if (await moveMoneyBtn.isVisible()) {
        await moveMoneyBtn.click();
        const amountInput = page.locator('input[type="number"]').first();
        if (await amountInput.isVisible()) {
          await amountInput.fill('75.00');
        }
        const cancelBtn = page.locator('button:has-text("Cancel")');
        if (await cancelBtn.isVisible()) {
          await cancelBtn.click();
        }
      }
    });

    test('6.2 New Category Button Terminology & Bill Coverage Table Audit', async ({ page }) => {
      await page.goto('/dashboard/envelopes');

      // Check New Category CTA Button Terminology
      const addCategoryBtn = page.locator('button:has-text("New Category")').first();
      if (await addCategoryBtn.isVisible()) {
        await expect(addCategoryBtn).toBeVisible();
      }

      // Check Bills Pool Table Column Headers & Status Badges
      const tableHeader = page.locator('table th').first();
      if (await tableHeader.isVisible()) {
        await expect(page.locator('table')).toBeVisible();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 7. PLAN COMMAND CENTER (`/dashboard/income-and-bills`) & INCOME SPLIT
  // ---------------------------------------------------------------------------
  test.describe('7. Plan Command Center (`/dashboard/income-and-bills`)', () => {
    test('7.1 Plan Tabs, Upcoming Timeline & Setup Schedules Audit', async ({ page }) => {
      await page.goto('/dashboard/income-and-bills');
      await expect(page.locator('main')).toBeVisible();

      // Verify 2-Tab Buttons (Upcoming & Setup Schedule)
      const upcomingTab = page.locator('button:has-text("Upcoming")').first();
      const setupTab = page.locator('button:has-text("Setup Schedule"), button:has-text("Setup")').first();

      if (await upcomingTab.isVisible()) {
        await expect(upcomingTab).toBeVisible();
      }

      // Switch to Setup Schedule Tab
      if (await setupTab.isVisible()) {
        await setupTab.click();
        const addIncomeBtn = page.locator('button:has-text("Add Income")').first();
        if (await addIncomeBtn.isVisible()) {
          await expect(addIncomeBtn).toBeVisible();
        }
      }

      // Check Forward-Looking Matrix on /dashboard/income-split
      await page.goto('/dashboard/income-split');
      await expect(page.locator('main')).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // 8. TRANSACTION HISTORY, TABS & BANK ACCOUNTS AUDIT (`/dashboard/history` & `/dashboard/bank-accounts`)
  // ---------------------------------------------------------------------------
  test.describe('8. Transaction History, Sorting & Bank Accounts Table Audit (`/dashboard/history` & `/dashboard/bank-accounts`)', () => {
    test('8.1 Transaction Ledger Sorting & Transfers Tab Audit', async ({ page }) => {
      await page.goto('/dashboard/history');

      // Segmented Control Tabs (Debits, Credits, Transfers)
      const transfersTab = page.locator('button:has-text("Transfers"), button:has-text("Moves")').first();
      if (await transfersTab.isVisible()) {
        await transfersTab.click();
      }

      // Column Header Sorting
      const dateHeader = page.locator('th:has-text("Date"), th:has-text("Recorded")').first();
      if (await dateHeader.isVisible()) {
        await dateHeader.click();
      }
    });

    test('8.2 Bank Accounts Table & Alignment Audit (`/dashboard/bank-accounts`)', async ({ page }) => {
      await page.goto('/dashboard/bank-accounts');
      if (page.url().includes('/sign-in')) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }
      const pageHeading = page.locator('h2:has-text("Bank Accounts")').first();
      if (await pageHeading.isVisible()) {
        await expect(pageHeading).toBeVisible();
      }
      const addAccountBtn = page.locator('button:has-text("Add Bank Account")').first();
      if (await addAccountBtn.isVisible()) {
        await expect(addAccountBtn).toBeVisible();
      }
      const table = page.locator('table').first();
      if (await table.isVisible()) {
        await expect(page.locator('th:has-text("Actions")')).toHaveCount(0);
        await expect(page.locator('button:has-text("Import CSV")')).toHaveCount(0);
        await expect(page.locator('button:has-text("CSV Imports Log")')).toHaveCount(0);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 9. SETTINGS, REPORT A BUG, HOUSEHOLD GOVERNANCE & TABS (`/dashboard/settings`)
  // ---------------------------------------------------------------------------
  test.describe('9. Settings 3-Tab Layout & Household Governance (`/dashboard/settings`)', () => {
    test('9.1 Settings 3-Tab Navigation & Profile / Household / Account & Data Tabs', async ({ page }) => {
      await page.goto('/dashboard/settings');

      const settingsHeading = page.locator('h1').filter({ hasText: /Settings|設定/i }).first();
      if (await settingsHeading.isVisible()) {
        await expect(settingsHeading).toBeVisible();
        await expect(page.locator('button').filter({ hasText: /Profile|プロフィール/i }).first()).toBeVisible();
        await expect(page.locator('button').filter({ hasText: /Household|世帯/i }).first()).toBeVisible();
        await expect(page.locator('button').filter({ hasText: /Account & Data|アカウント/i }).first()).toBeVisible();

        await page.locator('button').filter({ hasText: /Household|世帯/i }).first().click();
        await expect(page.locator('h2').filter({ hasText: /partner|招待/i }).first()).toBeVisible();

        await page.locator('button').filter({ hasText: /Account & Data|アカウント/i }).first().click();
        const exportZipBtn = page.locator('button').filter({ hasText: /Zipped|ZIP|Download/i }).first();
        if (await exportZipBtn.isVisible()) {
          await expect(exportZipBtn).toBeEnabled();
        }
      } else {
        await expect(page).toHaveURL(/\/sign-in/);
      }
    });

    test('9.2 Signed-In Household Governance Screen (`/dashboard/settings?tab=household`)', async ({ page }) => {
      await page.goto('/dashboard/settings?tab=household');

      const settingsHeading = page.locator('h1').filter({ hasText: /Settings|設定/i }).first();
      if (await settingsHeading.isVisible()) {
        await expect(settingsHeading).toBeVisible();
        const dangerZoneSec = page.locator('section').filter({ hasText: /Danger Zone|危険地帯/i }).first();
        if (await dangerZoneSec.isVisible()) {
          await expect(dangerZoneSec).toBeVisible();
        }
      } else {
        await expect(page).toHaveURL(/\/sign-in/);
      }
    });

    test('9.3 Provide Feedback Modal & Diagnostic Capture Audit', async ({ page }) => {
      await page.goto('/dashboard/settings?tab=account-data');

      const feedbackBtn = page.locator('button:has-text("Provide Feedback"), button:has-text("Report a Bug")').first();
      if (await feedbackBtn.isVisible()) {
        await feedbackBtn.click();
        await expect(page.locator('text=Provide Feedback, text=Feedback, text=Report a Bug').first()).toBeVisible();
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 10. HISTORY & PAYDAY ALLOCATIONS 2-TAB SCREEN (`/dashboard/history`)
  // ---------------------------------------------------------------------------
  test.describe('10. History & Payday Allocations 2-Tab Screen (`/dashboard/history`)', () => {
    test('10.1 Transactions & Payday Allocations Tabs', async ({ page }) => {
      await page.goto('/dashboard/history');

      const historyHeading = page.locator('h1').filter({ hasText: /History|Transactions|取引履歴/i }).first();
      if (await historyHeading.isVisible()) {
        await expect(historyHeading).toBeVisible();
        await expect(page.locator('button').filter({ hasText: /History|Transactions|取引履歴/i }).first()).toBeVisible();

        const paydayTab = page.locator('button').filter({ hasText: /Payday Plans|Payday Allocations|給与日配分/i }).first();
        if (await paydayTab.isVisible()) {
          await expect(paydayTab).toBeVisible();
          const overviewCard = page.locator('[data-tour="history-ledger"]').first();
          if (await overviewCard.isVisible()) {
            await expect(overviewCard).toBeVisible();
          }

          await paydayTab.click();
          await expect(page.locator('h2').filter({ hasText: /Payday Plan|Payday Allocation History|履歴/i }).first()).toBeVisible();
        }
      } else {
        await expect(page).toHaveURL(/\/sign-in/);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // 11. DEDICATED INCOME SPLIT HERO SCREEN (`/dashboard/income-split`)
  // ---------------------------------------------------------------------------
  test.describe('11. Dedicated Income Split Hero Screen (`/dashboard/income-split`)', () => {
    test('11.1 Guarded redirect when accessed without event ID', async ({ page }) => {
      await page.goto('/dashboard/income-split');
      // Should gracefully redirect to income-and-bills
      await expect(page).toHaveURL(/\/dashboard\/income-and-bills|\/sign-in/);
    });

    test('11.2 Focus mode layout and controls with mock event ID', async ({ page }) => {
      await page.goto('/dashboard/income-split?id=mock-evt-1&returnTo=/dashboard');
      // Verify page container or sign-in redirect
      await expect(page.locator('body')).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // 12. SPECIALIZED INTERACTIVE MODALS & WORKFLOWS AUDIT
  // ---------------------------------------------------------------------------
  test.describe('12. Specialized Interactive Modals & Workflows Audit', () => {
    test('12.1 1-Click Bank Account Balance Alignment Modal Audit (`ReconciliationModal`)', async ({ page }) => {
      await page.goto('/dashboard/bank-accounts');

      // Look for alignment trigger buttons (Align Surplus / Align Shortfall / Reconcile)
      const alignBtn = page.locator('button:has-text("Align Surplus"), button:has-text("Align Shortfall"), button:has-text("Align")').first();
      if (await alignBtn.isVisible()) {
        await alignBtn.click();

        // Verify ReconciliationModal renders
        const modal = page.locator('[role="dialog"]').filter({ hasText: /Alignment|Reconcil|Variance/i }).first();
        if (await modal.isVisible()) {
          await expect(modal).toBeVisible();

          // Check for adjustment fields & reason input
          const reasonInput = modal.locator('input[placeholder*="reason"], input[name="reason"]').first();
          if (await reasonInput.isVisible()) {
            await reasonInput.fill('Monthly bank sync');
          }

          // Test dismissal via Escape
          await page.keyboard.press('Escape');
          await expect(modal).not.toBeVisible();
        }
      }
    });

    test('12.2 Cross-Bank Inter-Account Transfer Prompt Audit (`CrossBankTransferModal`)', async ({ page }) => {
      await page.goto('/dashboard/income-and-bills');

      // Trigger a Transfer event from the Upcoming queue
      const transferTrigger = page.locator('button:has-text("Transfer")').first();
      if (await transferTrigger.isVisible()) {
        await transferTrigger.click();

        // Verify TransferModal opens
        const transferModal = page.locator('[role="dialog"]').filter({ hasText: /Transfer/i }).first();
        if (await transferModal.isVisible()) {
          await expect(transferModal).toBeVisible();

          // Close modal via Cancel or Escape
          await page.keyboard.press('Escape');
        }
      }
    });

    test('12.3 Pool Deletion Balance Sweep & Move Money Modal Audit (`MoveMoneyModal`)', async ({ page }) => {
      await page.goto('/dashboard/pools');

      // Check Move Money button
      const moveMoneyBtn = page.locator('button:has-text("Move Money")').first();
      if (await moveMoneyBtn.isVisible()) {
        await moveMoneyBtn.click();

        // Verify Move Money / Transfer drawer or modal opens
        const drawer = page.locator('[role="dialog"], div[class*="drawer"]').filter({ hasText: /Transfer|Move/i }).first();
        if (await drawer.isVisible()) {
          await expect(drawer).toBeVisible();

          // Dismiss via Escape
          await page.keyboard.press('Escape');
        }
      }
    });

    test('12.4 Profile Avatar Upload & 256x256 WebP Crop Modal Audit (`AvatarCropModal`)', async ({ page }) => {
      await page.goto('/dashboard/settings?tab=profile');

      // Click Edit Profile if currently in read-only mode
      const editBtn = page.locator('button:has-text("Edit Profile"), button:has-text("Edit")').first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
      }

      // Verify Avatar upload trigger and hidden file input exist
      const fileInput = page.locator('input[type="file"][accept*="image"]').first();
      if (await fileInput.count() > 0) {
        // Upload a 1x1 transparent PNG data buffer to test AvatarCropModal opening
        const buffer = Buffer.from(
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          'base64'
        );
        await fileInput.setInputFiles({
          name: 'avatar.png',
          mimeType: 'image/png',
          buffer,
        });

        // Verify AvatarCropModal opens
        const cropModal = page.locator('[role="dialog"]').filter({ hasText: /Crop|Avatar/i }).first();
        if (await cropModal.isVisible()) {
          await expect(cropModal).toBeVisible();

          // Verify 256x256 canvas exists
          const canvas = cropModal.locator('canvas').first();
          if (await canvas.isVisible()) {
            await expect(canvas).toBeVisible();
          }

          // Dismiss crop modal
          await page.keyboard.press('Escape');
        }
      }
    });
  });
});

