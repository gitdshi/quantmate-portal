import Modal from '@/components/ui/Modal'
import { fireEvent, render, screen } from '@test/support/utils'
import { describe, expect, it, vi } from 'vitest'

describe('Modal', () => {
  it('returns null when open is false', () => {
    const { container } = render(
      <Modal open={false} onClose={vi.fn()} title="Test">
        <p>Content</p>
      </Modal>,
    )
    expect(container.querySelector('.fixed')).toBeNull()
  })

  it('renders title and children when open', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="My Title">
        <p>Modal Body</p>
      </Modal>,
    )
    expect(screen.getByText('My Title')).toBeInTheDocument()
    expect(screen.getByText('Modal Body')).toBeInTheDocument()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose} title="Esc Test">
        <p>Body</p>
      </Modal>,
    )
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(
      <Modal open={true} onClose={onClose} title="Backdrop">
        <p>Body</p>
      </Modal>,
    )
    const backdrop = container.querySelector('.absolute.inset-0')
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  it('renders footer when provided', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Footer" footer={<button>OK</button>}>
        <p>Body</p>
      </Modal>,
    )
    expect(screen.getByRole('button', { name: 'OK' })).toBeInTheDocument()
  })

  it('applies size classes correctly', () => {
    const { container } = render(
      <Modal open={true} onClose={vi.fn()} title="Large" size="lg">
        <p>Body</p>
      </Modal>,
    )
    expect(container.querySelector('.max-w-3xl')).toBeTruthy()
  })
})
