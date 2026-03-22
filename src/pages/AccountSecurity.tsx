import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CreditCard,
  Key,
  Laptop,
  Lock,
  Plus,
  Shield,
  User,
} from 'lucide-react'
import { useState } from 'react'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import TabPanel from '../components/ui/TabPanel'
import ToggleSwitch from '../components/ui/ToggleSwitch'
import { showToast } from '../components/ui/Toast'
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

const TABS = [
  { key: 'profile', label: '个人资料', icon: <User size={16} /> },
  { key: 'security', label: '安全设置', icon: <Lock size={16} /> },
  { key: 'apikeys', label: 'API 密钥', icon: <Key size={16} /> },
  { key: 'sessions', label: '登录会话', icon: <Laptop size={16} /> },
  { key: 'billing', label: '订阅计费', icon: <CreditCard size={16} /> },
]

export default function AccountSecurity() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('profile')
  const [newKeyModal, setNewKeyModal] = useState(false)

  const { data: apiKeys = [] } = useQuery<APIKey[]>({
    queryKey: ['api-keys'],
    queryFn: () => accountSecurityAPI.listApiKeys().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: activeTab === 'apikeys',
  })

  const createKeyMutation = useMutation({
    mutationFn: (data: { name: string; permissions: string[] }) => accountSecurityAPI.createApiKey(data),
    onSuccess: () => {
      showToast('密钥已创建', 'success')
      setNewKeyModal(false)
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
    onError: () => showToast('创建失败', 'error'),
  })

  const revokeKeyMutation = useMutation({
    mutationFn: (id: string) => accountSecurityAPI.deleteApiKey(Number(id)),
    onSuccess: () => {
      showToast('密钥已删除', 'success')
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
    },
  })

  // ── Placeholder data ──
  const [profile, setProfile] = useState({
    displayName: '张涛',
    email: 'zhang@example.com',
    phone: '138****8888',
    company: 'QuantMate',
    bio: '量化交易研究员',
  })

  const [security, setSecurity] = useState({
    twoFA: false,
    twoFAMethods: { totp: false, sms: false, email: true },
  })

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ['auth-sessions'],
    queryFn: () => accountSecurityAPI.listSessions().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: activeTab === 'sessions',
  })

  const keyCols: Column<APIKey>[] = [
    { key: 'name', label: '名称' },
    { key: 'key_prefix', label: '密钥', render: (k) => <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{k.key_prefix}</code> },
    { key: 'permissions', label: '权限', render: (k) => <div className="flex gap-1 flex-wrap">{k.permissions.map((p) => <Badge key={p} variant="primary">{p}</Badge>)}</div> },
    { key: 'created_at', label: '创建时间' },
    { key: 'last_used', label: '最近使用', render: (k) => k.last_used || '-' },
    { key: 'status', label: '状态', render: (k) => <Badge variant={k.status === 'active' ? 'success' : 'muted'}>{k.status === 'active' ? '活跃' : '已吊销'}</Badge> },
    { key: 'id', label: '操作', render: (k) => k.status === 'active' ? <button onClick={() => revokeKeyMutation.mutate(k.id)} className="text-xs text-red-500 hover:text-red-700">删除</button> : null },
  ]

  const inputCls = 'w-full px-3 py-2 text-sm rounded-md border border-border bg-background'
  const labelCls = 'block text-sm font-medium mb-1'

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">账户安全</h1>
          <p className="text-sm text-muted-foreground">个人资料 · 安全设置 · API 密钥 · 订阅计费</p>
        </div>
      </div>

      <TabPanel tabs={TABS} activeTab={activeTab} onChange={setActiveTab}>
        {/* ── Profile ─────────────────────────────────── */}
        {activeTab === 'profile' && (
          <div className="max-w-2xl space-y-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">{profile.displayName.charAt(0)}</div>
                <div>
                  <h3 className="font-semibold text-lg">{profile.displayName}</h3>
                  <p className="text-sm text-muted-foreground">{profile.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div><label className={labelCls}>显示名称</label><input value={profile.displayName} onChange={(e) => setProfile({ ...profile, displayName: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>邮箱</label><input value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>手机号</label><input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>公司/组织</label><input value={profile.company} onChange={(e) => setProfile({ ...profile, company: e.target.value })} className={inputCls} /></div>
                <div><label className={labelCls}>个人简介</label><textarea value={profile.bio} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} className={`${inputCls} h-20 resize-none`} /></div>
              </div>
              <button className="mt-4 px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">保存资料</button>
            </div>
          </div>
        )}

        {/* ── Security ────────────────────────────────── */}
        {activeTab === 'security' && (
          <div className="max-w-2xl space-y-4">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold text-card-foreground mb-4">修改密码</h3>
              <div className="space-y-3">
                <div><label className={labelCls}>当前密码</label><input type="password" className={inputCls} /></div>
                <div><label className={labelCls}>新密码</label><input type="password" className={inputCls} /></div>
                <div><label className={labelCls}>确认新密码</label><input type="password" className={inputCls} /></div>
              </div>
              <button className="mt-4 px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">更新密码</button>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-card-foreground">两步验证 (2FA)</h3>
                  <p className="text-xs text-muted-foreground">增强账户安全性</p>
                </div>
                <ToggleSwitch checked={security.twoFA} onChange={(v) => setSecurity({ ...security, twoFA: v })} />
              </div>
              <div className="space-y-3">
                {([
                  ['totp', 'TOTP 验证器', 'Google Authenticator / Authy'],
                  ['sms', '短信验证', '发送验证码到手机'],
                  ['email', '邮件验证', '发送验证码到邮箱'],
                ] as const).map(([key, label, desc]) => (
                  <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div><div className="text-sm font-medium">{label}</div><div className="text-xs text-muted-foreground">{desc}</div></div>
                    <ToggleSwitch checked={(security.twoFAMethods as Record<string, boolean>)[key]} onChange={(v) => setSecurity({ ...security, twoFAMethods: { ...security.twoFAMethods, [key]: v } })} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── API Keys ────────────────────────────────── */}
        {activeTab === 'apikeys' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setNewKeyModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"><Plus size={16} />创建密钥</button>
            </div>
            <DataTable columns={keyCols} data={apiKeys} emptyText="暂无 API 密钥" />
          </div>
        )}

        {/* ── Sessions ────────────────────────────────── */}
        {activeTab === 'sessions' && (
          <div className="space-y-4 max-w-2xl">
            {sessions.length > 0 ? sessions.map((s) => (
              <div key={s.id} className={`rounded-lg border ${s.current ? 'border-primary' : 'border-border'} bg-card p-4`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Laptop size={24} className="text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium flex items-center gap-2">
                        {s.device}
                        {s.current && <Badge variant="success">当前</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">{s.ip} · {s.location} · {s.last_active}</div>
                    </div>
                  </div>
                  {!s.current && <button onClick={() => accountSecurityAPI.revokeSession(Number(s.id)).then(() => { showToast('会话已注销', 'success'); queryClient.invalidateQueries({ queryKey: ['auth-sessions'] }) })} className="text-xs text-red-500 hover:text-red-700">注销</button>}
                </div>
              </div>
            )) : <p className="text-center text-muted-foreground py-8">暂无登录会话</p>}
          </div>
        )}

        {/* ── Billing ─────────────────────────────────── */}
        {activeTab === 'billing' && (
          <div className="max-w-2xl space-y-4">
            <div className="rounded-lg border border-primary/30 bg-gradient-to-r from-primary/5 to-card p-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <Badge variant="primary">专业版</Badge>
                  <h3 className="font-semibold text-lg mt-1">Pro Plan</h3>
                </div>
              </div>
            </div>
            <p className="text-center text-muted-foreground py-8">暂无使用量统计数据</p>
          </div>
        )}
      </TabPanel>

      {/* New Key Modal */}
      <Modal open={newKeyModal} onClose={() => setNewKeyModal(false)} title="创建 API 密钥" footer={
        <>
          <button onClick={() => setNewKeyModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">取消</button>
          <button onClick={() => createKeyMutation.mutate({ name: '新密钥', permissions: ['data:read'] })} className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">创建密钥</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <div><label className="block text-sm font-medium mb-1">密钥名称</label><input className={inputCls} placeholder="例如: 回测脚本" /></div>
          <div>
            <label className="block text-sm font-medium mb-1">权限范围</label>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked />数据读取 (data:read)</label>
              <label className="flex items-center gap-2"><input type="checkbox" />数据写入 (data:write)</label>
              <label className="flex items-center gap-2"><input type="checkbox" defaultChecked />回测 (backtest)</label>
              <label className="flex items-center gap-2"><input type="checkbox" />交易 (trade)</label>
              <label className="flex items-center gap-2"><input type="checkbox" />管理 (admin)</label>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
