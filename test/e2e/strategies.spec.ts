import { expect, test } from '@playwright/test'

test.describe('Strategy Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/strategies')
    await expect(page).toHaveURL(/\/strategies/)
  })

  test('renders the strategies workspace shell', async ({ page }) => {
    await expect(page.getByTestId('strategies-page')).toBeVisible()
    await expect(page.getByTestId('strategies-list')).toBeVisible()
    await expect(page.getByTestId('strategy-detail')).toBeVisible()
    await expect(page.getByTestId('create-strategy-button')).toBeVisible()
  })

  test('opens the create modal and creates a draft locally', async ({ page }) => {
    await page.getByTestId('create-strategy-button').click()
    await expect(page.getByTestId('create-strategy-confirm')).toBeVisible()

    await page.getByTestId('create-strategy-confirm').click()
    await expect(page.getByTestId('strategy-code-panel')).toBeVisible()
    await expect(page.getByTestId('strategy-name-input')).toBeVisible()
  })

  test('opens the template library and preview panel', async ({ page }) => {
    await page.getByRole('button', { name: /templates|模板/i }).click()
    await expect(page.getByTestId('strategy-templates-grid')).toBeVisible()

    const previewTrigger = page.getByRole('button', { name: /preview|预览/i }).first()
    await previewTrigger.click()

    await expect(page.getByTestId('template-preview-panel')).toBeVisible()
  })
})
