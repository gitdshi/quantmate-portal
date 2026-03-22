import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@test/support/utils'
import TeamSpace from '@/pages/TeamSpace'

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  teamAPI: {
    listWorkspaces: vi.fn(),
  },
}))

import { teamAPI } from '@/lib/api'

describe('TeamSpace Page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(teamAPI.listWorkspaces as any).mockResolvedValue({ data: [] })
  })

  it('renders heading', () => {
    render(<TeamSpace />)
    expect(screen.getByText('团队空间')).toBeInTheDocument()
  })

  it('shows create workspace button', () => {
    render(<TeamSpace />)
    expect(screen.getByText('创建空间')).toBeInTheDocument()
  })

  it('shows placeholder workspace cards', () => {
    render(<TeamSpace />)
    expect(screen.getByText('量化研究团队')).toBeInTheDocument()
    expect(screen.getByText('实盘交易组')).toBeInTheDocument()
  })

  it('drills into workspace detail on click', () => {
    render(<TeamSpace />)
    fireEvent.click(screen.getByText('量化研究团队'))
    expect(screen.getByText('返回工作空间列表')).toBeInTheDocument()
    expect(screen.getByText('张涛')).toBeInTheDocument()
    expect(screen.getByText('李明')).toBeInTheDocument()
  })

  it('shows invite member button in detail view', () => {
    render(<TeamSpace />)
    fireEvent.click(screen.getByText('量化研究团队'))
    expect(screen.getByText('邀请成员')).toBeInTheDocument()
  })
})


