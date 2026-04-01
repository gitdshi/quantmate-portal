import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@test/support/utils'
import userEvent from '@testing-library/user-event'
import i18n from '@/i18n'
import Pagination from '@/components/Pagination'

describe('Pagination Component', () => {
  beforeEach(async () => {
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
  })

  const defaultProps = {
    page: 1,
    pageSize: 10,
    total: 50,
    onPageChange: vi.fn(),
  }

  it('renders page information', () => {
    render(<Pagination {...defaultProps} />)
    expect(screen.getByText(/showing/i)).toHaveTextContent('1')
    expect(screen.getByText(/showing/i)).toHaveTextContent('10')
    expect(screen.getByText(/showing/i)).toHaveTextContent('50')
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
    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeDisabled()
    expect(buttons[1]).toBeDisabled()
  })

  it('disables next on last page', () => {
    render(<Pagination {...defaultProps} page={5} />)
    const buttons = screen.getAllByRole('button')
    expect(buttons[buttons.length - 2]).toBeDisabled()
    expect(buttons[buttons.length - 1]).toBeDisabled()
  })

  it('calls onPageChange when clicking page button', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />)
    await user.click(screen.getByRole('button', { name: '3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('calls onPageChange for next/previous', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(<Pagination {...defaultProps} page={2} onPageChange={onPageChange} />)
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[1])
    expect(onPageChange).toHaveBeenCalledWith(1)
    await user.click(buttons[buttons.length - 2])
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  it('renders page size selector when onPageSizeChange provided', () => {
    render(
      <Pagination
        {...defaultProps}
        onPageSizeChange={vi.fn()}
      />
    )
    expect(screen.getByText(/per page/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
  })

  it('hides when total is 0', () => {
    const { container } = render(<Pagination {...defaultProps} total={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows ellipsis for many pages', () => {
    render(<Pagination {...defaultProps} total={200} pageSize={10} page={10} />)
    const ellipses = screen.getAllByText('...')
    expect(ellipses.length).toBeGreaterThanOrEqual(1)
  })
})


