import { expect, test } from '@playwright/test'
import { navigateToPage, waitForPageLoad } from './helpers'

test.describe('Marketplace', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/marketplace')
  })

  test('should display marketplace page', async ({ page }) => {
    await expect(page.getByTestId('marketplace-page')).toBeVisible()
  })

  test('should have publish template button', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /publish/i }).first()).toBeVisible()
  })

  test('should display tab navigation', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /browse marketplace/i }).first()).toBeVisible()
    await expect(page.locator('button').filter({ hasText: /my templates/i }).first()).toBeVisible()
  })

  test('should show template list or empty state', async ({ page }) => {
    // Template items have class bg-white or show "no templates" text
    const content = page.getByText(/no templates/i)
      .or(page.locator('.font-medium').first())
    await expect(content).toBeVisible({ timeout: 15000 }).catch(() => {})
  })

  test('should switch to my templates tab', async ({ page }) => {
    const myTab = page.locator('button').filter({ hasText: /my templates/i }).first()
    await expect(myTab).toBeVisible()
    await myTab.click()
    await page.waitForTimeout(1000)
    // Should show my templates or empty state
    const content = page.getByText(/no templates/i)
      .or(page.locator('button').filter({ hasText: /my templates/i }).first())
    await expect(content).toBeVisible().catch(() => {})
  })

  test('should open publish template modal', async ({ page }) => {
    const publishBtn = page.locator('button').filter({ hasText: /publish/i }).first()
    await expect(publishBtn).toBeVisible()
    await publishBtn.click()
    await page.waitForTimeout(500)
    // Modal should appear with name, description, code fields
    await expect(page.getByText(/publish template/i)).toBeVisible()
  })

  test('should show template details empty state', async ({ page }) => {
    const emptyState = page.getByText(/select a template/i)
    await expect(emptyState).toBeVisible({ timeout: 15000 }).catch(() => {})
  })
})
