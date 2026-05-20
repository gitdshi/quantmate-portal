import { test as setup, expect } from '@playwright/test'
import { env } from './env'
import { loginForE2E } from './auth-api'
import { isQuantMateApi, seedMockAuthState } from './mock-session'

const authFile = 'test/e2e/.auth/user.json'

/**
 * Authenticates once and saves storage state (localStorage + cookies)
 * so all browser projects can reuse the session.
 *
 * Uses the API directly to obtain tokens, then injects them into
 * localStorage so PrivateRoute's /auth/me check succeeds reliably.
 */
setup('authenticate', async ({ page }) => {
  const apiBase = env.apiURL + '/api/v1'

  const shouldUseMockAuth = env.authMode === 'mock'
    || (env.authMode === 'auto' && !(await isQuantMateApi(page.request)))

  if (shouldUseMockAuth) {
    await seedMockAuthState(page)
    await page.context().storageState({ path: authFile })
    return
  }

  let access_token: string
  let refresh_token: string

  try {
    const tokens = await loginForE2E(page.request)
    access_token = tokens.access_token
    refresh_token = tokens.refresh_token
  } catch (error) {
    if (env.authMode !== 'auto') {
      throw error
    }

    await seedMockAuthState(page)
    await page.context().storageState({ path: authFile })
    return
  }

  // 2. Fetch user profile
  const meResp = await page.request.get(`${apiBase}/auth/me`, {
    headers: { Authorization: `Bearer ${access_token}` },
  })
  expect(meResp.ok()).toBeTruthy()
  const user = await meResp.json()

  // 3. Navigate to the app and inject auth state into localStorage
  await page.goto('/')
  await page.evaluate(
    ({ user, access_token, refresh_token }) => {
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)
      localStorage.setItem(
        'auth-storage',
        JSON.stringify({
          state: {
            user,
            accessToken: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
          },
          version: 0,
        }),
      )
    },
    { user, access_token, refresh_token },
  )

  // 4. Reload so the app picks up the injected state
  await page.reload()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15000 })

  // 5. Persist authenticated state for other tests
  await page.context().storageState({ path: authFile })
})
