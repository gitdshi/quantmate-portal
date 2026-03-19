import { expect, test } from '@playwright/test'
import { navigateToPage, waitForPageLoad } from './helpers'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/dashboard')
  })

  test('should display dashboard heading', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible()
  })

  test('should display stat cards', async ({ page }) => {
    // Should show the 4 stat cards
    await expect(page.getByText('Active Jobs')).toBeVisible()
    await expect(page.getByText('Queued Jobs')).toBeVisible()
    await expect(page.getByText('Completed')).toBeVisible()
    await expect(page.getByText('Failed')).toBeVisible()
  })

  test('should display queue status section', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: 'Queue Status' })).toBeVisible({ timeout: 10000 })
  })

  test('should display system status section', async ({ page }) => {
    await waitForPageLoad(page)
    await expect(page.locator('h2').filter({ hasText: 'System Status' })).toBeVisible()
  })

  test('should display data sync status section', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: /data sync/i })).toBeVisible()
  })

  test('should auto-refresh data', async ({ page }) => {
    test.slow() // This test waits for a full refresh cycle
    // Wait for initial load
    await waitForPageLoad(page)
    // The queue stats refresh every 5s, verify page stays stable after a refresh cycle
    await page.waitForTimeout(6000)
    // Page should still be functional
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible()
  })
})
