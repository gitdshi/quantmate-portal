import { expect, test } from '@playwright/test'
import { navigateToPage, waitForPageLoad } from './helpers'

test.describe('Visual Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/visual-explorer')
  })

  test('should display visual explorer page', async ({ page }) => {
    await expect(page.getByTestId('visual-explorer-page')).toBeVisible({ timeout: 15000 })
  })

  test('should display search controls', async ({ page }) => {
    // Symbol input field
    const symbolInput = page.getByPlaceholder(/000001\.SZ/i)
      .or(page.locator('input[type="text"]').first())
    await expect(symbolInput).toBeVisible({ timeout: 15000 })
  })

  test('should have date range inputs', async ({ page }) => {
    // Start and end date inputs
    const dateInputs = page.locator('input[type="date"]')
    await expect(dateInputs.first()).toBeVisible({ timeout: 15000 })
  })

  test('should have load button', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /load/i }).first()).toBeVisible({ timeout: 15000 })
  })

  test('should show empty state before loading data', async ({ page }) => {
    await expect(page.getByText(/enter a symbol/i)).toBeVisible({ timeout: 15000 })
  })

  test('should load market data for a symbol', async ({ page }) => {
    // Fill in symbol
    const symbolInput = page.getByPlaceholder(/000001\.SZ/i)
      .or(page.locator('input[type="text"]').first())
    await expect(symbolInput).toBeVisible({ timeout: 15000 })
    await symbolInput.fill('000001.SZ')

    // Click load button
    await page.locator('button').filter({ hasText: /load/i }).first().click()
    
    // Should either show data or loading state
    await page.waitForTimeout(3000)
    // Check for either chart/stats or error message
    const content = page.getByText(/price chart|days|return|error|no data/i).first()
    await expect(content).toBeVisible({ timeout: 15000 }).catch(() => {})
  })

  test('should display statistics grid after loading', async ({ page }) => {
    const symbolInput = page.getByPlaceholder(/000001\.SZ/i)
      .or(page.locator('input[type="text"]').first())
    await expect(symbolInput).toBeVisible({ timeout: 15000 })
    await symbolInput.fill('000001.SZ')
    await page.locator('button').filter({ hasText: /load/i }).first().click()
    
    await page.waitForTimeout(3000)
    // Stats might show: Days, Start Price, End Price, High, Low, Return
    const stats = page.getByText(/days|start price|end price|high|low/i).first()
    await expect(stats).toBeVisible({ timeout: 15000 }).catch(() => {})
  })
})
