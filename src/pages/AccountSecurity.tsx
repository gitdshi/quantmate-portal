import { useCallback, useEffect, useState } from 'react'
import {
  Copy, Key, Loader2, Monitor, Plus, Shield, ShieldCheck, Smartphone,
  Trash2, X
} from 'lucide-react'
import { accountSecurityAPI } from '../lib/api'
import type { APIKey, UserSession } from '../types'

type Tab = 'mfa' | 'apikeys' | 'sessions'

export default function AccountSecurity() {
  const [tab, setTab] = useState<Tab>('mfa')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // MFA state
  const [mfaSetupData, setMfaSetupData] = useState<{ secret: string; qr_uri: string; recovery_codes?: string[] } | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaVerified, setMfaVerified] = useState(false)

  // API Keys state
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [showKeyForm, setShowKeyForm] = useState(false)
  const [keyForm, setKeyForm] = useState({ name: '', rate_limit: 100 })
  const [newKeySecret, setNewKeySecret] = useState<string | null>(null)

  // Sessions state
  const [sessions, setSessions] = useState<UserSession[]>([])

  const fetchApiKeys = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await accountSecurityAPI.listApiKeys()
      setApiKeys(Array.isArray(data) ? data : data.data || [])
    } catch {
      setError('Failed to load API keys')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await accountSecurityAPI.listSessions()
      setSessions(Array.isArray(data) ? data : data.data || [])
    } catch {
      setError('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'apikeys') fetchApiKeys()
    else if (tab === 'sessions') fetchSessions()
  }, [tab, fetchApiKeys, fetchSessions])

  const handleMfaSetup = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await accountSecurityAPI.mfaSetup()
      setMfaSetupData(data as any)
    } catch {
      setError('Failed to initiate MFA setup')
    } finally {
      setLoading(false)
    }
  }

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await accountSecurityAPI.mfaVerify(mfaCode)
      setMfaVerified(true)
      setSuccess('MFA enabled successfully!')
      setMfaCode('')
    } catch {
      setError('Invalid verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleMfaDisable = async () => {
    const code = prompt('Enter your TOTP code to disable MFA:')
    if (!code) return
    setLoading(true)
    try {
      await accountSecurityAPI.mfaDisable(code)
      setMfaSetupData(null)
      setMfaVerified(false)
      setSuccess('MFA disabled')
    } catch {
      setError('Failed to disable MFA. Check your code.')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const { data } = await accountSecurityAPI.createApiKey({
        name: keyForm.name,
        rate_limit: keyForm.rate_limit,
      })
      setNewKeySecret((data as any).secret_key || (data as any).key_secret || null)
      setShowKeyForm(false)
      setKeyForm({ name: '', rate_limit: 100 })
      fetchApiKeys()
    } catch {
      setError('Failed to create API key')
    }
  }

  const handleDeleteApiKey = async (id: number) => {
    try {
      await accountSecurityAPI.deleteApiKey(id)
      fetchApiKeys()
    } catch {
      setError('Failed to delete API key')
    }
  }

  const handleRevokeSession = async (id: number) => {
    try {
      await accountSecurityAPI.revokeSession(id)
      fetchSessions()
    } catch {
      setError('Failed to revoke session')
    }
  }

  const handleRevokeAll = async () => {
    try {
      await accountSecurityAPI.revokeAllSessions()
      fetchSessions()
      setSuccess('All other sessions revoked')
    } catch {
      setError('Failed to revoke sessions')
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setSuccess('Copied to clipboard')
    setTimeout(() => setSuccess(null), 2000)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Account Security</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([['mfa', 'Two-Factor Auth', ShieldCheck], ['apikeys', 'API Keys', Key], ['sessions', 'Sessions', Monitor]] as const).map(
          ([key, label, Icon]) => (
            <button key={key} onClick={() => { setTab(key as Tab); setError(null); setSuccess(null) }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
                tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          )
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded text-sm flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 text-green-700 px-4 py-3 rounded text-sm">{success}</div>
      )}

      {/* MFA Tab */}
      {tab === 'mfa' && (
        <div className="bg-card border rounded-lg p-6 space-y-4 max-w-lg">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Two-Factor Authentication</h2>
              <p className="text-sm text-muted-foreground">Add an extra layer of security with TOTP</p>
            </div>
          </div>

          {!mfaSetupData && !mfaVerified && (
            <button onClick={handleMfaSetup} disabled={loading}
              className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm flex items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
              Setup MFA
            </button>
          )}

          {mfaSetupData && !mfaVerified && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded">
                <p className="text-sm mb-2">Scan this with your authenticator app:</p>
                <code className="text-xs break-all block bg-background p-2 rounded">{mfaSetupData.qr_uri}</code>
                <p className="text-xs text-muted-foreground mt-2">Manual entry key: <code className="font-mono">{mfaSetupData.secret}</code></p>
              </div>
              {mfaSetupData.recovery_codes && mfaSetupData.recovery_codes.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
                  <p className="text-sm font-medium text-yellow-800 mb-2">Save your recovery codes:</p>
                  <div className="grid grid-cols-2 gap-1 font-mono text-xs">
                    {mfaSetupData.recovery_codes.map((code, i) => <span key={i}>{code}</span>)}
                  </div>
                  <button onClick={() => copyToClipboard(mfaSetupData.recovery_codes!.join('\n'))}
                    className="mt-2 text-xs text-yellow-700 flex items-center gap-1 hover:underline">
                    <Copy className="h-3 w-3" /> Copy all
                  </button>
                </div>
              )}
              <form onSubmit={handleMfaVerify} className="flex gap-3">
                <input type="text" placeholder="Enter 6-digit code" value={mfaCode} maxLength={6}
                  onChange={e => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="border rounded px-3 py-2 text-sm font-mono tracking-widest w-40" required />
                <button type="submit" disabled={loading || mfaCode.length !== 6}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm disabled:opacity-50">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                </button>
              </form>
            </div>
          )}

          {mfaVerified && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <ShieldCheck className="h-5 w-5" />
                <span className="font-medium">MFA is enabled</span>
              </div>
              <button onClick={handleMfaDisable} disabled={loading}
                className="text-red-600 text-sm hover:underline disabled:opacity-50">
                Disable MFA
              </button>
            </div>
          )}
        </div>
      )}

      {/* API Keys Tab */}
      {tab === 'apikeys' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{apiKeys.length} / 5 keys</span>
            <button onClick={() => setShowKeyForm(true)}
              disabled={apiKeys.length >= 5}
              className="bg-primary text-primary-foreground px-3 py-1.5 rounded text-sm flex items-center gap-1 disabled:opacity-50">
              <Plus className="h-4 w-4" /> New API Key
            </button>
          </div>

          {newKeySecret && (
            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded space-y-2">
              <p className="text-sm font-medium text-yellow-800">Your new API key (shown once):</p>
              <div className="flex items-center gap-2">
                <code className="bg-background border px-3 py-1.5 rounded text-sm font-mono flex-1">{newKeySecret}</code>
                <button onClick={() => copyToClipboard(newKeySecret)} className="p-1.5 hover:bg-yellow-100 rounded">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <button onClick={() => setNewKeySecret(null)} className="text-xs text-yellow-700 hover:underline">Dismiss</button>
            </div>
          )}

          {showKeyForm && (
            <form onSubmit={handleCreateApiKey} className="bg-card border rounded-lg p-4 flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Name</label>
                <input value={keyForm.name} placeholder="e.g. Trading Bot"
                  onChange={e => setKeyForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2 text-sm" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Rate Limit (req/min)</label>
                <input type="number" min={1} max={1000} value={keyForm.rate_limit}
                  onChange={e => setKeyForm(f => ({ ...f, rate_limit: Number(e.target.value) }))}
                  className="border rounded px-3 py-2 text-sm w-32" />
              </div>
              <button type="submit" className="bg-primary text-primary-foreground px-4 py-2 rounded text-sm">Create</button>
              <button type="button" onClick={() => setShowKeyForm(false)} className="px-3 py-2 text-sm">Cancel</button>
            </form>
          )}

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No API keys. Create one to get started.</div>
          ) : (
            <div className="bg-card border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2">Name</th>
                    <th className="text-left px-4 py-2">Key ID</th>
                    <th className="text-left px-4 py-2">Rate Limit</th>
                    <th className="text-left px-4 py-2">Created</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-right px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map(key => (
                    <tr key={key.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-2 font-medium">{key.name}</td>
                      <td className="px-4 py-2 font-mono text-xs">{key.key_id}</td>
                      <td className="px-4 py-2">{key.rate_limit}/min</td>
                      <td className="px-4 py-2 text-muted-foreground">{new Date(key.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${key.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {key.is_active ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button onClick={() => handleDeleteApiKey(key.id)}
                          className="text-red-600 hover:text-red-800 p-1" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sessions Tab */}
      {tab === 'sessions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{sessions.length} active session(s)</span>
            {sessions.length > 1 && (
              <button onClick={handleRevokeAll}
                className="text-red-600 text-sm hover:underline">
                Revoke all other sessions
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No active sessions</div>
          ) : (
            <div className="space-y-2">
              {sessions.map(session => (
                <div key={session.id} className="bg-card border rounded-lg p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Monitor className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{session.device_info || 'Unknown device'}</div>
                      <div className="text-xs text-muted-foreground flex gap-3">
                        <span>IP: {session.ip_address || 'unknown'}</span>
                        <span>Active: {session.last_active_at ? new Date(session.last_active_at).toLocaleString() : '-'}</span>
                        <span>Expires: {new Date(session.expires_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleRevokeSession(session.id)}
                    className="text-red-600 hover:text-red-800 text-sm flex items-center gap-1">
                    <Trash2 className="h-4 w-4" /> Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
