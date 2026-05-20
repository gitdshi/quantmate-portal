import type { APIRequestContext } from '@playwright/test'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { spawnSync } from 'child_process'
import { buildLoginPayload, env } from './env'

type LoginResult = {
  access_token: string
  refresh_token: string
}

type Credentials = {
  username: string
  password: string
}

type StoredState = {
  origins?: Array<{
    origin: string
    localStorage?: Array<{ name: string; value: string }>
  }>
}

function readStoredRefreshToken(): string | undefined {
  const authStatePath = resolve(process.cwd(), 'test/e2e/.auth/user.json')
  if (!existsSync(authStatePath)) {
    return undefined
  }

  try {
    const parsed = JSON.parse(readFileSync(authStatePath, 'utf8')) as StoredState
    for (const origin of parsed.origins ?? []) {
      for (const entry of origin.localStorage ?? []) {
        if (entry.name === 'refresh_token' && entry.value) {
          return entry.value
        }
      }
    }
  } catch {
    return undefined
  }

  return undefined
}

async function attemptRefresh(request: APIRequestContext, refreshToken: string) {
  const apiBase = `${env.apiURL}/api/v1`
  const response = await request.post(`${apiBase}/auth/refresh`, {
    data: { refresh_token: refreshToken },
  })

  if (!response.ok()) {
    return { ok: false as const, response }
  }

  const tokens = (await response.json()) as LoginResult
  return { ok: true as const, tokens }
}

async function attemptLogin(request: APIRequestContext, username: string, password: string) {
  const apiBase = `${env.apiURL}/api/v1`
  const response = await request.post(`${apiBase}/auth/login`, {
    data: buildLoginPayload(username, password),
  })

  if (!response.ok()) {
    return { ok: false as const, response }
  }

  const tokens = (await response.json()) as LoginResult
  return { ok: true as const, tokens }
}

function ensureTempUserLocally(credentials: Credentials) {
  const backendRoot = resolve(process.cwd(), '../quantmate')
  const venvPython = resolve(backendRoot, '.venv/bin/python')
  const pythonExecutable = existsSync(venvPython) ? venvPython : 'python3'
  const email = `${credentials.username}@test.local`
  const script = [
    'import os',
    'from app.domains.auth.service import AuthService',
    'AuthService().register(os.environ["E2E_USERNAME"], os.environ["E2E_EMAIL"], os.environ["E2E_PASSWORD"])',
  ].join('; ')

  const result = spawnSync(pythonExecutable, ['-c', script], {
    cwd: backendRoot,
    env: {
      ...process.env,
      E2E_USERNAME: credentials.username,
      E2E_EMAIL: email,
      E2E_PASSWORD: credentials.password,
    },
    encoding: 'utf8',
  })

  if (result.status !== 0) {
    const stderr = result.stderr?.trim() || result.stdout?.trim() || 'Unknown error'
    throw new Error(`Local E2E user bootstrap failed: ${stderr}`)
  }
}

export async function loginForE2E(request: APIRequestContext): Promise<LoginResult> {
  const firstAttempt = await attemptLogin(request, env.username, env.password)
  if (firstAttempt.ok) {
    return firstAttempt.tokens
  }

  const storedRefreshToken = readStoredRefreshToken()
  if (storedRefreshToken) {
    const refreshAttempt = await attemptRefresh(request, storedRefreshToken)
    if (refreshAttempt.ok) {
      return refreshAttempt.tokens
    }
  }

  if (env.name !== 'dev') {
    const body = await firstAttempt.response.text()
    throw new Error(`E2E login failed: ${firstAttempt.response.status()} ${body}`)
  }

  if (env.authMode === 'auto') {
    const body = await firstAttempt.response.text()
    throw new Error(`E2E login failed in auto mode: ${firstAttempt.response.status()} ${body}`)
  }

  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`
  const tempCredentials = {
    username: `e2e_${suffix}`,
    password: `E2E-${suffix}-Pass!`,
  }
  ensureTempUserLocally(tempCredentials)
  const secondAttempt = await attemptLogin(request, tempCredentials.username, tempCredentials.password)
  if (!secondAttempt.ok) {
    const body = await secondAttempt.response.text()
    throw new Error(`E2E temp-user login failed: ${secondAttempt.response.status()} ${body}`)
  }

  return secondAttempt.tokens
}