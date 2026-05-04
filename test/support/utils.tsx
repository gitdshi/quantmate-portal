import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { RenderOptions } from '@testing-library/react'
import { render } from '@testing-library/react'
import { useState, type ReactElement } from 'react'
import { BrowserRouter } from 'react-router-dom'

const testQueryClients = new Set<QueryClient>()

// Create a new QueryClient for each test
export function createTestQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  })

  testQueryClients.add(client)
  return client
}

export function cleanupTestQueryClients() {
  for (const client of testQueryClients) {
    client.cancelQueries()
    client.clear()
  }
  testQueryClients.clear()
}

interface AllTheProvidersProps {
  children: React.ReactNode
}

export function AllTheProviders({ children }: AllTheProvidersProps) {
  const [testQueryClient] = useState(() => createTestQueryClient())

  return (
    <QueryClientProvider client={testQueryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

