import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

function readBackendEnvValue(key: string): string | undefined {
  const backendEnvPath = resolve(process.cwd(), '../quantmate/.env')
  if (!existsSync(backendEnvPath)) {
    return undefined
  }

  const content = readFileSync(backendEnvPath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/)
    if (!match || match[1] !== key) {
      continue
    }

    const value = match[2].trim().replace(/^['"]|['"]$/g, '')
    return value || undefined
  }

  return undefined
}

const fallbackUsername = readBackendEnvValue('ADMIN_USERNAME')
const fallbackPassword = readBackendEnvValue('ADMIN_PASSWORD')

export function buildLoginPayload(username: string, password: string) {
  return {
    username,
    account: username,
    password,
  }
}

/**
 * E2E environment configuration.
 * Values are read from process.env at import time —
 * override them on the CLI:
 *   TEST_ENV=staging TEST_USERNAME=admin npx playwright test
 */

export const env = {
  /** dev | staging */
  name: process.env.TEST_ENV || 'dev',

  /** api | mock | auto */
  authMode: process.env.E2E_AUTH_MODE || 'auto',

  /** Login credentials */
  username: process.env.TEST_USERNAME || process.env.ADMIN_USERNAME || fallbackUsername || 'admin',
  password: process.env.TEST_PASSWORD || process.env.ADMIN_PASSWORD || fallbackPassword || 'admin123',

  /** Backend API base (used for direct API calls in setup) */
  apiURL: process.env.API_URL || 'http://localhost:8000',
}
