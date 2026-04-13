import FilterBar from '@/components/ui/FilterBar'
import i18n from '@/i18n'
import { fireEvent, render, screen } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('FilterBar', () => {
  beforeEach(async () => {
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
  })

  it('renders search input when onSearchChange is provided', () => {
    const onChange = vi.fn()
    render(<FilterBar searchValue="" onSearchChange={onChange} />)
    const input = screen.getByRole('textbox')
    expect(input).toBeInTheDocument()
    fireEvent.change(input, { target: { value: 'hello' } })
    expect(onChange).toHaveBeenCalledWith('hello')
  })

  it('renders filter select elements with options', () => {
    const onChange = vi.fn()
    const { container } = render(
      <FilterBar
        filters={[
          {
            key: 'status',
            value: '',
            options: [
              { value: 'active', label: 'Active' },
              { value: 'draft', label: 'Draft' },
            ],
            onChange,
            placeholder: 'All statuses',
          },
        ]}
      />,
    )
    const selects = container.querySelectorAll('select')
    expect(selects.length).toBe(1)
    // Placeholder + 2 options = 3 total options
    expect(selects[0].querySelectorAll('option').length).toBe(3)
    fireEvent.change(selects[0], { target: { value: 'active' } })
    expect(onChange).toHaveBeenCalledWith('active')
  })

  it('renders children', () => {
    render(
      <FilterBar>
        <button>Custom Action</button>
      </FilterBar>,
    )
    expect(screen.getByRole('button', { name: 'Custom Action' })).toBeInTheDocument()
  })
})
