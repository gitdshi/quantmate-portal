import { defineConfig, devices } from '@playwright/test'

/**
 * Environment configuration for E2E tests.
 * Override via environment variables:
 *   BASE_URL        - Portal URL (default: http://localhost:5173)
 *   API_URL         - Backend URL (default: http://localhost:8000)
 *   TEST_USERNAME   - Login username (default: admin)
 *   TEST_PASSWORD   - Login password (default: admin123)
 *   TEST_ENV        - Environment name: dev | staging (default: dev)
 */
const testEnv = process.env.TEST_ENV || 'dev'

const envDefaults: Record<string, { baseURL: string; apiURL: string }> = {
  dev: {
    baseURL: 'http://localhost:5173',
    apiURL: 'http://localhost:8000',
  },
  staging: {
    baseURL: 'https://staging.quantmate.local',
    apiURL: 'https://staging.quantmate.local',
  },
}

const env = envDefaults[testEnv] || envDefaults.dev

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || env.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    /* Auth setup — runs first to store authenticated state */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: testEnv === 'dev' ? {
    command: 'npm run dev',
    url: process.env.BASE_URL || env.baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  } : undefined,
})
