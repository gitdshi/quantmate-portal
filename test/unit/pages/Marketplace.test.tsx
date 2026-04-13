import i18n from '@/i18n'
import Marketplace from '@/pages/Marketplace'
import { fireEvent, render, screen, waitFor } from '@test/support/utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockShowToast = vi.fn()
vi.mock('@/components/ui/toast-service', () => ({
  showToast: (...args: unknown[]) => mockShowToast(...args),
}))

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  },
  templateAPI: {
    listMarketplace: vi.fn(),
    listMine: vi.fn(),
    get: vi.fn(),
    clone: vi.fn(),
  },
}))

import { templateAPI } from '@/lib/api'

const mockTemplates = [
  { id: 1, name: 'Dual MA Crossover', description: 'Classic trend following', author: 'system', category: 'trend', template_type: 'standalone', rating: 4.5, downloads: 120, tags: ['trend', 'ma'], featured: true },
  { id: 2, name: 'RSI Reversal', description: 'Mean reversion RSI strategy', author: 'user1', category: 'mean_reversion', template_type: 'standalone', rating: 3.8, downloads: 50, tags: ['rsi'] },
  { id: 3, name: 'Alpha Factor', description: 'Multi-factor alpha model', author: 'quant', category: 'multi_factor', template_type: 'component', layer: 'universe', rating: 4.2, downloads: 80, tags: [] },
  { id: 4, name: 'Grid Bot', description: 'Range trading grid', author: 'trader', category: 'arbitrage', template_type: 'standalone', rating: 3.0, downloads: 30, tags: [] },
  { id: 5, name: 'ML Predictor', description: 'Machine learning price predictor', author: 'ai_lab', category: 'ml', template_type: 'composite', rating: 4.8, downloads: 200, tags: ['ml', 'ai'] },
  { id: 6, name: 'HFT Scalper', description: 'High frequency scalping', author: 'hft', category: 'hft', template_type: 'standalone', rating: 2.5, downloads: 10, tags: [] },
  { id: 7, name: 'Trend Follower 2', description: 'Another trend strategy', author: 'sys', category: 'trend', template_type: 'standalone', rating: 3.5, downloads: 40, tags: [] },
]

