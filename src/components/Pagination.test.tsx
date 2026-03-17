import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '../test/utils'
import Pagination from './Pagination'

describe('Pagination Component', () => {
  const defaultProps = {
    page: 1,
    pageSize: 10,
    total: 50,
    onPageChange: vi.fn(),
  }

  it('renders page information', () => {
    render(<Pagination {...defaultProps} />)
    expect(screen.getByText(/Showing 1–10 of 50/)).toBeInTheDocument()
  })

  it('renders page buttons', () => {
    render(<Pagination {...defaultProps} />)
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '5' })).toBeInTheDocument()
  })

  it('highlights current page', () => {
    render(<Pagination {...defaultProps} page={3} />)
    const btn = screen.getByRole('button', { name: '3' })
    expect(btn.className).toContain('bg-primary')
  })

  it('disables previous on first page', () => {
    render(<Pagination {...defaultProps} page={1} />)
    const prevBtn = screen.getByTitle('Previous page')
    expect(prevBtn).toBeDisabled()
    const firstBtn = screen.getByTitle('First page')
    expect(firstBtn).toBeDisabled()
  })

  it('disables next on last page', () => {
    render(<Pagination {...defaultProps} page={5} />)
    const nextBtn = screen.getByTitle('Next page')
    expect(nextBtn).toBeDisabled()
    const lastBtn = screen.getByTitle('Last page')
    expect(lastBtn).toBeDisabled()
  })

  it('calls onPageChange when clicking page button', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />)
    await user.click(screen.getByRole('button', { name: '3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange for next/previous', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination {...defaultProps} page={2} onPageChange={onPageChange} />)
    await user.click(screen.getByTitle('Previous page'))
    expect(onPageChange).toHaveBeenCalledWith(1)
    await user.click(screen.getByTitle('Next page'))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('renders page size selector when onPageSizeChange provided', () => {
    render(
      <Pagination
        {...defaultProps}
        onPageSizeChange={vi.fn()}
      />
    )
    expect(screen.getByText('Per page:')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  })

  it('hides when total is 0', () => {
    const { container } = render(<Pagination {...defaultProps} total={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows ellipsis for many pages', () => {
    render(<Pagination {...defaultProps} total={200} pageSize={10} page={10} />)
    const ellipses = screen.getAllByText('…')
    expect(ellipses.length).toBeGreaterThanOrEqual(1)
  })
})
