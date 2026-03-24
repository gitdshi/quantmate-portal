import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Key, Laptop, Lock, Plus, User } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import TabPanel from '../components/ui/TabPanel'
import ToggleSwitch from '../components/ui/ToggleSwitch'
import { showToast } from '../components/ui/toast-service'
import { accountSecurityAPI } from '../lib/api'

interface APIKey {
  id: string
  name: string
  key_prefix: string
  permissions: string[]
  created_at: string
  last_used?: string
  status: string
}

interface Session {
  id: string
  device: string
  ip: string
  location: string
  last_active: string
  current: boolean
}

export default function AccountSecurity() {
  const { t } = useTranslation('settings')
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')
  const [newKeyModal, setNewKeyModal] = useState(false)

  const tabs = [
    { key: 'profile', label: t('accountPage.tabs.profile'), icon: <User size={16} /> },
    { key: 'security', label: t('accountPage.tabs.security'), icon: <Lock size={16} /> },
    { key: 'apikeys', label: t('accountPage.tabs.apikeys'), icon: <Key size={16} /> },
    { key: 'sessions', label: t('accountPage.tabs.sessions'), icon: <Laptop size={16} /> },
    { key: 'billing', label: t('accountPage.tabs.billing'), icon: <CreditCard size={16} /> },
  ]

  const { data: apiKeys = [] } = useQuery<APIKey[]>({
    queryKey: ['api-keys'],
    queryFn: () =>
      accountSecurityAPI.listApiKeys().then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
    enabled: activeTab === 'apikeys',
  })

  const createKeyMutation = useMutation({
    mutationFn: (data: { name: string; permissions: string[] }) => accountSecurityAPI.createApiKey(data),
    onSuccess: () => {
      showToast(t('accountPage.keyCreated'), 'success')
      setNewKeyModal(false)
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: () => showToast(t('accountPage.createFailed'), 'error'),
  })

  const revokeKeyMutation = useMutation({
    mutationFn: (id: string) => accountSecurityAPI.deleteApiKey(Number(id)),
    onSuccess: () => {
      showToast(t('accountPage.keyDeleted'), 'success')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })

  const [profile, setProfile] = useState({
    displayName: t('accountPage.profileDefaults.displayName'),
    email: 'zhang@example.com',
    phone: '138****8888',
    company: 'QuantMate',
    bio: t('accountPage.profileDefaults.bio'),
  })

  const [security, setSecurity] = useState({
    twoFA: false,
    twoFAMethods: { totp: false, sms: false, email: true },
  })

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['auth-sessions'],
    queryFn: () =>
      accountSecurityAPI.listSessions().then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
    enabled: activeTab === 'sessions',
  })

  const keyCols: Column<APIKey>[] = [
    { key: 'name', label: t('accountPage.fields.name') },
    {
      key: 'key_prefix',
      label: t('accountPage.fields.key'),
      render: (key) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{key.key_prefix}</code>,
    },
    {
      key: 'permissions',
      label: t('accountPage.fields.permissions'),
      render: (key) => (
        <div className="flex gap-1 flex-wrap">
          {key.permissions.map((permission) => (
            <Badge key={permission} variant="primary">
              {permission}
            </Badge>
          ))}
        </div>
      ),
    },
    { key: 'created_at', label: t('accountPage.fields.createdAt') },
    { key: 'last_used', label: t('accountPage.fields.lastUsed'), render: (key) => key.last_used || '-' },
    {
      key: 'status',
      label: t('accountPage.fields.status'),
      render: (key) => (
        <Badge variant={key.status === 'active' ? 'success' : 'muted'}>
          {key.status === 'active' ? t('accountPage.status.active') : t('accountPage.status.revoked')}
        </Badge>
      ),
    },
    {
      key: 'id',
      label: t('accountPage.fields.actions'),
      render: (key) =>
        key.status === 'active' ? (
          <button onClick={() => revokeKeyMutation.mutate(key.id)} className="text-xs text-red-500 hover:text-red-700">
            {t('accountPage.deleteKey')}
          </button>
        ) : null,
    },
  ]

  const inputCls = 'w-full px-3 py-2 text-sm rounded-md border border-border bg-background'
  const labelCls = 'block text-sm font-medium mb-1'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('accountPage.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('accountPage.subtitle')}</p>
        </div>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={setActiveTab}>
        {activeTab === 'profile' && (
          <div className="max-w-2xl space-y-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                  {profile.displayName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{profile.displayName}</h3>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div><label className={labelCls}>{t('accountPage.fields.displayName')}</label><input value={profile.displayName} onChange={(event) => setProfile({ ...profile, displayName: event.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>{t('accountPage.fields.email')}</label><input value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>{t('accountPage.fields.phone')}</label><input value={profile.phone} onChange={(event) => setProfile({ ...profile, phone: event.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>{t('accountPage.fields.company')}</label><input value={profile.company} onChange={(event) => setProfile({ ...profile, company: event.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>{t('accountPage.fields.bio')}</label><textarea value={profile.bio} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} className={`${inputCls} h-20 resize-none`} /></div>
              </div>
              <button className="mt-4 px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">{t('accountPage.saveProfile')}</button>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="max-w-2xl space-y-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold text-card-foreground mb-4">{t('accountPage.updatePassword')}</h3>
              <div className="space-y-3">
                <div><label className={labelCls}>{t('accountPage.fields.currentPassword')}</label><input type="password" className={inputCls} /></div>
                <div><label className={labelCls}>{t('accountPage.fields.newPassword')}</label><input type="password" className={inputCls} /></div>
                <div><label className={labelCls}>{t('accountPage.fields.confirmPassword')}</label><input type="password" className={inputCls} /></div>
              </div>
              <button className="mt-4 px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">{t('accountPage.updatePassword')}</button>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-card-foreground">{t('accountPage.fields.twoFactor')}</h3>
                  <p className="text-xs text-muted-foreground">{t('accountPage.fields.twoFactorDesc')}</p>
                </div>
                <ToggleSwitch checked={security.twoFA} onChange={(value) => setSecurity({ ...security, twoFA: value })} />
              </div>
              <div className="space-y-3">
                {(['totp', 'sms', 'email'] as const).map((key) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <div className="text-sm font-medium">{t(`accountPage.methods.${key}.0`)}</div>
                      <div className="text-xs text-muted-foreground">{t(`accountPage.methods.${key}.1`)}</div>
                    </div>
                    <ToggleSwitch checked={security.twoFAMethods[key]} onChange={(value) => setSecurity({ ...security, twoFAMethods: { ...security.twoFAMethods, [key]: value } })} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'apikeys' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setNewKeyModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90">
                <Plus size={16} />
                {t('accountPage.createKey')}
              </button>
            </div>
            <DataTable columns={keyCols} data={apiKeys} emptyText={t('accountPage.emptyKeys')} />
          </div>
        )}

        {activeTab === 'sessions' && (
          <div className="space-y-4 max-w-2xl">
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <div key={session.id} className={`rounded-lg border ${session.current ? 'border-primary' : 'border-border'} bg-card p-4`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Laptop size={24} className="text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium flex items-center gap-2">
                          {session.device}
                          {session.current && <Badge variant="success">{t('accountPage.current')}</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">{session.ip} ? {session.location} ? {session.last_active}</div>
                      </div>
                    </div>
                    {!session.current && (
                      <button
                        onClick={() => accountSecurityAPI.revokeSession(Number(session.id)).then(() => { showToast(t('accountPage.revokeSession'), 'success'); queryClient.invalidateQueries({ queryKey: ['auth-sessions'] }) })}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        {t('accountPage.revokeSession')}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-8">{t('accountPage.emptySessions')}</p>
            )}
          </div>
        )}

        {activeTab === 'billing' && (
          <div className="max-w-2xl space-y-4">
            <div className="rounded-lg border border-primary/30 bg-gradient-to-r from-primary/5 to-card p-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Badge variant="primary">{t('accountPage.proPlan')}</Badge>
                  <h3 className="font-semibold text-lg mt-1">{t('accountPage.proPlan')}</h3>
                </div>
              </div>
            </div>
            <p className="text-center text-muted-foreground py-8">{t('accountPage.emptyBilling')}</p>
          </div>
        )}
      </TabPanel>

      <Modal
        open={newKeyModal}
        onClose={() => setNewKeyModal(false)}
        title={t('accountPage.modal.title')}
        footer={
          <>
            <button onClick={() => setNewKeyModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">
              {t('accountPage.modal.cancel')}
            </button>
            <button onClick={() => createKeyMutation.mutate({ name: t('accountPage.modal.defaultName'), permissions: ['data:read'] })} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">
              {t('accountPage.modal.submit')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div><label className="block text-sm font-medium mb-1">{t('accountPage.modal.name')}</label><input className={inputCls} placeholder={t('accountPage.modal.placeholder')} /></div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('accountPage.modal.permissions')}</label>
            <div className="flex flex-col gap-2 text-sm">
              {[0, 1, 2, 3, 4].map((index) => (
                <label key={index} className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked={index === 0 || index === 2} />
                  {t(`accountPage.modal.permissionLabels.${index}`)}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
