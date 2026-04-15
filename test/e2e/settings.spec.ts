import { expect, test, type Page } from '@playwright/test'
import { navigateToPage } from './helpers'

test.describe('Settings', () => {
  // Settings API (datasource-items) is genuinely slow (~50s).
  // Use serial mode so only ONE settings test loads the page at a time.
  test.describe.configure({ timeout: 180000, mode: 'serial' })

  test.beforeEach(async ({ page }) => {
    await navigateToPage(page, '/settings')
    // Wait for h1 "Settings" to appear — the page renders spinner ONLY
    // during loading (early return). h1 appears only after API completes.
    await expect(page.locator('h1').filter({ hasText: 'Settings' })).toBeVisible({ timeout: 150000 })
  })

  async function openSystemManagement(page: Page) {
    await page.getByRole('button', { name: /System Management|系统管理/i }).click()
    await expect(page.getByRole('button', { name: /Data Sources|数据源/i })).toBeVisible({ timeout: 60000 })
  }

  test('should display settings page', async ({ page }) => {
    await expect(page.locator('h1').filter({ hasText: 'Settings' })).toBeVisible()
  })

  test('should show nested system management tabs', async ({ page }) => {
    await openSystemManagement(page)
    await expect(page.getByRole('button', { name: /Data Sources|数据源/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Tushare Pro/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /System Status|系统状态/i })).toBeVisible()
  })

  test('should show datasource cards in system management', async ({ page }) => {
    await openSystemManagement(page)
    await expect(page.getByText(/Tushare Pro/i).first()).toBeVisible({ timeout: 60000 })
    await expect(page.getByText(/AkShare/i).first()).toBeVisible({ timeout: 60000 })
  })

  test('should show tushare catalog controls in dedicated tab', async ({ page }) => {
    await openSystemManagement(page)
    await page.getByRole('button', { name: /Tushare Pro/i }).click()

    await expect(page.getByText(/Tushare Pro API Catalog|Tushare Pro 接口目录/i)).toBeVisible({ timeout: 120000 })
    await expect(page.getByText(/Batch by permission|按权限批量操作/i)).toBeVisible({ timeout: 60000 })

    const categoryToggle = page.locator('button').filter({ hasText: /\(\d+\/\d+\)/ }).first()
    await expect(categoryToggle).toBeVisible({ timeout: 60000 })
    await categoryToggle.click()

    await expect(page.locator('button[role="switch"]').first()).toBeVisible({ timeout: 60000 })
  })

  test('should show system status in dedicated tab', async ({ page }) => {
    await openSystemManagement(page)
    await page.getByRole('button', { name: /System Status|系统状态/i }).click()

    await expect(page.getByText(/System status|系统状态/i)).toBeVisible({ timeout: 60000 })
  })
})
