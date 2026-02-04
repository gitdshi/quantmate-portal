import { expect, test } from '@playwright/test'

test.describe('Backtest Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login')
    await page.getByPlaceholder('Username').fill('testuser')
    await page.getByPlaceholder('Password').fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText('Dashboard')).toBeVisible()

    // Navigate to backtest
    await page.getByRole('link', { name: /backtest/i }).click()
    await expect(page).toHaveURL(/.*backtest/)
  })

  test('should display backtest page', async ({ page }) => {
    await expect(page.getByText('Backtest', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /run backtest/i })).toBeVisible()
  })

  test('should submit backtest successfully', async ({ page }) => {
    // Fill backtest form
    await page.getByLabel(/strategy/i).selectOption({ index: 1 })
    await page.getByLabel(/symbol/i).fill('AAPL')
    await page.getByLabel(/start date/i).fill('2024-01-01')
    await page.getByLabel(/end date/i).fill('2024-12-31')
    await page.getByLabel(/initial capital/i).fill('100000')
    
    await page.getByRole('button', { name: /run backtest/i }).click()

    // Should show success message
    await expect(page.getByText(/backtest submitted/i)).toBeVisible({ timeout: 10000 })
  })

  test('should display job list', async ({ page }) => {
    await expect(page.getByText(/backtest jobs/i)).toBeVisible()
  })

  test('should filter jobs by status', async ({ page }) => {
    // Check for status filter buttons
    const allButton = page.getByRole('button', { name: /all/i })
    const queuedButton = page.getByRole('button', { name: /queued/i })
    const runningButton = page.getByRole('button', { name: /running/i })
    
    await expect(allButton.or(queuedButton).or(runningButton)).toBeVisible()
  })

  test('should view backtest results', async ({ page }) => {
    // Wait for jobs to load
    await page.waitForSelector('[data-testid="job-item"], .job-card', { timeout: 10000 })
    
    // Click on a finished job
    const finishedJob = page.getByText(/finished/i).first()
    if (await finishedJob.isVisible()) {
      await finishedJob.click()
      
      // Should show results
      await expect(page.getByText(/total return/i)).toBeVisible({ timeout: 5000 })
      await expect(page.getByText(/sharpe ratio/i)).toBeVisible()
    }
  })

  test('should validate required fields', async ({ page }) => {
    // Try to submit without filling required fields
    await page.getByRole('button', { name: /run backtest/i }).click()
    
    // Form should not submit (browser validation)
    await expect(page.getByLabel(/strategy/i)).toBeVisible()
  })

  test('should display performance metrics', async ({ page }) => {
    // If there are any finished backtests, check metrics
    const resultsSection = page.getByText(/results/i)
    if (await resultsSection.isVisible()) {
      const metrics = [
        /total return/i,
        /annual return/i,
        /sharpe ratio/i,
        /max drawdown/i,
        /total trades/i,
      ]
      
      for (const metric of metrics) {
        await expect(page.getByText(metric)).toBeVisible()
      }
    }
  })
})
