import { defineConfig, devices } from '@playwright/test'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { homedir } from 'os'
import { resolve } from 'path'

/**
 * Environment configuration for E2E tests.
 * Override via environment variables:
 *   BASE_URL        - Portal URL (default: http://localhost:4173)
 *   API_URL         - Backend URL (default: http://localhost:8000)
 *   E2E_PORTAL_PORT - Dedicated dev-server port for Playwright (default: 4173)
 *   TEST_USERNAME   - Login username (default: admin)
 *   TEST_PASSWORD   - Login password (default: admin123)
 *   TEST_ENV        - Environment name: dev | staging (default: dev)
 */
const testEnv = process.env.TEST_ENV || 'dev'
const portalPort = Number(process.env.E2E_PORTAL_PORT || 4173)

const envDefaults: Record<string, { baseURL: string; apiURL: string }> = {
  dev: {
    baseURL: `http://localhost:${portalPort}`,
    apiURL: 'http://localhost:8000',
  },
  staging: {
    baseURL: 'https://staging.quantmate.local',
    apiURL: 'https://staging.quantmate.local',
  },
}

const env = envDefaults[testEnv] || envDefaults.dev

/**
 * In WSL2, chrome-headless-shell may SIGSEGV. Use the full Chromium binary instead.
 */
function getChromiumExecutable(): string | undefined {
  try {
    const procVersion = readFileSync('/proc/version', 'utf8')
    if (!procVersion.toLowerCase().includes('microsoft')) return undefined
    const browsersPath = resolve(homedir(), '.cache', 'ms-playwright')
    const chromiumDir = readdirSync(browsersPath).find(
      (d) => /^chromium-\d+$/.test(d),
    )
    if (!chromiumDir) return undefined
    const exe = resolve(browsersPath, chromiumDir, 'chrome-linux64', 'chrome')
    return existsSync(exe) ? exe : undefined
  } catch {
    return undefined
  }
}

const chromiumExecutable = getChromiumExecutable()

function hasInstalledBrowser(dirPattern: RegExp, candidatePaths: string[]) {
  try {
    const browsersPath = resolve(homedir(), '.cache', 'ms-playwright')
    const browserDir = readdirSync(browsersPath).find((entry) => dirPattern.test(entry))
    if (!browserDir) {
      return false
    }

    return candidatePaths.some((relativePath) => existsSync(resolve(browsersPath, browserDir, relativePath)))
  } catch {
    return false
  }
}

const hasFirefox = hasInstalledBrowser(/^firefox-\d+$/, [
  'firefox/Nightly.app/Contents/MacOS/firefox',
  'firefox/firefox',
  'firefox.exe',
])

const hasWebkit = hasInstalledBrowser(/^webkit-\d+$/, [
  'pw_run.sh',
  'Playwright.app/Contents/MacOS/Playwright',
])

export default defineConfig({
  testDir: './test/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  timeout: 90000,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  outputDir: 'tmp/playwright-artifacts',
  reporter: [
    ['html', { outputFolder: 'tmp/playwright-report' }],
    ['json', { outputFile: 'tmp/test-results/results.json' }],
    ['junit', { outputFile: 'tmp/test-results/junit.xml' }],
  ],
  use: {
    baseURL: process.env.BASE_URL || env.baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  expect: {
    timeout: 45000,
  },

  projects: [
    /* Auth setup — runs first to store authenticated state */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      use: {
        ...(chromiumExecutable ? { launchOptions: { executablePath: chromiumExecutable } } : {}),
      },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        ...(chromiumExecutable ? { launchOptions: { executablePath: chromiumExecutable } } : {}),
        storageState: 'test/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    ...(hasFirefox
      ? [{
          name: 'firefox',
          use: {
            ...devices['Desktop Firefox'],
            storageState: 'test/e2e/.auth/user.json',
          },
          dependencies: ['setup'],
        }]
      : []),
    ...(hasWebkit
      ? [{
          name: 'webkit',
          use: {
            ...devices['Desktop Safari'],
            storageState: 'test/e2e/.auth/user.json',
          },
          dependencies: ['setup'],
        }]
      : []),
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        ...(chromiumExecutable ? { launchOptions: { executablePath: chromiumExecutable } } : {}),
        storageState: 'test/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    ...(hasWebkit
      ? [{
          name: 'Mobile Safari',
          use: {
            ...devices['iPhone 12'],
            storageState: 'test/e2e/.auth/user.json',
          },
          dependencies: ['setup'],
        }]
      : []),
  ],

  webServer: testEnv === 'dev' ? {
    command: `PORTAL_PORT=${portalPort} npm run dev`,
    url: process.env.BASE_URL || env.baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  } : undefined,
})
