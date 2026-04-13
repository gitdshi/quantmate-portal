import ToggleSwitch from '@/components/ui/ToggleSwitch'
import { fireEvent, render, screen } from '@test/support/utils'
import { describe, expect, it, vi } from 'vitest'

describe('ToggleSwitch', () => {
  it('renders with label', () => {
    render(<ToggleSwitch checked={false} onChange={vi.fn()} label="Enable" />)
    expect(screen.getByText('Enable')).toBeInTheDocument()
  })

  it('calls onChange with toggled value', () => {
    const onChange = vi.fn()
    render(<ToggleSwitch checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not call onChange when disabled', () => {
    const onChange = vi.fn()
    render(<ToggleSwitch checked={false} onChange={onChange} disabled />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('renders without label', () => {
    render(<ToggleSwitch checked={true} onChange={vi.fn()} />)
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })
})
