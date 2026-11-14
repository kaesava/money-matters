import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

export const isAuthenticatedE2E = process.env.E2E_AUTHENTICATED === "1";

type BrowserStorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

let cachedAuthStatePromise: Promise<BrowserStorageState> | null = null;

async function signInOnce(browser: Browser): Promise<BrowserStorageState> {
  const email = process.env.E2E_EMAIL;
  const password = process.env.E2E_PASSWORD;
  if (!email || !password) {
    throw new Error(
      "E2E_AUTHENTICATED=1 requires E2E_EMAIL and E2E_PASSWORD environment variables for a verified test account."
    );
  }

  const baseURL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
  const tempContext = await browser.newContext({ baseURL });
  const tempPage = await tempContext.newPage();

  try {
    await tempPage.goto("/sign-in");
    await tempPage.locator("#signin-email").fill(email);
    await tempPage.locator("#signin-password").fill(password);
    await tempPage.locator('button[type="submit"]').first().click();

    await tempPage.waitForURL(
      (url) => !url.pathname.startsWith("/sign-in") && !url.pathname.startsWith("/auth-callback"),
      { timeout: 20000 }
    );
    await expect(tempPage.locator("body")).toBeVisible();
    return await tempContext.storageState();
  } finally {
    await tempContext.close();
  }
}

/**
 * Populates the Playwright test context with an authenticated session when
 * `E2E_AUTHENTICATED=1`. Signs in once per Playwright worker and replays cookies
 * + origin localStorage into each isolated test context.
 */
export async function ensureAuthenticatedSession(page: Page, browser: Browser): Promise<void> {
  if (!isAuthenticatedE2E) return;

  if (!cachedAuthStatePromise) {
    cachedAuthStatePromise = signInOnce(browser).catch((err) => {
      cachedAuthStatePromise = null;
      throw err;
    });
  }

  const state = await cachedAuthStatePromise;
  const context = page.context();

  if (state.cookies.length > 0) {
    await context.addCookies(state.cookies);
  }

  if (state.origins.length > 0) {
    await context.addInitScript((origins) => {
      for (const entry of origins) {
        if (window.location.origin === entry.origin) {
          for (const item of entry.localStorage) {
            window.localStorage.setItem(item.name, item.value);
          }
        }
      }
    }, state.origins);
  }
}
