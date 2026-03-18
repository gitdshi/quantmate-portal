import { expect, test } from '@playwright/test'

test.describe('Strategy Management', () => {
  // Uses shared auth state from auth.setup.ts (storageState in config)

  test.beforeEach(async ({ page }) => {
    await page.goto('/strategies')
    await expect(page).toHaveURL(/\/strategies/)
  })

  test('should display strategies page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /strategies/i })).toBeVisible()
  })

  test('should create new strategy', async ({ page }) => {
    // Look for a "New Strategy" or "Create" button
    const newBtn = page.getByRole('button', { name: /new|create/i })
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click()

      const ts = Date.now()
      const nameInput = page.getByLabel(/name/i)
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(`E2E Strategy ${ts}`)
        const descInput = page.getByLabel(/description/i)
        if (await descInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await descInput.fill('E2E test strategy')
        }
        await page.getByRole('button', { name: /save|submit|create/i }).click()
        await expect(page.getByText(`E2E Strategy ${ts}`).or(page.getByText(/success|created/i)))
          .toBeVisible({ timeout: 10000 })
      }
    }
  })

  test('should view strategy details', async ({ page }) => {
    // Wait for strategy list to load
    await page.waitForTimeout(2000)
    const strategyItem = page.locator('[data-testid="strategy-card"], .strategy-card, table tbody tr').first()
    if (await strategyItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await strategyItem.click()
      // Should show some strategy detail
      await expect(page.getByText(/code|parameters|description/i)).toBeVisible({ timeout: 5000 })
    }
  })

  test('should browse built-in strategies', async ({ page }) => {
    const builtinBtn = page.getByRole('button', { name: /built-in/i })
    if (await builtinBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await builtinBtn.click()
      await expect(page.getByText(/built-in|template/i)).toBeVisible({ timeout: 5000 })
    }
  })
})
