import React from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  children: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error | null
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

function ErrorFallback({ error }: { error?: Error | null }) {
  const { t } = useTranslation('common')
  return (
    <div className="p-4 bg-destructive/10 text-destructive rounded">
      <strong>{t('errorBoundary')}</strong>
      <div className="mt-2 text-sm">{String(error)}</div>
    </div>
  )
}
