import { expect, test } from '@playwright/test'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173')
  })

  test('should display login page', async ({ page }) => {
    await expect(page.getByText('Welcome Back')).toBeVisible()
    await expect(page.getByPlaceholder('Username')).toBeVisible()
    await expect(page.getByPlaceholder('Password')).toBeVisible()
  })

  test('should login successfully with valid credentials', async ({ page }) => {
    await page.getByPlaceholder('Username').fill('testuser')
    await page.getByPlaceholder('Password').fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should redirect to dashboard
    await expect(page).toHaveURL('http://localhost:5173/')
    await expect(page.getByText('Dashboard')).toBeVisible()
  })

  test('should show error with invalid credentials', async ({ page }) => {
    await page.getByPlaceholder('Username').fill('wronguser')
    await page.getByPlaceholder('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should show error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible()
  })

  test('should navigate to register page', async ({ page }) => {
    await page.getByText(/sign up/i).click()
    await expect(page).toHaveURL('http://localhost:5173/register')
    await expect(page.getByText('Create Account')).toBeVisible()
  })

  test('should register new user', async ({ page }) => {
    await page.goto('http://localhost:5173/register')
    
    const timestamp = Date.now()
    await page.getByPlaceholder('Username').fill(`testuser${timestamp}`)
    await page.getByPlaceholder('Email').fill(`test${timestamp}@example.com`)
    await page.getByPlaceholder('Password').fill('password123')
    await page.getByRole('button', { name: /sign up/i }).click()

    // Should redirect to dashboard after successful registration
    await expect(page).toHaveURL('http://localhost:5173/')
    await expect(page.getByText('Dashboard')).toBeVisible()
  })

  test('should logout successfully', async ({ page, context }) => {
    // Login first
    await page.getByPlaceholder('Username').fill('testuser')
    await page.getByPlaceholder('Password').fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText('Dashboard')).toBeVisible()

    // Logout
    await page.getByRole('button', { name: /logout/i }).click()

    // Should redirect to login
    await expect(page).toHaveURL('http://localhost:5173/login')
  })

  test('should persist session after page reload', async ({ page }) => {
    // Login
    await page.getByPlaceholder('Username').fill('testuser')
    await page.getByPlaceholder('Password').fill('password123')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText('Dashboard')).toBeVisible()

    // Reload page
    await page.reload()

    // Should still be authenticated
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page).toHaveURL('http://localhost:5173/')
  })
})
