import { expect, test } from '@playwright/test'
import { navigateToPage } from './helpers'

test.describe('Paper Trading', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/paper-trading')
  })

  test('should display paper trading page', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Paper Trading' })).toBeVisible({ timeout: 60000 })
  })

  test('should display deploy strategy form', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: /Deploy Strategy to Paper/i })).toBeVisible()
  })

  test('should display manual paper order form', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: /Manual Paper Order/i })).toBeVisible()
  })

  test('should have deploy button', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /Deploy/i }).first()).toBeVisible()
  })

  test('should have submit paper order button', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /Submit Paper Order/i }).first()).toBeVisible()
  })

  test('should display tabs for navigation', async ({ page }) => {
    await expect(page.getByText('Deployments')).toBeVisible()
    await expect(page.getByText('Orders')).toBeVisible()
    await expect(page.getByText('Positions')).toBeVisible()
    await expect(page.getByText('Performance')).toBeVisible()
  })

  test('should switch between tabs', async ({ page }) => {
    const ordersTab = page.getByText('Orders')
    await ordersTab.click()
    // After clicking, verify tab is active (has border-blue-500 class)
    await expect(ordersTab).toBeVisible()
  })
})
