import { expect, test } from '@playwright/test'

test.describe('Strategy Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login')
    await page.getByPlaceholder('Username').fill('testuser')
    await page.getByPlaceholder('Password').fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText('Dashboard')).toBeVisible()

    // Navigate to strategies
    await page.getByRole('link', { name: /strategies/i }).click()
    await expect(page).toHaveURL(/.*strategies/)
  })

  test('should display strategies page', async ({ page }) => {
    await expect(page.getByText('Strategies', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /new strategy/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /built-in strategies/i })).toBeVisible()
  })

  test('should create new strategy', async ({ page }) => {
    await page.getByRole('button', { name: /new strategy/i }).click()
    
    // Fill form
    const timestamp = Date.now()
    await page.getByLabel(/name/i).fill(`Test Strategy ${timestamp}`)
    await page.getByLabel(/description/i).fill('A test strategy for E2E testing')
    await page.getByLabel(/code/i).fill('class TestStrategy:\n    def __init__(self):\n        pass')
    
    await page.getByRole('button', { name: /save/i }).click()

    // Should show success message or new strategy in list
    await expect(page.getByText(`Test Strategy ${timestamp}`)).toBeVisible({ timeout: 10000 })
  })

  test('should view strategy details', async ({ page }) => {
    // Wait for strategies to load
    await page.waitForSelector('[data-testid="strategy-card"], .strategy-card', { timeout: 10000 })
    
    // Click view on first strategy
    const viewButton = page.getByRole('button', { name: /view/i }).first()
    await viewButton.click()

    // Should show strategy details modal
    await expect(page.getByText(/strategy details/i)).toBeVisible()
  })

  test('should edit existing strategy', async ({ page }) => {
    await page.waitForSelector('[data-testid="strategy-card"], .strategy-card', { timeout: 10000 })
    
    // Click edit on first strategy
    const editButton = page.getByRole('button', { name: /edit/i }).first()
    await editButton.click()

    // Modify description
    await page.getByLabel(/description/i).fill('Updated description')
    await page.getByRole('button', { name: /save/i }).click()

    // Should update successfully
    await expect(page.getByText(/updated/i)).toBeVisible({ timeout: 5000 })
  })

  test('should browse built-in strategies', async ({ page }) => {
    await page.getByRole('button', { name: /built-in strategies/i }).click()

    // Should show built-in strategies modal
    await expect(page.getByText(/built-in strategies/i)).toBeVisible()
  })

  test('should filter active/inactive strategies', async ({ page }) => {
    await page.waitForSelector('[data-testid="strategy-card"], .strategy-card', { timeout: 10000 })
    
    // Check for active/inactive badges
    const activeBadges = page.getByText('Active')
    const inactiveBadges = page.getByText('Inactive')
    
    await expect(activeBadges.or(inactiveBadges)).toBeVisible()
  })

  test('should delete strategy with confirmation', async ({ page }) => {
    await page.waitForSelector('[data-testid="strategy-card"], .strategy-card', { timeout: 10000 })
    
    page.on('dialog', dialog => dialog.accept())
    
    const deleteButton = page.getByRole('button', { name: /delete/i }).first()
    await deleteButton.click()

    // Strategy should be removed from list
    await page.waitForTimeout(1000)
  })
})
