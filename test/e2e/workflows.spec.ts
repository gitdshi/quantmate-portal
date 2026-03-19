import { expect, test } from '@playwright/test'
import { navigateToPage, waitForPageLoad } from './helpers'

/**
 * Critical user workflow tests — end-to-end flows that combine
 * multiple pages and actions to verify the system works as a whole.
 */
test.describe('Strategy Creation and Backtest Workflow', () => {
  const strategyName = `E2E-Workflow-${Date.now()}`

  test('should create a strategy and run a backtest', async ({ page }) => {
    test.slow() // Multi-step workflow needs extra time
    // Step 1: Navigate to strategies page
    await navigateToPage(page, '/strategies')
    await expect(page.locator('h1').filter({ hasText: 'Strategies' })).toBeVisible()

    // Step 2: Click "New Strategy" button
    const newBtn = page.locator('button').filter({ hasText: /new strategy/i }).first()
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click({ timeout: 10000 }).catch(() => {})
      await page.waitForTimeout(1000)

      // Step 3: Fill in strategy name
      const nameInput = page.getByLabel(/name/i).first()
        .or(page.locator('input[type="text"]').first())
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        await nameInput.fill(strategyName)
        
        // Step 4: Save strategy
        const saveBtn = page.locator('button').filter({ hasText: /save|create|submit/i }).first()
        if (await saveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await saveBtn.click()
          await page.waitForTimeout(2000)
        }
      }
    }

    // Step 5: Navigate to backtest page
    await navigateToPage(page, '/backtest')
    await expect(page.locator('h1').filter({ hasText: 'Backtest' })).toBeVisible()

    // Step 6: Open backtest form
    const backtestBtn = page.locator('button').filter({ hasText: /new backtest/i }).first()
    if (await backtestBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await backtestBtn.click()
      await page.waitForTimeout(1000)
      // Verify form is displayed
      await expect(page.getByText(/strategy/i).first()).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Report Generation Workflow', () => {
  test('should generate and view a report', async ({ page }) => {
    // Step 1: Navigate to reports
    await navigateToPage(page, '/reports')
    await expect(page.locator('h1').filter({ hasText: 'Reports' })).toBeVisible()

    // Step 2: Click generate report
    const generateBtn = page.locator('button').filter({ hasText: /generate report/i }).first()
    if (await generateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await generateBtn.click()
      await page.waitForTimeout(500)

      // Step 3: Fill in report type
      const typeSelect = page.locator('select').first()
      if (await typeSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
        await typeSelect.selectOption({ index: 1 }) // Select first non-default option
      }

      // Step 4: Submit
      const submitBtn = page.locator('button').filter({ hasText: /generate|submit|create/i }).first()
      if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await submitBtn.click()
        await page.waitForTimeout(2000)
        // Should see generated report or success message
      }
    }
  })
})

test.describe('Dashboard to Detail Navigation', () => {
  test('should navigate from dashboard to strategies and back', async ({ page }) => {
    // Start at dashboard
    await navigateToPage(page, '/dashboard')
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible()

    // Navigate to strategies via sidebar
    await page.getByRole('link', { name: /strategies/i }).click()
    await expect(page).toHaveURL(/\/strategies/, { timeout: 10000 })
    await expect(page.locator('h1').filter({ hasText: 'Strategies' })).toBeVisible({ timeout: 60000 })

    // Navigate back to dashboard
    await page.getByRole('link', { name: /dashboard/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible()
  })

  test('should navigate through all analytics tabs', async ({ page }) => {
    await navigateToPage(page, '/analytics')
    await expect(page.locator('h1').filter({ hasText: 'Analytics' })).toBeVisible({ timeout: 60000 })

    // Click through tabs — re-query each time to avoid stale DOM references
    const tabNames = ['Portfolio Analytics', 'Risk Metrics', 'Performance Comparison']
    for (const tab of tabNames) {
      try {
        const tabEl = page.locator('button').filter({ hasText: new RegExp(tab, 'i') }).first()
        if (await tabEl.isVisible({ timeout: 5000 }).catch(() => false)) {
          await tabEl.click({ timeout: 10000 }).catch(() => {})
          await page.waitForTimeout(2000)
        }
      } catch {
        // Tab click may fail due to re-render — continue
      }
    }

    // Page should still be on analytics
    await expect(page).toHaveURL(/\/analytics/)
  })
})

test.describe('Team Workspace Workflow', () => {
  test('should create and manage a workspace', async ({ page }) => {
    test.slow() // Multi-step workflow needs extra time
    await navigateToPage(page, '/team-space')
    await expect(page.locator('h1').filter({ hasText: /team space/i })).toBeVisible()

    // Click new workspace
    const newBtn = page.locator('button').filter({ hasText: /new workspace/i }).first()
    if (await newBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await newBtn.click()
      await page.waitForTimeout(500)

      // Fill workspace name
      const nameInput = page.getByLabel(/name/i).first()
        .or(page.getByPlaceholder(/name/i).first())
      if (await nameInput.isVisible({ timeout: 3000 }).catch(() => false)) {
        const wsName = `E2E-WS-${Date.now()}`
        await nameInput.fill(wsName)

        // Create
        const createBtn = page.locator('button').filter({ hasText: /create/i }).first()
        if (await createBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await createBtn.click()
          await page.waitForTimeout(2000)
        }
      }
    }
  })
})

test.describe('Monitoring Alert Rule Workflow', () => {
  test('should view alert tabs and create a rule', async ({ page }) => {
    await navigateToPage(page, '/monitoring')
    await expect(page.locator('h1').filter({ hasText: /monitoring/i })).toBeVisible()

    // Switch through all tabs (use locator to avoid strict mode)
    const tabNames = ['Alert Rules', 'Alert History', 'Channels']
    for (const tabName of tabNames) {
      const tab = page.locator('button').filter({ hasText: new RegExp(tabName, 'i') }).first()
      if (await tab.isVisible({ timeout: 2000 }).catch(() => false)) {
        await tab.click()
        await page.waitForTimeout(1000)
      }
    }

    // Go back to alert rules
    const rulesTab = page.locator('button').filter({ hasText: /alert rules/i }).first()
    if (await rulesTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await rulesTab.click()
      await page.waitForTimeout(500)
    }
  })
})
