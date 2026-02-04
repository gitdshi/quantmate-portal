import { userEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockStrategies } from '../../test/mockData'
import { render, screen, waitFor } from '../../test/utils'
import StrategyList from '../StrategyList'

// Mock API
vi.mock('../../lib/api', () => ({
  api: {
    get: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
  strategiesAPI: {
    list: vi.fn(),
    delete: vi.fn(),
  },
}))

import { strategiesAPI } from '../../lib/api'

describe('StrategyList Component', () => {
  const mockOnEdit = vi.fn()
  const mockOnView = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders loading state initially', () => {
    ;(strategiesAPI.list as any).mockImplementation(() => new Promise(() => {}))
    
    render(<StrategyList onEdit={mockOnEdit} onView={mockOnView} />)
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('displays list of strategies', async () => {
    ;(strategiesAPI.list as any).mockResolvedValue({ data: mockStrategies })
    
    render(<StrategyList onEdit={mockOnEdit} onView={mockOnView} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Strategy')).toBeInTheDocument()
      expect(screen.getByText('Another Strategy')).toBeInTheDocument()
    })
  })

  it('shows active/inactive status badges', async () => {
    ;(strategiesAPI.list as any).mockResolvedValue({ data: mockStrategies })
    
    render(<StrategyList onEdit={mockOnEdit} onView={mockOnView} />)
    
    await waitFor(() => {
      const activeBadges = screen.getAllByText('Active')
      const inactiveBadges = screen.getAllByText('Inactive')
      
      expect(activeBadges.length).toBeGreaterThan(0)
      expect(inactiveBadges.length).toBeGreaterThan(0)
    })
  })

  it('calls onView when view button is clicked', async () => {
    const user = userEvent.setup()
    ;(strategiesAPI.list as any).mockResolvedValue({ data: mockStrategies })
    
    render(<StrategyList onEdit={mockOnEdit} onView={mockOnView} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Strategy')).toBeInTheDocument()
    })
    
    const viewButtons = screen.getAllByRole('button', { name: /view/i })
    await user.click(viewButtons[0])
    
    expect(mockOnView).toHaveBeenCalledWith(mockStrategies[0])
  })

  it('calls onEdit when edit button is clicked', async () => {
    const user = userEvent.setup()
    ;(strategiesAPI.list as any).mockResolvedValue({ data: mockStrategies })
    
    render(<StrategyList onEdit={mockOnEdit} onView={mockOnView} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Strategy')).toBeInTheDocument()
    })
    
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    await user.click(editButtons[0])
    
    expect(mockOnEdit).toHaveBeenCalledWith(mockStrategies[0])
  })

  it('confirms before deleting a strategy', async () => {
    const user = userEvent.setup()
    ;(strategiesAPI.list as any).mockResolvedValue({ data: mockStrategies })
    ;(strategiesAPI.delete as any).mockResolvedValue({ data: { success: true } })
    
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)
    
    render(<StrategyList onEdit={mockOnEdit} onView={mockOnView} />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Strategy')).toBeInTheDocument()
    })
    
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])
    
    expect(confirmSpy).toHaveBeenCalled()
    expect(strategiesAPI.delete).not.toHaveBeenCalled()
    
    confirmSpy.mockRestore()
  })

  it('displays empty state when no strategies', async () => {
    ;(strategiesAPI.list as any).mockResolvedValue({ data: [] })
    
    render(<StrategyList onEdit={mockOnEdit} onView={mockOnView} />)
    
    await waitFor(() => {
      expect(screen.getByText(/no strategies/i)).toBeInTheDocument()
    })
  })
})
