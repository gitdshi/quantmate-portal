import i18n from '@/i18n'
import TeamSpace from '@/pages/TeamSpace'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/components/ui/toast-service', () => ({
  showToast: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  teamAPI: {
    listWorkspaces: vi.fn(),
    createWorkspace: vi.fn(),
    listMembers: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    listSharedWithMe: vi.fn(),
    listSentShares: vi.fn(),
    shareStrategy: vi.fn(),
    revokeShare: vi.fn(),
  },
  strategiesAPI: {
    list: vi.fn(),
  },
}))

import { strategiesAPI, teamAPI } from '@/lib/api'

const workspaces = [
  {
    id: 1,
    name: 'Quant Research Team',
    description: 'Research and signal generation',
    members: 2,
    strategies: 5,
    created_at: '2025-01-01T00:00:00Z',
    role: 'owner',
    max_members: 10,
  },
]

const members = [
  {
    id: 1,
    workspace_id: 1,
    user_id: 12,
    username: 'Daniel',
    email: 'daniel@example.com',
    role: 'owner',
    joined_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    workspace_id: 1,
    user_id: 18,
    username: 'Sara',
    email: 'sara@example.com',
    role: 'member',
    joined_at: '2025-01-02T00:00:00Z',
  },
]

const strategies = [
  { id: 101, name: 'Momentum Alpha' },
  { id: 102, name: 'Mean Reversion Core' },
]

const receivedShares = [
  {
    id: 8,
    strategy_id: 101,
    strategy_name: 'Momentum Alpha',
    shared_by: 77,
    shared_by_username: 'alice',
    shared_with_team_id: 1,
    shared_with_team_name: 'Quant Research Team',
    permission: 'view',
    created_at: '2025-02-01T00:00:00Z',
  },
]

const sentShares = [
  {
    id: 9,
    strategy_id: 102,
    strategy_name: 'Mean Reversion Core',
    shared_with_user_id: 23,
    shared_with_username: 'bob',
    permission: 'edit',
    created_at: '2025-02-02T00:00:00Z',
  },
]

describe('TeamSpace Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    window.history.pushState({}, '', '/team-space')
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')

    vi.mocked(teamAPI.listWorkspaces).mockResolvedValue({ data: workspaces } as never)
    vi.mocked(teamAPI.createWorkspace).mockResolvedValue({ data: workspaces[0] } as never)
    vi.mocked(teamAPI.listMembers).mockResolvedValue({ data: members } as never)
    vi.mocked(teamAPI.addMember).mockResolvedValue({ data: { message: 'ok' } } as never)
    vi.mocked(teamAPI.removeMember).mockResolvedValue({ data: {} } as never)
    vi.mocked(teamAPI.listSharedWithMe).mockResolvedValue({ data: receivedShares } as never)
    vi.mocked(teamAPI.listSentShares).mockResolvedValue({ data: sentShares } as never)
    vi.mocked(teamAPI.shareStrategy).mockResolvedValue({ data: { id: 1 } } as never)
    vi.mocked(teamAPI.revokeShare).mockResolvedValue({ data: {} } as never)
    vi.mocked(strategiesAPI.list).mockResolvedValue({ data: strategies } as never)
  })

  it('renders merged page actions', async () => {
    render(<TeamSpace />)

    expect(screen.getByText('Team Space')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create Workspace' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Share Strategy' })).toBeInTheDocument()
    expect(await screen.findByText('Quant Research Team')).toBeInTheDocument()
  })

  it('opens workspace detail and renders members', async () => {
    render(<TeamSpace />)

    fireEvent.click(await screen.findByText('Quant Research Team'))

    expect(await screen.findByText('Back to workspace list')).toBeInTheDocument()
    expect(await screen.findByText('Daniel')).toBeInTheDocument()
    expect(await screen.findByText('Sara')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Invite Member' })).toBeInTheDocument()
  })

  it('creates a workspace from the modal', async () => {
    render(<TeamSpace />)

    fireEvent.click(screen.getByRole('button', { name: 'Create Workspace' }))
    fireEvent.change(screen.getByPlaceholderText('e.g. Quant Research Team'), {
      target: { value: 'New Workspace' },
    })
    fireEvent.change(screen.getByPlaceholderText('Describe this workspace...'), {
      target: { value: 'Workspace for collaboration' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(teamAPI.createWorkspace).toHaveBeenCalledWith({
        name: 'New Workspace',
        description: 'Workspace for collaboration',
      })
    })
  })

  it('invites a member from workspace detail', async () => {
    render(<TeamSpace />)

    fireEvent.click(await screen.findByText('Quant Research Team'))
    fireEvent.click(await screen.findByRole('button', { name: 'Invite Member' }))
    fireEvent.change(screen.getByPlaceholderText('Enter a user ID'), { target: { value: '33' } })
    fireEvent.change(screen.getByDisplayValue('Member'), { target: { value: 'viewer' } })
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }))

    await waitFor(() => {
      expect(teamAPI.addMember).toHaveBeenCalledWith(1, { user_id: 33, role: 'viewer' })
    })
  })

  it('respects sharing tab from the URL', async () => {
    window.history.pushState({}, '', '/team-space?tab=sharing')

    render(<TeamSpace />)

    expect(await screen.findByText('Shared with Me')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getAllByText('Sent Shares').length).toBeGreaterThan(0)
    })

    await waitFor(() => {
      expect(teamAPI.listSharedWithMe).toHaveBeenCalled()
      expect(teamAPI.listSentShares).toHaveBeenCalled()
      expect(screen.getByText('Momentum Alpha')).toBeInTheDocument()
      expect(screen.getByText('Mean Reversion Core')).toBeInTheDocument()
    })
  })

  it('shares a strategy to a workspace', async () => {
    window.history.pushState({}, '', '/team-space?tab=sharing')

    render(<TeamSpace />)

    fireEvent.click((await screen.findAllByRole('button', { name: 'Share Strategy' }))[0])

    await waitFor(() => {
      expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(3)
    })

    const initialSelects = screen.getAllByRole('combobox')
    fireEvent.change(initialSelects[0], { target: { value: '101' } })
    fireEvent.change(initialSelects[1], { target: { value: 'workspace' } })

    const updatedSelects = screen.getAllByRole('combobox')
    fireEvent.change(updatedSelects[2], { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Share' }))

    await waitFor(() => {
      expect(teamAPI.shareStrategy).toHaveBeenCalledWith({
        strategy_id: 101,
        shared_with_user_id: undefined,
        shared_with_team_id: 1,
        permission: 'view',
      })
    })
  })

  it('revokes a sent share', async () => {
    window.history.pushState({}, '', '/team-space?tab=sharing')

    render(<TeamSpace />)

    fireEvent.click(await screen.findByRole('button', { name: 'Revoke' }))

    await waitFor(() => {
      expect(teamAPI.revokeShare).toHaveBeenCalledWith(9)
    })
  })
})