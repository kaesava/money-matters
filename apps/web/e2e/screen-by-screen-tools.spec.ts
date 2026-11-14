import { test, expect } from "@playwright/test";
import { ensureAuthenticatedSession, isAuthenticatedE2E } from "./auth.helper";

test.describe("Screen-by-Screen Tools, Reports & Subscription E2E Suite", () => {
  test.beforeEach(async ({ page, browser }) => {
    await ensureAuthenticatedSession(page, browser);
  });

  // ---------------------------------------------------------------------------
  // 13. STANDALONE "CAN I AFFORD IT?" SIMULATOR (`/dashboard/afford-check`)
  // ---------------------------------------------------------------------------
  test.describe("13. Standalone Can I Afford It? Simulator (`/dashboard/afford-check`)", () => {
    test("13.1 One-Off & Ongoing Frequency Simulation Audit", async ({ page }) => {
      await page.goto("/dashboard/afford-check");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      await expect(page.locator("h1").filter({ hasText: /Can I Afford/i }).first()).toBeVisible();
      const amountInput = page.locator('input[inputmode="decimal"]').first();
      await expect(amountInput).toBeVisible();
      await amountInput.fill("250.00");

      const ongoingBtn = page.locator('button:has-text("Ongoing")').first();
      await expect(ongoingBtn).toBeVisible();
      await ongoingBtn.click();

      await expect(page.locator('button:has-text("Monthly")').first()).toBeVisible();
      await expect(page.locator('button:has-text("Fortnightly")').first()).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // 14. REPORTS & SPENDING ANALYTICS (`/dashboard/reports`)
  // ---------------------------------------------------------------------------
  test.describe("14. Reports & Spending Analytics (`/dashboard/reports`)", () => {
    test("14.1 Reports Tabs & Filters Audit", async ({ page }) => {
      await page.goto("/dashboard/reports");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      await expect(page.locator("h1").filter({ hasText: /^Reports$/i }).first()).toBeVisible();
      const spendingTab = page.locator('button:has-text("Spending & Cash Flow")').first();
      const paydayTab = page.locator('button:has-text("Payday Plans")').first();

      await expect(spendingTab).toBeVisible();
      await expect(paydayTab).toBeVisible();
      await expect(page.locator('button:has-text("Expenses Only")').first()).toBeVisible();

      await paydayTab.click();
      await expect(page.locator("select").first()).toBeVisible();
    });
  });

  // ---------------------------------------------------------------------------
  // 15. SUBSCRIPTION UPGRADE, MANAGE & SUCCESS (`/subscription/*`)
  // ---------------------------------------------------------------------------
  test.describe("15. Subscription & Billing Flows (`/subscription/*`)", () => {
    test("15.1 Subscription Upgrade Page Enforces Auth or Shows Plan Selector (`/subscription/upgrade`)", async ({ page }) => {
      await page.goto("/subscription/upgrade");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
        return;
      }

      await expect(page.locator("h1").first()).toBeVisible();
      await expect(page.locator("main, div").filter({ hasText: /Household/i }).first()).toBeVisible();
    });

    test("15.2 Subscription Manage & Success Pages (`/subscription/manage`, `/subscription/success`)", async ({ page }) => {
      await page.goto("/subscription/manage");
      if (!isAuthenticatedE2E) {
        await expect(page).toHaveURL(/\/sign-in/);
      } else {
        await expect(page.locator("body")).toBeVisible();
      }

      await page.goto("/subscription/success");
      await expect(page.locator("h1").first()).toBeVisible({ timeout: 5000 });
    });
  });
});
