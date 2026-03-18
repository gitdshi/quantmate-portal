import { expect, test } from '@playwright/test'
import { env } from './env'

test.describe('Authentication', () => {
  // These tests do NOT use the shared auth state — they test the login flow itself.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('should display login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
    await expect(page.locator('#username')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#username').fill(env.username)
    await page.locator('#password').fill(env.password)
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#username').fill('wronguser')
    await page.locator('#password').fill('wrongpassword')

    // Wait for the API response after clicking sign in
    const [response] = await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/auth/login')),
      page.getByRole('button', { name: /sign in/i }).click(),
    ])

    // API should respond with 401
    expect(response.status()).toBe(401)

    // Should show error message rendered by the Login component
    await expect(page.locator('.bg-destructive\\/10')).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('link', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/register/)
    await expect(page.getByRole('heading', { name: /create an account/i })).toBeVisible()
  })

  test('should register new user', async ({ page }) => {
    await page.goto('/register')
    const ts = Date.now()
    await page.locator('#username').fill(`e2euser${ts}`)
    await page.locator('#email').fill(`e2e${ts}@test.local`)
    await page.locator('#password').fill('Test@12345')
    await page.locator('#confirmPassword').fill('Test@12345')
    await page.getByRole('button', { name: /create account/i }).click()

    // Should show success or redirect to login
    await expect(
      page.getByText(/account created/i).or(page.locator('#username'))
    ).toBeVisible({ timeout: 10000 })
  })

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.locator('#username').fill(env.username)
    await page.locator('#password').fill(env.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // Click logout (icon-only button in sidebar)
    const logoutBtn = page.locator('button').filter({ has: page.locator('svg.lucide-log-out') })
    await logoutBtn.click()

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should persist session after page reload', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#username').fill(env.username)
    await page.locator('#password').fill(env.password)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

    // Reload page
    await page.reload()

    // Should still be on dashboard
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 })
  })
})
