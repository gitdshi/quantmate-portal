import { expect, test } from '@playwright/test'
import { navigateToPage } from './helpers'

test.describe('Team Space', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/team-space')
  })

  test('should display team space page', async ({ page }) => {
    await expect(page.getByTestId('team-space-page')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: /team space/i })).toBeVisible({ timeout: 15000 })
  })

  test('should default to the workspaces tab', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^workspaces$/i })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h2').filter({ hasText: /^workspaces$/i }).first()).toBeVisible({ timeout: 15000 })
  })

  test('should switch between workspaces and sharing tabs', async ({ page }) => {
    await page.getByRole('button', { name: /^strategy sharing$/i }).click()

    await expect(page.locator('h2').filter({ hasText: /shared with me/i }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h2').filter({ hasText: /sent shares/i }).first()).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/tab=sharing/)

    await page.getByRole('button', { name: /^workspaces$/i }).click()
    await expect(page.locator('h2').filter({ hasText: /^workspaces$/i }).first()).toBeVisible({ timeout: 15000 })
  })

  test('should respect sharing tab in the URL', async ({ page }) => {
    await navigateToPage(page, '/team-space?tab=sharing')

    await expect(page.locator('h2').filter({ hasText: /shared with me/i }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h2').filter({ hasText: /sent shares/i }).first()).toBeVisible({ timeout: 15000 })
  })

  test('should open create workspace modal', async ({ page }) => {
    await page.getByRole('button', { name: /create workspace/i }).click()

    await expect(page.getByRole('heading', { name: /create workspace/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByPlaceholder(/quant research team/i)).toBeVisible({ timeout: 15000 })
    await expect(page.getByPlaceholder(/describe this workspace/i)).toBeVisible({ timeout: 15000 })
  })

  test('should open share strategy modal', async ({ page }) => {
    await navigateToPage(page, '/team-space?tab=sharing')

    await page.getByRole('button', { name: /share strategy/i }).first().click()

    await expect(page.getByRole('heading', { name: /share strategy/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/share target/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/permission/i).first()).toBeVisible({ timeout: 15000 })
  })

  test('should expose top-level actions in both modes', async ({ page }) => {
    await expect(page.getByRole('button', { name: /create workspace/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /share strategy/i }).first()).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: /^strategy sharing$/i }).click()
    await expect(page.getByRole('button', { name: /share strategy/i }).first()).toBeVisible({ timeout: 15000 })
  })
})
