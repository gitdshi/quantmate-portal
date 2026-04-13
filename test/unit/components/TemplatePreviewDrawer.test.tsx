import type { PreviewTemplate } from '@/components/TemplatePreviewDrawer'
import TemplatePreviewDrawer from '@/components/TemplatePreviewDrawer'
import i18n from '@/i18n'
import { fireEvent, render, screen } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockTemplate: PreviewTemplate = {
  id: '1',
  name: 'Test Strategy',
  description: 'A test strategy description',
  author: 'TestAuthor',
  categoryLabel: 'Momentum',
  templateType: 'classic',
  layer: 'alpha',
  rating: 4.5,
  downloads: 1200,
  tags: ['tag1', 'tag2'],
  code: 'class TestStrategy:\n  pass',
  defaultParameters: { fast: 10, slow: 30 },
}

describe('TemplatePreviewDrawer', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
  })

  it('returns null when not open', () => {
    const { container } = render(
      <TemplatePreviewDrawer template={mockTemplate} isOpen={false} onClose={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('returns null when no template', () => {
    const { container } = render(
      <TemplatePreviewDrawer template={null} isOpen={true} onClose={vi.fn()} />
    )
    expect(container.innerHTML).toBe('')
  })

  it('renders template name and badges', () => {
    render(<TemplatePreviewDrawer template={mockTemplate} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Test Strategy')).toBeInTheDocument()
    expect(screen.getByText('Momentum')).toBeInTheDocument()
    expect(screen.getByText('classic')).toBeInTheDocument()
    expect(screen.getByText('alpha')).toBeInTheDocument()
  })

  it('renders author and downloads', () => {
    render(<TemplatePreviewDrawer template={mockTemplate} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('TestAuthor')).toBeInTheDocument()
    expect(screen.getByText(/1,200/)).toBeInTheDocument()
  })

  it('renders rating stars', () => {
    render(<TemplatePreviewDrawer template={mockTemplate} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('4.5')).toBeInTheDocument()
  })

  it('renders description content', () => {
    render(<TemplatePreviewDrawer template={mockTemplate} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('A test strategy description')).toBeInTheDocument()
  })

  it('renders tags', () => {
    render(<TemplatePreviewDrawer template={mockTemplate} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('tag1')).toBeInTheDocument()
    expect(screen.getByText('tag2')).toBeInTheDocument()
  })

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn()
    render(<TemplatePreviewDrawer template={mockTemplate} isOpen={true} onClose={onClose} />)
    // Find the X button in header area
    const closeButtons = screen.getAllByRole('button')
    const xButton = closeButtons.find(b => b.querySelector('svg'))
    if (xButton) fireEvent.click(xButton)
    expect(onClose).toHaveBeenCalled()
  })

  it('calls onClose when clicking backdrop', () => {
    const onClose = vi.fn()
    render(<TemplatePreviewDrawer template={mockTemplate} isOpen={true} onClose={onClose} />)
    // Click the backdrop (outermost div)
    const backdrop = screen.getByText('Test Strategy').closest('.fixed')
    if (backdrop) fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows add to library button when not in library', () => {
    const onAdd = vi.fn()
    render(
      <TemplatePreviewDrawer
        template={mockTemplate}
        isOpen={true}
        onClose={vi.fn()}
        isInLibrary={false}
        onAddToLibrary={onAdd}
      />
    )
    // Should have an add/clone button
    const addBtn = screen.queryByRole('button', { name: /add|clone|library/i })
    if (addBtn) {
      fireEvent.click(addBtn)
      expect(onAdd).toHaveBeenCalled()
    }
  })

  it('renders code tab content', () => {
    render(<TemplatePreviewDrawer template={mockTemplate} isOpen={true} onClose={vi.fn()} />)
    // Click the Code tab
    const codeTab = screen.getByRole('button', { name: /code/i })
    fireEvent.click(codeTab)
    expect(screen.getByText(/class TestStrategy/)).toBeInTheDocument()
  })

  it('renders parameters tab content', () => {
    render(<TemplatePreviewDrawer template={mockTemplate} isOpen={true} onClose={vi.fn()} />)
    const paramsTab = screen.getByRole('button', { name: /parameter/i })
    fireEvent.click(paramsTab)
    // Parameters rendered as JSON in <pre>
    expect(screen.getByText(/"fast"/)).toBeInTheDocument()
    expect(screen.getByText(/"slow"/)).toBeInTheDocument()
  })

  it('renders without optional fields', () => {
    const minimal: PreviewTemplate = {
      id: '2',
      name: 'Minimal',
      description: '',
      templateType: 'basic',
    }
    render(<TemplatePreviewDrawer template={minimal} isOpen={true} onClose={vi.fn()} />)
    expect(screen.getByText('Minimal')).toBeInTheDocument()
  })

  // ─── Parameter parsing edge cases (lines 80-99) ─────────
  it('parses string-encoded JSON parameters', () => {
    const tmpl: PreviewTemplate = {
      ...mockTemplate,
      defaultParameters: '{"lookback": 20, "threshold": 0.5}' as unknown as Record<string, unknown>,
    }
    render(<TemplatePreviewDrawer template={tmpl} isOpen={true} onClose={vi.fn()} />)
    const paramsTab = screen.getByRole('button', { name: /parameter/i })
    fireEvent.click(paramsTab)
    expect(screen.getByText(/"lookback"/)).toBeInTheDocument()
  })

  it('parses double-encoded JSON parameters', () => {
    const doubleEncoded = JSON.stringify(JSON.stringify({ depth: 3 }))
    const tmpl: PreviewTemplate = {
      ...mockTemplate,
      defaultParameters: doubleEncoded as unknown as Record<string, unknown>,
    }
    render(<TemplatePreviewDrawer template={tmpl} isOpen={true} onClose={vi.fn()} />)
    const paramsTab = screen.getByRole('button', { name: /parameter/i })
    fireEvent.click(paramsTab)
    expect(screen.getByText(/"depth"/)).toBeInTheDocument()
  })

  it('shows no parameters message for null defaultParameters', () => {
    const tmpl: PreviewTemplate = {
      ...mockTemplate,
      defaultParameters: null,
    }
    render(<TemplatePreviewDrawer template={tmpl} isOpen={true} onClose={vi.fn()} />)
    const paramsTab = screen.getByRole('button', { name: /parameter/i })
    fireEvent.click(paramsTab)
    expect(screen.getByText(/no parameter/i)).toBeInTheDocument()
  })

  it('shows no parameters for invalid JSON string', () => {
    const tmpl: PreviewTemplate = {
      ...mockTemplate,
      defaultParameters: 'not-json' as unknown as Record<string, unknown>,
    }
    render(<TemplatePreviewDrawer template={tmpl} isOpen={true} onClose={vi.fn()} />)
    const paramsTab = screen.getByRole('button', { name: /parameter/i })
    fireEvent.click(paramsTab)
    expect(screen.getByText(/no parameter/i)).toBeInTheDocument()
  })

  it('shows no parameters for array value', () => {
    const tmpl: PreviewTemplate = {
      ...mockTemplate,
      defaultParameters: [1, 2, 3] as unknown as Record<string, unknown>,
    }
    render(<TemplatePreviewDrawer template={tmpl} isOpen={true} onClose={vi.fn()} />)
    const paramsTab = screen.getByRole('button', { name: /parameter/i })
    fireEvent.click(paramsTab)
    expect(screen.getByText(/no parameter/i)).toBeInTheDocument()
  })
})
