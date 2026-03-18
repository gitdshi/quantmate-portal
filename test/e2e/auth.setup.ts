import { test as setup, expect } from '@playwright/test'
import { env } from './env'

const authFile = 'test/e2e/.auth/user.json'

/**
 * Authenticates once and saves storage state (localStorage + cookies)
 * so all browser projects can reuse the session.
 */
setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()

  // Fill credentials & submit
  await page.locator('#username').fill(env.username)
  await page.locator('#password').fill(env.password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for redirect to dashboard (PrivateRoute validates token)
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

  // Persist authenticated state
  await page.context().storageState({ path: authFile })
})
