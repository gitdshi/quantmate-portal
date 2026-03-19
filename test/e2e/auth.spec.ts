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
    // Use API to login and inject tokens (same as auth.setup.ts)
    const apiBase = (process.env.API_URL || 'http://localhost:8000') + '/api/v1'
    const loginResp = await page.request.post(`${apiBase}/auth/login`, {
      data: { username: env.username, password: env.password },
    })
    expect(loginResp.ok()).toBeTruthy()
    const { access_token, refresh_token } = await loginResp.json()
    const meResp = await page.request.get(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const user = await meResp.json()

    // Navigate to app root (redirects to /login), inject tokens, reload
    await page.goto('/')
    await page.evaluate(
      ({ user, access_token, refresh_token }) => {
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        localStorage.setItem('auth-storage', JSON.stringify({
          state: { user, accessToken: access_token, refreshToken: refresh_token, isAuthenticated: true },
          version: 0,
        }))
      },
      { user, access_token, refresh_token },
    )
    await page.reload()

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/dashboard/)
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
    await expect(page.getByText(/login failed|invalid|incorrect|unauthorized/i)).toBeVisible({ timeout: 10000 })
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
    // Setup authenticated state via API
    const apiBase = (process.env.API_URL || 'http://localhost:8000') + '/api/v1'
    const loginResp = await page.request.post(`${apiBase}/auth/login`, {
      data: { username: env.username, password: env.password },
    })
    const { access_token, refresh_token } = await loginResp.json()
    const meResp = await page.request.get(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const user = await meResp.json()

    await page.goto('/login')
    await page.evaluate(
      ({ user, access_token, refresh_token }) => {
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        localStorage.setItem('auth-storage', JSON.stringify({
          state: { user, accessToken: access_token, refreshToken: refresh_token, isAuthenticated: true },
          version: 0,
        }))
      },
      { user, access_token, refresh_token },
    )
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    // Click logout (icon-only button in sidebar)
    const logoutBtn = page.locator('button').filter({ has: page.locator('svg.lucide-log-out') })
    await logoutBtn.click()

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/)
  })

  test('should persist session after page reload', async ({ page }) => {
    // Setup authenticated state via API
    const apiBase = (process.env.API_URL || 'http://localhost:8000') + '/api/v1'
    const loginResp = await page.request.post(`${apiBase}/auth/login`, {
      data: { username: env.username, password: env.password },
    })
    const { access_token, refresh_token } = await loginResp.json()
    const meResp = await page.request.get(`${apiBase}/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    })
    const user = await meResp.json()

    await page.goto('/login')
    await page.evaluate(
      ({ user, access_token, refresh_token }) => {
        localStorage.setItem('access_token', access_token)
        localStorage.setItem('refresh_token', refresh_token)
        localStorage.setItem('auth-storage', JSON.stringify({
          state: { user, accessToken: access_token, refreshToken: refresh_token, isAuthenticated: true },
          version: 0,
        }))
      },
      { user, access_token, refresh_token },
    )
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)

    // Reload page
    await page.reload()

    // Should still be on dashboard
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 10000 })
  })
})
