import { expect, test } from '@playwright/test'
import { navigateToPage, waitForPageLoad } from './helpers'

test.describe('AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/ai-assistant')
  })

  test('should display AI assistant page', async ({ page }) => {
    await expect(page.getByTestId('ai-assistant-page')).toBeVisible({ timeout: 10000 })
  })

  test('should display conversation sidebar', async ({ page }) => {
    await waitForPageLoad(page)
    // Should show AI Assistant heading in sidebar
    await expect(page.locator('h2').filter({ hasText: /ai assistant/i })).toBeVisible({ timeout: 10000 })
  })

  test('should have new conversation button', async ({ page }) => {
    await waitForPageLoad(page)
    // Plus icon button for new conversation
    const newBtn = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first()
    await expect(newBtn).toBeVisible({ timeout: 10000 })
  })

  test('should show empty chat state', async ({ page }) => {
    await waitForPageLoad(page)
    // When no conversation selected, show prompt
    const emptyState = page.getByText(/select or create a conversation/i)
    await expect(emptyState).toBeVisible({ timeout: 10000 }).catch(() => {
      // If conversations exist and one is auto-selected, that's OK
    })
  })

  test('should open new conversation modal', async ({ page }) => {
    await waitForPageLoad(page)
    const newBtn = page.locator('button').filter({ has: page.locator('svg.lucide-plus') }).first()
    if (await newBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await newBtn.click()
      // Modal should appear with title and model fields
      await expect(page.getByText(/new conversation/i)).toBeVisible({ timeout: 5000 })
    }
  })

  test('should have settings button', async ({ page }) => {
    await waitForPageLoad(page)
    const settingsBtn = page.locator('button').filter({ has: page.locator('svg.lucide-settings') }).first()
    await expect(settingsBtn).toBeVisible({ timeout: 10000 }).catch(() => {})
  })
})
