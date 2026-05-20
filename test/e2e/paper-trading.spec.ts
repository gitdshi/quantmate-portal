import { expect, test } from '@playwright/test'
import { navigateToPage } from './helpers'

test.describe('Paper Trading', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/paper-trading')
  })

  test('should display paper trading overview page', async ({ page }) => {
    await expect(page.getByTestId('paper-trading-overview')).toBeVisible({ timeout: 60000 })
    await expect(page.getByRole('heading', { level: 1, name: /Paper Trading|模拟交易/i })).toBeVisible()
  })

  test('should show overview actions and account section', async ({ page }) => {
    await expect(page.getByRole('button', { name: /New Account|新建账户/i })).toBeVisible()
    await expect(page.getByText(/Paper Accounts|模拟账户|No paper accounts|Create one to start/i).first()).toBeVisible()
  })

  test('should navigate into account detail when an account is available', async ({ page }) => {
    const openButton = page.getByRole('button', { name: /Open|进入/i }).first()
    if (await openButton.isVisible().catch(() => false)) {
      await openButton.click()
      await expect(page).toHaveURL(/\/paper-trading\/\d+$/)
      await expect(page.getByText(/Deployed Strategies|已部署策略|Paper account not found|未找到该模拟账户/i).first()).toBeVisible()
      return
    }

    await expect(page.getByText(/No paper accounts|Create one to start|模拟账户/i).first()).toBeVisible()
  })
})
