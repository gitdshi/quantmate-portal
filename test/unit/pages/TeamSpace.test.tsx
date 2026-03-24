import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import i18n from '@/i18n'
import TeamSpace from '@/pages/TeamSpace'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  teamAPI: {
    listWorkspaces: vi.fn(),
    listMembers: vi.fn(),
  },
}))

import { teamAPI } from '@/lib/api'

const workspaces = [
  {
    id: '1',
    name: 'Quant Research Team',
    description: 'Research and signal generation',
    members: 2,
    strategies: 5,
    created_at: '2025-01-01',
    role: 'owner',
  },
]

const members = [
  {
    id: '1',
    username: 'Daniel',
    email: 'daniel@example.com',
    role: 'owner',
    joined_at: '2025-01-01',
    last_active: '2025-01-02',
  },
]

describe('TeamSpace Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(teamAPI.listWorkspaces).mockResolvedValue({ data: workspaces } as never)
    vi.mocked(teamAPI.listMembers).mockResolvedValue({ data: members } as never)
  })

  it('renders heading', () => {
    render(<TeamSpace />)
    expect(screen.getByText('Team Space')).toBeInTheDocument()
  })

  it('shows create workspace button', () => {
    render(<TeamSpace />)
    expect(screen.getByText('Create Workspace')).toBeInTheDocument()
  })

  it('shows workspace cards from API data', async () => {
    render(<TeamSpace />)
    expect(await screen.findByText('Quant Research Team')).toBeInTheDocument()
  })

  it('drills into workspace detail on click', async () => {
    render(<TeamSpace />)
    fireEvent.click(await screen.findByText('Quant Research Team'))
    expect(await screen.findByText('Back to workspace list')).toBeInTheDocument()
    expect(screen.getByText(/Member Management/)).toBeInTheDocument()
    expect(screen.getByText('No members yet')).toBeInTheDocument()
  })

  it('shows invite member button in detail view', async () => {
    render(<TeamSpace />)
    fireEvent.click(await screen.findByText('Quant Research Team'))
    expect(await screen.findByText('Invite Member')).toBeInTheDocument()
  })
})