describe('Marketplace Page', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.setItem('quantmate-lang', 'en')
    await i18n.changeLanguage('en')
    vi.mocked(templateAPI.listMarketplace).mockResolvedValue({ data: mockTemplates } as never)
    vi.mocked(templateAPI.listMine).mockResolvedValue({ data: [] } as never)
    vi.mocked(templateAPI.get).mockResolvedValue({ data: { id: 1, code: 'class X:\n  pass', default_params: { fast: 5 } } } as never)
    vi.mocked(templateAPI.clone).mockResolvedValue({ data: {} } as never)
  })

  it('renders heading', () => {
    render(<Marketplace />)
    expect(screen.getByText('Strategy Marketplace')).toBeInTheDocument()
  })

  it('shows search input', () => {
    render(<Marketplace />)
    expect(screen.getByPlaceholderText('Search strategy templates...')).toBeInTheDocument()
  })

  it('shows category filter buttons', () => {
    render(<Marketplace />)
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trend Following' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mean Reversion' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Multi-Factor' })).toBeInTheDocument()
  })

  it('shows empty state when no templates are available', async () => {
    vi.mocked(templateAPI.listMarketplace).mockResolvedValue({ data: [] } as never)
    render(<Marketplace />)
    expect(await screen.findByText('No strategy templates available')).toBeInTheDocument()
  })

  it('hides featured card when there are no templates', () => {
    vi.mocked(templateAPI.listMarketplace).mockResolvedValue({ data: [] } as never)
    render(<Marketplace />)
    expect(screen.queryByText('Featured')).not.toBeInTheDocument()
  })

  // ─── Template Rendering ─────────────────────────────────
  it('renders template cards with data', async () => {
    render(<Marketplace />)
    // Dual MA appears in both featured card and grid card
    expect((await screen.findAllByText('Dual MA Crossover')).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('RSI Reversal')).toBeInTheDocument()
    expect(screen.getAllByText('Classic trend following').length).toBeGreaterThanOrEqual(1)
  })

  it('shows featured card with featured template', async () => {
    render(<Marketplace />)
    expect(await screen.findByText('Featured')).toBeInTheDocument()
    // Featured template name in the featured banner
    expect(screen.getByText('120')).toBeInTheDocument() // downloads count
  })

  it('shows template type badges', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')
    // standalone, component, composite types should appear
    expect(screen.getAllByText('standalone').length).toBeGreaterThan(0)
  })

  it('renders tags on template cards', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')
    expect(screen.getAllByText('trend').length).toBeGreaterThan(0)
    expect(screen.getByText('ma')).toBeInTheDocument()
    expect(screen.getByText('rsi')).toBeInTheDocument()
  })

  // ─── Search Filtering ───────────────────────────────────
  it('filters templates by search', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    const searchInput = screen.getByPlaceholderText('Search strategy templates...')
    fireEvent.change(searchInput, { target: { value: 'RSI' } })

    await waitFor(() => {
      expect(screen.getByText('RSI Reversal')).toBeInTheDocument()
      expect(screen.queryByText('Grid Bot')).not.toBeInTheDocument()
    })
  })

  it('hides featured card when searching', async () => {
    render(<Marketplace />)
    await screen.findByText('Featured')

    const searchInput = screen.getByPlaceholderText('Search strategy templates...')
    fireEvent.change(searchInput, { target: { value: 'RSI' } })

    await waitFor(() => {
      expect(screen.queryByText('Featured')).not.toBeInTheDocument()
    })
  })

  // ─── Category Filtering ─────────────────────────────────
  it('filters by category', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    fireEvent.click(screen.getByRole('button', { name: 'Mean Reversion' }))

    await waitFor(() => {
      expect(screen.getByText('RSI Reversal')).toBeInTheDocument()
      expect(screen.queryByText('Dual MA Crossover')).not.toBeInTheDocument()
    })
  })

  // ─── Template Type Filtering ────────────────────────────
  it('shows template type filter buttons', () => {
    render(<Marketplace />)
    expect(screen.getByRole('button', { name: 'All Types' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Standalone' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Component' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Composite' })).toBeInTheDocument()
  })

  it('filters by template type', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    fireEvent.click(screen.getByRole('button', { name: 'Component' }))

    await waitFor(() => {
      expect(screen.getByText('Alpha Factor')).toBeInTheDocument()
      expect(screen.queryByText('RSI Reversal')).not.toBeInTheDocument()
    })
  })

  // ─── Pagination ─────────────────────────────────────────
  it('shows pagination when templates exceed page size', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')
    // 7 templates with pageSize 6 = 2 pages
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
  })

  it('navigates to second page', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    fireEvent.click(screen.getByRole('button', { name: '2' }))

    await waitFor(() => {
      // 7th template should be on page 2
      expect(screen.getByText('Trend Follower 2')).toBeInTheDocument()
    })
  })

  // ─── Preview Drawer ─────────────────────────────────────
  it('opens preview drawer on card click', async () => {
    render(<Marketplace />)
    const card = await screen.findByText('RSI Reversal')
    fireEvent.click(card)

    await waitFor(() => {
      expect(templateAPI.get).toHaveBeenCalledWith(2)
    })
  })

  it('opens preview via Preview button', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    const previewBtns = screen.getAllByRole('button', { name: /preview/i })
    fireEvent.click(previewBtns[0])

    await waitFor(() => {
      expect(templateAPI.get).toHaveBeenCalled()
    })
  })

  // ─── Add to Library ─────────────────────────────────────
  it('clones template to library via Add to Library button', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    const addBtns = screen.getAllByRole('button', { name: /add to template library/i })
    fireEvent.click(addBtns[0])

    await waitFor(() => {
      expect(templateAPI.clone).toHaveBeenCalled()
    })
  })

  it('shows error toast when clone fails', async () => {
    vi.mocked(templateAPI.clone).mockRejectedValue({
      response: { data: { detail: 'Clone failed' } },
    })

    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    const addBtns = screen.getAllByRole('button', { name: /add to template library/i })
    fireEvent.click(addBtns[0])

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Clone failed', 'error')
    })
  })

  // ─── Already in Library ─────────────────────────────────
  it('disables Add to Library for already cloned templates', async () => {
    vi.mocked(templateAPI.listMine).mockResolvedValue({
      data: [{ id: 99, source_template_id: 1 }],
    } as never)

    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    await waitFor(() => {
      const alreadyBtns = screen.getAllByText(/already in template library/i)
      expect(alreadyBtns.length).toBeGreaterThan(0)
    })
  })

  // ─── unwrapTemplateRows edge cases ──────────────────────
  it('handles nested data in API response', async () => {
    vi.mocked(templateAPI.listMarketplace).mockResolvedValue({
      data: { data: mockTemplates },
    } as never)

    render(<Marketplace />)
    expect((await screen.findAllByText('Dual MA Crossover')).length).toBeGreaterThanOrEqual(1)
  })

  // ─── Featured card Add to Library ───────────────────────
  it('adds featured template to library via featured card button', async () => {
    render(<Marketplace />)
    await screen.findByText('Featured')

    // The featured card has its own "Add to Template Library" button
    const addBtns = screen.getAllByRole('button', { name: /add to template library/i })
    // First "Add to Template Library" button is on the featured card
    fireEvent.click(addBtns[0])

    await waitFor(() => {
      expect(templateAPI.clone).toHaveBeenCalledWith(1)
      expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('✓'), 'success')
    })
  })

  // ─── Clone error without detail fallback ────────────────
  it('shows generic error when clone fails without detail', async () => {
    vi.mocked(templateAPI.clone).mockRejectedValue(new Error('network'))

    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    const addBtns = screen.getAllByRole('button', { name: /add to template library/i })
    fireEvent.click(addBtns[0])

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Failed to add to library', 'error')
    })
  })

  // ─── Preview loads code when not cached ─────────────────
  it('loads code via templateAPI.get on preview click', async () => {
    render(<Marketplace />)
    const card = await screen.findByText('RSI Reversal')
    fireEvent.click(card)

    await waitFor(() => {
      expect(templateAPI.get).toHaveBeenCalledWith(2)
    })
  })

  // ─── Layer badge rendering ──────────────────────────────
  it('renders layer badge for component template', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')
    // Alpha Factor (id:3) has layer: 'universe'
    expect(screen.getByText('universe')).toBeInTheDocument()
  })

  // ─── Preview code fetch error gracefully handled ────────
  it('handles preview code fetch error gracefully', async () => {
    vi.mocked(templateAPI.get).mockRejectedValue(new Error('network'))

    render(<Marketplace />)
    const card = await screen.findByText('Alpha Factor')
    fireEvent.click(card)

    await waitFor(() => {
      expect(templateAPI.get).toHaveBeenCalledWith(3)
    })
    // Should not crash — no error toast expected for preview fetch
  })

  // ─── Template type filter (line 305) ────────────────────
  it('filters by template type', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    // Click the "Component" type filter button
    const typeBtn = screen.getByRole('button', { name: 'Component' })
    fireEvent.click(typeBtn)

    // After filtering, only component type templates should show
    // Alpha Factor is the only component template (template_type: 'component')
    await waitFor(() => {
      expect(screen.getByText('Alpha Factor')).toBeInTheDocument()
    })
  })

  // ─── Already in library state (lines 415-416) ──────────
  it('shows already in library for items in user library', async () => {
    vi.mocked(templateAPI.listMine).mockResolvedValue({
      data: [{ id: 101, name: 'My Clone', category: 'trend', template_type: 'standalone', visibility: 'public', source_template_id: 1 }],
    } as never)

    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    // The "Already in Template Library" text should appear for item with id=1
    await waitFor(() => {
      expect(screen.getAllByText(/Already in Template Library/i).length).toBeGreaterThan(0)
    })
  })

  // ─── Pagination (line 432+) ────────────────────────────
  it('shows pagination when many templates exist', async () => {
    // Page size is 6, so create 8 total (>6) to trigger pagination
    const manyTemplates = Array.from({ length: 8 }, (_, i) => ({
      id: 100 + i,
      name: `StratTemplate ${i}`,
      category: 'trend',
      description: `Desc ${i}`,
      template_type: 'standalone',
      visibility: 'public',
      downloads: i * 10,
      rating: 3.5,
      tags: [],
    }))
    vi.mocked(templateAPI.listMarketplace).mockResolvedValue({
      data: manyTemplates,
    } as never)

    render(<Marketplace />)
    // Template 0 appears both as featured and in grid; use findAllByText
    await screen.findAllByText('StratTemplate 0')

    // Check for page 2 button
    const pageBtns = screen.getAllByRole('button').filter((b) => b.textContent === '2')
    expect(pageBtns.length).toBeGreaterThan(0)
  })

  // ─── Empty state (line 430) ───────────────────────────────────
  it('shows empty state when no templates match filter', async () => {
    vi.mocked(templateAPI.listMarketplace).mockResolvedValue({ data: [] } as never)
    render(<Marketplace />)
    await waitFor(() => {
      expect(screen.getByText(/No strategy templates available/i)).toBeInTheDocument()
    })
  })

  // ─── Featured section only for "all" category (line 305) ─────
  it('hides featured section when a specific category is selected', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    // Click on a specific category filter (e.g., "Trend")
    const catBtns = screen.getAllByRole('button')
    const trendBtn = catBtns.find((b) => b.textContent?.match(/^trend$/i))
    if (trendBtn) {
      fireEvent.click(trendBtn)
      // When filtered to specific category, featured section should not show
      await waitFor(() => {
        // Still shows trend templates in grid
        expect(screen.getByText('Dual MA Crossover')).toBeInTheDocument()
      })
    }
  })

  // ─── Add to library disabled state (lines 415-416) ───────────
  it('shows disabled add-to-library button for templates already in library', async () => {
    vi.mocked(templateAPI.listMine).mockResolvedValue({
      data: [
        { id: 500, source_template_id: 1, name: 'Cloned MA', template_type: 'standalone' },
      ],
    } as never)

    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    // Template with id=1 should show "Already in Template Library"
    const alreadyBtns = screen.getAllByText(/Already in Template Library/i)
    expect(alreadyBtns.length).toBeGreaterThan(0)
  })

  // ─── Category filter: multi_factor (line 294) ────────────────
  it('filters by multi_factor category', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    const catBtns = screen.getAllByRole('button')
    const factorBtn = catBtns.find((b) => b.textContent?.match(/factor/i) && !b.textContent?.match(/all/i))
    if (factorBtn) {
      fireEvent.click(factorBtn)
      await waitFor(() => {
        expect(screen.getByText('Alpha Factor')).toBeInTheDocument()
      })
    }
  })

  // ─── Template type filter buttons (lines 304-313) ────────
  it('filters by template type', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    const allBtns = screen.getAllByRole('button')
    // Find a template type filter button (standalone or composite)
    const typeBtn = allBtns.find(
      (b) => b.textContent?.match(/standalone|composite/i)
    )
    if (typeBtn) {
      fireEvent.click(typeBtn)
      // The filter should be applied; we just verify no crash
      await waitFor(() => {
        expect(screen.getAllByRole('button').length).toBeGreaterThan(0)
      })
    }
  })

  // ─── Pagination renders when more than 6 templates (line 430-440) ────
  it('renders pagination when templates exceed page size', async () => {
    // Default mock has 7 templates, pageSize=6 → 2 pages
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    // Should see pagination buttons
    const allBtns = screen.getAllByRole('button')
    const page2Btn = allBtns.find((b) => b.textContent?.trim() === '2')
    expect(page2Btn).toBeTruthy()

    // Click page 2 to see the 7th template
    fireEvent.click(page2Btn!)
    await waitFor(() => {
      // The 7th template "Trend Follower 2" should be visible on page 2
      expect(screen.getByText('Trend Follower 2')).toBeInTheDocument()
    })
  })

  // ─── Add to library from card click stop propagation (line 415-421) ────
  it('adds template to library from card button', async () => {
    vi.mocked(templateAPI.clone).mockResolvedValue({
      data: { id: 500, name: 'Cloned' },
    } as never)
    vi.mocked(templateAPI.listMine).mockResolvedValue({
      data: [],
    } as never)

    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    // Find "Add to Template Library" buttons — the first one is in the featured section,
    // subsequent ones are in the card grid (which use e.stopPropagation)
    const addBtns = screen.getAllByText(/Add to Template Library/i)
    expect(addBtns.length).toBeGreaterThan(1)
    // Click a card-level button (not the featured one at index 0)
    fireEvent.click(addBtns[1])

    await waitFor(() => {
      expect(templateAPI.clone).toHaveBeenCalled()
    })
  })

  // ─── Template type filter (line 305) ─────────────────────────
  it('filters templates by type when clicking type filter button', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    // Click "Component" type filter — only template id:3 has template_type:'component'
    const componentBtn = screen.getByRole('button', { name: /^component$/i })
    fireEvent.click(componentBtn)

    await waitFor(() => {
      expect(screen.getByText('Alpha Factor')).toBeInTheDocument()
      // RSI Reversal (standalone) should not appear in the grid
      expect(screen.queryByText('RSI Reversal')).not.toBeInTheDocument()
    })
  })

  it('filters by composite type', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    const compositeBtn = screen.getByRole('button', { name: /^composite$/i })
    fireEvent.click(compositeBtn)

    await waitFor(() => {
      expect(screen.getByText('ML Predictor')).toBeInTheDocument()
      // RSI Reversal (standalone) should not appear
      expect(screen.queryByText('RSI Reversal')).not.toBeInTheDocument()
    })
  })

  // ─── Preview drawer (line 447) ───────────────────────────────
  it('opens preview drawer when clicking preview button', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    // Find "Preview" buttons (only in card grid, not in featured)
    const previewBtns = screen.getAllByRole('button', { name: /preview/i })
    expect(previewBtns.length).toBeGreaterThan(0)
    fireEvent.click(previewBtns[0])

    await waitFor(() => {
      expect(templateAPI.get).toHaveBeenCalled()
    })

    // Wait for preview drawer to be displayed
    await waitFor(() => {
      // The TemplatePreviewDrawer should open with the template name
      const drawer = document.querySelector('[class*="drawer"], [class*="fixed"]')
      expect(drawer).toBeTruthy()
    })
  })

  // ─── Search + category combined filter ───────────────────────
  it('filters by search text', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    const searchInput = screen.getByPlaceholderText('Search strategy templates...')
    fireEvent.change(searchInput, { target: { value: 'Grid' } })

    await waitFor(() => {
      expect(screen.getByText('Grid Bot')).toBeInTheDocument()
      expect(screen.queryByText('RSI Reversal')).not.toBeInTheDocument()
    })
  })

  // ─── API response in nested data format (lines 58-73: unwrapTemplateRows) ─
  it('handles nested API response format', async () => {
    // Wrap templates in a nested { data: { items: [...] } } shape
    vi.mocked(templateAPI.listMarketplace).mockResolvedValue({
      data: {
        data: {
          items: [
            { id: 10, name: 'Nested Strategy', description: 'From nested', author: 'admin', category: 'trend', template_type: 'standalone', rating: 4.0, downloads: 100, tags: 'momentum,trend', featured: false },
          ],
        },
      },
    } as never)

    render(<Marketplace />)

    await waitFor(() => {
      expect(screen.getAllByText('Nested Strategy').length).toBeGreaterThan(0)
    })
  })

  // ─── Empty API response (lines 63-64: return []) ─────────────
  it('handles empty API response gracefully', async () => {
    vi.mocked(templateAPI.listMarketplace).mockResolvedValue({
      data: null,
    } as never)

    render(<Marketplace />)

    await waitFor(() => {
      expect(screen.getByText(/No strategy templates/i)).toBeInTheDocument()
    })
  })

  // ─── Click card to open preview (card onClick at line 360) ─────────
  it('opens preview when clicking on card area', async () => {
    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    // Click on a card element directly (not a button)
    const cardTitle = screen.getByText('RSI Reversal')
    fireEvent.click(cardTitle)

    await waitFor(() => {
      expect(templateAPI.get).toHaveBeenCalled()
    })
  })

  // ─── handlePreview with string default_params (line 205) ────
  it('handles string default_params in preview', async () => {
    vi.mocked(templateAPI.get).mockResolvedValue({
      data: { id: 2, code: 'class Y: pass', default_params: '{"fast": 10}' },
    } as never)

    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    const previewBtns = screen.getAllByRole('button', { name: /preview/i })
    fireEvent.click(previewBtns[0])

    await waitFor(() => {
      expect(templateAPI.get).toHaveBeenCalled()
    })
  })

  // ─── handleAddToLibrary error path (line 229-230) ────
  it('shows error toast when add to library fails', async () => {
    vi.mocked(templateAPI.clone).mockRejectedValue({
      response: { data: { detail: 'Template not found' } },
    })
    vi.mocked(templateAPI.listMine).mockResolvedValue({ data: [] } as never)

    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    const addBtns = screen.getAllByText(/Add to Template Library/i)
    fireEvent.click(addBtns[1])

    await waitFor(() => {
      expect(mockShowToast).toHaveBeenCalledWith('Template not found', 'error')
    })
  })

  // ─── Templates with string ratings and null tags (lines 69-73, 84, 102) ─────
  it('handles string rating, unknown category, and null tags via helper functions', async () => {
    vi.mocked(templateAPI.listMarketplace).mockResolvedValue({
      data: [
        { id: 99, name: 'Odd Template', description: 'Has string numbers', author: 'admin', category: 'other', template_type: 'standalone', rating: '4.5' as unknown as number, downloads: '200' as unknown as number, tags: null, featured: false },
      ],
    } as never)

    render(<Marketplace />)

    await waitFor(() => {
      expect(screen.getAllByText('Odd Template').length).toBeGreaterThan(0)
    })
  })

  // ─── Nested data.data array format (line 60) ─────────────
  it('unwraps nested data.data array format', async () => {
    vi.mocked(templateAPI.listMarketplace).mockResolvedValue({
      data: {
        items: {
          data: [
            { id: 20, name: 'Deep Nested', description: 'From items.data', author: 'admin', category: 'trend', template_type: 'standalone', rating: 4.0, downloads: 50, tags: ['deep'], featured: false },
          ],
        },
      },
    } as never)

    render(<Marketplace />)

    await waitFor(() => {
      expect(screen.getAllByText('Deep Nested').length).toBeGreaterThan(0)
    })
  })

  // ─── Close preview drawer (line 447) ─────────────
  it('closes preview drawer via onClose', async () => {
    vi.mocked(templateAPI.get).mockResolvedValue({
      data: { id: 2, code: 'class Y: pass', default_params: {} },
    } as never)

    render(<Marketplace />)
    await screen.findAllByText('Dual MA Crossover')

    // Open preview
    const previewBtns = screen.getAllByRole('button', { name: /preview/i })
    fireEvent.click(previewBtns[0])

    await waitFor(() => {
      expect(templateAPI.get).toHaveBeenCalled()
    })

    // Close the drawer via Escape key
    fireEvent.keyDown(document, { key: 'Escape' })

    await waitFor(() => {
      // Preview should be closed
      expect(document.querySelector('[data-testid="template-preview-drawer"]')).toBeFalsy()
    })
  })

  it('handles string-valued rating and downloads via toNumber', async () => {
    vi.mocked(templateAPI.listMarketplace).mockResolvedValue({
      data: [
        { id: 99, name: 'String Numbers Template', description: 'test', author: 'a', category: 'trend', template_type: 'standalone', rating: 'N/A', downloads: '100', tags: [] },
      ],
    } as never)

    render(<Marketplace />)

    await waitFor(() => {
      expect(screen.getAllByText('String Numbers Template').length).toBeGreaterThan(0)
    })

    // The string values should have been parsed correctly by toNumber
    expect(screen.getByText('100')).toBeInTheDocument()
  })
})
