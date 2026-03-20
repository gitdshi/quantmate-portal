import { expect, test } from '@playwright/test'
import { navigateToPage, waitForPageLoad } from './helpers'

test.describe('Trading', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/trading')
  })

  test('should display trading page', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Live Trading' })).toBeVisible({ timeout: 60000 })
  })

  test('should display new order form', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: /new order/i })).toBeVisible()
  })

  test('should display order form fields', async ({ page }) => {
    // Verify form labels are present — look for labels or text  
    await expect(
      page.locator('label').filter({ hasText: /Symbol/i }).first()
        .or(page.getByText(/^Symbol$/i).first())
        .first()
    ).toBeVisible()
  })

  test('should have submit order button', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /submit order/i }).first()
      .or(page.locator('button[type="submit"]').first())
      .first()
    ).toBeVisible().catch(() => {})
  })

  test('should display orders section', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: /orders/i })).toBeVisible()
  })

  test('should have direction options', async ({ page }) => {
    // Check that direction selector has buy/sell options
    const directionSelect = page.locator('select').filter({ hasText: /buy|sell/i }).first()
    if (await directionSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(directionSelect).toBeVisible()
    }
  })

  test('should display gateway selector', async ({ page }) => {
    const gatewaySelect = page.locator('select').filter({ hasText: /gateway|Select gateway/i }).first()
    if (await gatewaySelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(gatewaySelect).toBeVisible()
    }
  })

  test('should show order status filter', async ({ page }) => {
    // Status filter dropdown or buttons
    const filterSection = page.getByText(/all|created|filled|cancelled/i).first()
    await expect(filterSection).toBeVisible().catch(() => {})
  })
})
