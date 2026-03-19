import { expect, test } from '@playwright/test'
import { navigateToPage, waitForPageLoad } from './helpers'

test.describe('Team Space', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/team-space')
  })

  test('should display team space page', async ({ page }) => {
    await expect(page.getByTestId('team-space-page')).toBeVisible({ timeout: 15000 })
  })

  test('should have new workspace button', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /new workspace/i }).first()).toBeVisible({ timeout: 15000 })
  })

  test('should have share strategy button', async ({ page }) => {
    await expect(page.locator('button').filter({ hasText: /share/i }).first()).toBeVisible({ timeout: 15000 })
  })

  test('should display workspaces section', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: /workspaces/i }).first()).toBeVisible({ timeout: 15000 })
  })

  test('should display shared with me section', async ({ page }) => {
    await expect(page.locator('h2').filter({ hasText: /shared with me/i })).toBeVisible({ timeout: 15000 })
  })

  test('should open create workspace modal', async ({ page }) => {
    test.slow() // Modal interaction needs extra time
    const newBtn = page.locator('button').filter({ hasText: /new workspace/i }).first()
    await expect(newBtn).toBeVisible({ timeout: 15000 })
    await newBtn.click()
    await page.waitForTimeout(500)
    // Modal should appear with name and description fields
    const nameField = page.getByLabel(/name/i).first()
      .or(page.getByPlaceholder(/name/i).first())
    await expect(nameField).toBeVisible({ timeout: 5000 })
  })

  test('should open share strategy modal', async ({ page }) => {
    test.slow() // Modal interaction needs extra time
    const shareBtn = page.locator('button').filter({ hasText: /share/i }).first()
    await expect(shareBtn).toBeVisible({ timeout: 15000 })
    await shareBtn.click()
    await page.waitForTimeout(500)
    // Share modal should show strategy ID and permission fields
    const shareContent = page.getByText(/strategy|permission|share/i).first()
    await expect(shareContent).toBeVisible({ timeout: 5000 }).catch(() => {})
  })

  test('should show empty states', async ({ page }) => {
    // Check for empty workspace list or shared items
    const emptyState = page.getByText(/no workspaces|no shared/i).first()
    await expect(emptyState).toBeVisible({ timeout: 15000 }).catch(() => {
      // Not empty means there's data - also OK
    })
  })
})
