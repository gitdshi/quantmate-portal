import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '../test/utils'
import TeamSpace from './TeamSpace'

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  teamAPI: {
    listWorkspaces: vi.fn(),
    getWorkspace: vi.fn(),
    createWorkspace: vi.fn(),
    updateWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    listMembers: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
    listSharedWithMe: vi.fn(),
    shareStrategy: vi.fn(),
    revokeShare: vi.fn(),
  },
}))

import { teamAPI } from '../lib/api'

const mockWorkspaces = [
  { id: 1, name: 'Alpha Team', description: 'Quantitative research team', owner_id: 1, max_members: 10, status: 'active', created_at: '2025-01-01T00:00:00Z', updated_at: '2025-01-01T00:00:00Z' },
]

const mockMembers = [
  { workspace_id: 1, user_id: 1, username: 'admin', role: 'owner', joined_at: '2025-01-01T00:00:00Z' },
  { workspace_id: 1, user_id: 2, username: 'trader', role: 'member', joined_at: '2025-01-02T00:00:00Z' },
]

const mockShares = [
  { id: 1, strategy_id: 5, shared_by: 2, shared_with_user_id: 1, permission: 'view', created_at: '2025-01-03T00:00:00Z' },
]

describe('TeamSpace Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(teamAPI.listWorkspaces as any).mockResolvedValue({ data: mockWorkspaces })
    ;(teamAPI.listMembers as any).mockResolvedValue({ data: mockMembers })
    ;(teamAPI.listSharedWithMe as any).mockResolvedValue({ data: mockShares })
    ;(teamAPI.createWorkspace as any).mockResolvedValue({ data: { id: 2 } })
    ;(teamAPI.deleteWorkspace as any).mockResolvedValue({})
    ;(teamAPI.addMember as any).mockResolvedValue({})
    ;(teamAPI.removeMember as any).mockResolvedValue({})
    ;(teamAPI.shareStrategy as any).mockResolvedValue({ data: { id: 2 } })
    ;(teamAPI.revokeShare as any).mockResolvedValue({})
  })

  it('renders heading', () => {
    render(<TeamSpace />)
    expect(screen.getByTestId('team-space-page')).toBeInTheDocument()
    expect(screen.getByText('Team Space')).toBeInTheDocument()
  })

  it('shows workspaces after loading', async () => {
    render(<TeamSpace />)
    await waitFor(() => {
      expect(screen.getByText('Alpha Team')).toBeInTheDocument()
    })
  })

  it('shows shared strategies', async () => {
    render(<TeamSpace />)
    await waitFor(() => {
      expect(screen.getByText('Strategy #5')).toBeInTheDocument()
    })
  })

  it('selects workspace and shows members', async () => {
    render(<TeamSpace />)
    await waitFor(() => { screen.getByText('Alpha Team') })
    fireEvent.click(screen.getByText('Alpha Team'))
    await waitFor(() => {
      expect(screen.getByText('admin')).toBeInTheDocument()
      expect(screen.getByText('trader')).toBeInTheDocument()
    })
  })

  it('shows member roles', async () => {
    render(<TeamSpace />)
    await waitFor(() => { screen.getByText('Alpha Team') })
    fireEvent.click(screen.getByText('Alpha Team'))
    await waitFor(() => {
      expect(screen.getByText('owner')).toBeInTheDocument()
      expect(screen.getByText('member')).toBeInTheDocument()
    })
  })

  it('has New Workspace button', () => {
    render(<TeamSpace />)
    expect(screen.getByText('New Workspace')).toBeInTheDocument()
  })

  it('opens create workspace modal', async () => {
    render(<TeamSpace />)
    fireEvent.click(screen.getByText('New Workspace'))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Workspace name')).toBeInTheDocument()
    })
  })

  it('has Share Strategy button', () => {
    render(<TeamSpace />)
    expect(screen.getByText('Share Strategy')).toBeInTheDocument()
  })

  it('shows empty workspace state', async () => {
    render(<TeamSpace />)
    await waitFor(() => {
      expect(screen.getByText('Select a workspace to manage')).toBeInTheDocument()
    })
  })

  it('handles loading error', async () => {
    ;(teamAPI.listWorkspaces as any).mockRejectedValue(new Error('fail'))
    render(<TeamSpace />)
    await waitFor(() => {
      expect(screen.getByText('Failed to load workspaces')).toBeInTheDocument()
    })
  })
})
