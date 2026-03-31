import { useMutation } from '@tanstack/react-query'
import { Globe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'

import { authAPI } from '../../lib/api'
import { useAuthStore } from '../../stores/auth'

export default function Login() {
  const { t, i18n } = useTranslation(['auth', 'nav'])
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const loginMutation = useMutation({
    mutationFn: () => authAPI.login(username, password),
    onSuccess: (response) => {
      const { user, access_token, refresh_token } = response.data
      setAuth(user, access_token, refresh_token)
      navigate('/')
    },
    onError: (err: unknown) => {
      const responseError = err as {
        response?: { data?: { detail?: string; error?: { message?: string } } }
      }
      setError(
        responseError.response?.data?.error?.message ||
          responseError.response?.data?.detail ||
          t('loginFailed')
      )
    },
  })

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    loginMutation.mutate()
  }

  const currentLanguage = i18n.resolvedLanguage ?? i18n.language

  const toggleLanguage = () => {
    const next = currentLanguage.startsWith('zh') ? 'en' : 'zh'
    localStorage.setItem('quantmate-lang', next)
    void i18n.changeLanguage(next)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-4 flex w-full max-w-md justify-end">
        <button
          type="button"
          onClick={toggleLanguage}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
          title={t('switchLang', { ns: 'nav' })}
        >
          <Globe className="h-4 w-4" />
          <span>{currentLanguage.startsWith('zh') ? 'English' : '中文'}</span>
        </button>
      </div>

      <div className="w-full max-w-md mb-6 rounded-lg overflow-hidden shadow-md">
        <img src="/banner.svg" alt="QuantMate Platform" className="w-full h-auto" />
      </div>

      <div className="w-full max-w-md">
        <div className="bg-card p-8 rounded-lg shadow-lg border border-border">
          <div className="flex items-center justify-center mb-8">
            <img src="/logo.svg" alt="QuantMate" className="h-10 w-auto" />
          </div>

          <h1 className="text-2xl font-bold text-center mb-2">{t('welcome')}</h1>
          <p className="text-muted-foreground text-center mb-8">{t('signInPrompt')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium mb-2">
                {t('username')}
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loginMutation.isPending ? t('signingIn') : t('signIn')}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link to="/register" className="text-primary hover:underline font-medium">
              {t('signUp')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
