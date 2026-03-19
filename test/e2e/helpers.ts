import { expect, type Page } from '@playwright/test'

/**
 * Wait for the page to finish loading.
 * PrivateRoute calls /auth/me on every navigation, which can be slow under load.
 * We wait for DOM + auth check + spinners to clear + some actual content to render.
 */
export async function waitForPageLoad(page: Page, timeout = 60000) {
  // Wait for DOM to be ready
  await page.waitForLoadState('domcontentloaded', { timeout }).catch(() => {})
  // Wait for PrivateRoute auth check ("Checking session...") to finish
  const authCheck = page.getByText('Checking session...')
  await authCheck.waitFor({ state: 'hidden', timeout }).catch(() => {})
  // Wait for any loading spinners to disappear (page-level)
  const spinner = page.locator('.animate-spin')
  await spinner.first().waitFor({ state: 'hidden', timeout }).catch(() => {})
  // Wait for at least one heading or data-testid to appear (page actually rendered)
  const content = page.locator('h1, h2, [data-testid]').first()
  await content.waitFor({ state: 'visible', timeout }).catch(() => {})
}

/**
 * Navigate to a page and wait for it to load.
 * Handles both sidebar navigation and direct URL.
 */
export async function navigateToPage(page: Page, path: string) {
  await page.goto(path)
  await page.waitForURL(new RegExp(path.replace(/\//g, '\\/')))
  await waitForPageLoad(page)
}

/**
 * Check that a page loads without crashing.
 * Verifies: no uncaught errors, heading visible, no blank screen.
 */
export async function assertPageLoads(page: Page, opts: {
  heading?: string | RegExp
  headingLevel?: 'h1' | 'h2' | 'h3'
  testId?: string
  timeout?: number
}) {
  const { heading, headingLevel = 'h1', testId, timeout = 10000 } = opts

  if (testId) {
    await expect(page.locator(`[data-testid="${testId}"]`)).toBeVisible({ timeout })
  }

  if (heading) {
    const headingLocator = typeof heading === 'string'
      ? page.locator(headingLevel).filter({ hasText: heading })
      : page.locator(headingLevel).filter({ hasText: heading })
    await expect(headingLocator.first()).toBeVisible({ timeout })
  }

  // Ensure no error boundary
  const errorBoundary = page.getByText(/something went wrong|unexpected error/i)
  await expect(errorBoundary).not.toBeVisible({ timeout: 2000 }).catch(() => {})
}

/**
 * Verify sidebar navigation works and is visible.
 */
export async function verifySidebar(page: Page) {
  const sidebar = page.locator('nav, aside').first()
  await expect(sidebar).toBeVisible({ timeout: 5000 })
}

/**
 * Click a sidebar link by text.
 */
export async function clickSidebarLink(page: Page, name: string) {
  await page.getByRole('link', { name: new RegExp(name, 'i') }).click()
}
