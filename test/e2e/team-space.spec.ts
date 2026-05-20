import { expect, test } from '@playwright/test'
import { navigateToPage } from './helpers'
import { installMockAuthMe, seedMockAuthState } from './mock-session'

const labels = {
  pageTitle: /^(team space|团队空间)$/i,
  workspacesTab: /^(workspaces|工作空间)$/i,
  sharingTab: /^(strategy sharing|策略分享)$/i,
  receivedTitle: /(shared with me|收到的分享)/i,
  sentTitle: /(sent shares|已发起分享)/i,
  createWorkspace: /(create workspace|创建空间)/i,
  createWorkspaceModal: /(create workspace|创建工作空间)/i,
  shareStrategy: /(share strategy|分享策略)/i,
  shareStrategyModal: /(share strategy|分享策略)/i,
  shareTarget: /(share target|分享目标)/i,
  permission: /(permission|权限)/i,
  workspaceNamePlaceholder: /(quant research team|量化研究团队)/i,
  workspaceDescriptionPlaceholder: /(describe this workspace|工作空间描述)/i,
}

async function installTeamSpaceMocks(page: Parameters<typeof test.beforeEach>[0]['page']) {
  await installMockAuthMe(page)

  await page.route('**/api/v1/system/version', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        environment: 'development',
        version: 'test',
      }),
    })
  })

  await page.route('**/api/v1/teams/workspaces', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 1,
          name: 'Quant Research Team',
          description: 'Cross-functional workspace for signal research.',
          members: 3,
          strategies: 2,
          created_at: '2026-03-12T08:00:00Z',
          role: 'owner',
          max_members: 10,
        },
      ]),
    })
  })

  await page.route('**/api/v1/teams/shares/received', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 11,
          strategy_id: 101,
          strategy_name: 'Momentum Alpha',
          shared_by: 7,
          shared_by_username: 'alice',
          shared_with_user_id: 1,
          shared_with_username: 'admin',
          permission: 'view',
          created_at: '2026-03-13T09:30:00Z',
        },
      ]),
    })
  })

  await page.route('**/api/v1/teams/shares/sent', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 12,
          strategy_id: 102,
          strategy_name: 'Mean Reversion',
          shared_with_team_id: 1,
          shared_with_team_name: 'Quant Research Team',
          permission: 'edit',
          created_at: '2026-03-14T10:15:00Z',
        },
      ]),
    })
  })

  await page.route('**/api/v1/strategies', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 101,
          name: 'Momentum Alpha',
          description: 'Trend-following strategy for sector rotation.',
        },
      ]),
    })
  })
}

test.describe('Team Space', () => {
  test.beforeEach(async ({ page }) => {
    await installTeamSpaceMocks(page)
    await seedMockAuthState(page)
    await navigateToPage(page, '/team-space')
  })

  test('should display team space page', async ({ page }) => {
    await expect(page.getByTestId('team-space-page')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: labels.pageTitle })).toBeVisible({ timeout: 15000 })
  })

  test('should default to the workspaces tab', async ({ page }) => {
    await expect(page.getByRole('button', { name: labels.workspacesTab })).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h2').filter({ hasText: labels.workspacesTab }).first()).toBeVisible({ timeout: 15000 })
  })

  test('should switch between workspaces and sharing tabs', async ({ page }) => {
    await page.getByRole('button', { name: labels.sharingTab }).click()

    await expect(page.locator('h2').filter({ hasText: labels.receivedTitle }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h2').filter({ hasText: labels.sentTitle }).first()).toBeVisible({ timeout: 15000 })
    await expect(page).toHaveURL(/tab=sharing/)

    await page.getByRole('button', { name: labels.workspacesTab }).click()
    await expect(page.locator('h2').filter({ hasText: labels.workspacesTab }).first()).toBeVisible({ timeout: 15000 })
  })

  test('should respect sharing tab in the URL', async ({ page }) => {
    await navigateToPage(page, '/team-space?tab=sharing')

    await expect(page.locator('h2').filter({ hasText: labels.receivedTitle }).first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('h2').filter({ hasText: labels.sentTitle }).first()).toBeVisible({ timeout: 15000 })
  })

  test('should open create workspace modal', async ({ page }) => {
    await page.getByRole('button', { name: labels.createWorkspace }).click()

    await expect(page.getByRole('heading', { name: labels.createWorkspaceModal })).toBeVisible({ timeout: 15000 })
    await expect(page.getByPlaceholder(labels.workspaceNamePlaceholder)).toBeVisible({ timeout: 15000 })
    await expect(page.getByPlaceholder(labels.workspaceDescriptionPlaceholder)).toBeVisible({ timeout: 15000 })
  })

  test('should open share strategy modal', async ({ page }) => {
    await navigateToPage(page, '/team-space?tab=sharing')

    await page.getByRole('button', { name: labels.shareStrategy }).first().click()

    await expect(page.getByRole('heading', { name: labels.shareStrategyModal })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(labels.shareTarget).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(labels.permission).first()).toBeVisible({ timeout: 15000 })
  })

  test('should expose top-level actions in both modes', async ({ page }) => {
    await expect(page.getByRole('button', { name: labels.createWorkspace })).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: labels.shareStrategy }).first()).toBeVisible({ timeout: 15000 })

    await page.getByRole('button', { name: labels.sharingTab }).click()
    await expect(page.getByRole('button', { name: labels.shareStrategy }).first()).toBeVisible({ timeout: 15000 })
  })
})
