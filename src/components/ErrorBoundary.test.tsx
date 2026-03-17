/**
 * ErrorBoundary Component Tests
 */
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '../test/utils'
import ErrorBoundary from './ErrorBoundary'

// Component that throws
function ThrowingComponent({ msg }: { msg: string }) {
  throw new Error(msg)
}

// Component that renders normally
function GoodComponent() {
  return <div>All good</div>
}

describe('ErrorBoundary', () => {
  // Suppress console.error for expected errors in tests
  const originalConsoleError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })
  afterEach(() => {
    console.error = originalConsoleError
  })

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <GoodComponent />
      </ErrorBoundary>
    )
    expect(screen.getByText('All good')).toBeInTheDocument()
  })

  it('displays error message when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent msg="test failure" />
      </ErrorBoundary>
    )
    expect(screen.getByText('Something went wrong loading this component.')).toBeInTheDocument()
  })

  it('displays the error text', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent msg="specific error" />
      </ErrorBoundary>
    )
    expect(screen.getByText(/specific error/)).toBeInTheDocument()
  })

  it('logs error to console.error', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent msg="logged error" />
      </ErrorBoundary>
    )
    expect(console.error).toHaveBeenCalled()
  })
})
