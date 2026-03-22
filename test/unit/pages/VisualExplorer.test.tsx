import { describe, expect, it, vi } from 'vitest'
import { render } from '@test/support/utils'
import VisualExplorer from '@/pages/VisualExplorer'

// Mock Navigate to capture the redirect
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: (props: any) => { mockNavigate(props); return null },
  }
})

describe('VisualExplorer Page', () => {
  it('redirects to /analytics', () => {
    render(<VisualExplorer />)
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.objectContaining({ to: '/analytics', replace: true }),
    )
  })
})


