import { useQuery } from '@tanstack/react-query'
import {
  Plus,
  Settings,
  Users,
} from 'lucide-react'
import { useState } from 'react'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import { teamAPI } from '../lib/api'

interface Workspace {
  id: string
  name: string
  description: string
  members: number
  strategies: number
  created_at: string
  role: string
}

interface Member {
  id: string
  username: string
  email: string
  role: string
  joined_at: string
  last_active: string
}

export default function TeamSpace() {
  const [newWsModal, setNewWsModal] = useState(false)
  const [selectedWs, setSelectedWs] = useState<string | null>(null)

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () => teamAPI.listWorkspaces().then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
  })

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['workspace-members', selectedWs],
    queryFn: () => teamAPI.listMembers(Number(selectedWs)).then((r) => {
      const d = r.data
      return Array.isArray(d) ? d : d?.data ?? []
    }),
    enabled: !!selectedWs,
  })

  const memberCols: Column<Member>[] = [
    { key: 'username', label: '成员' },
    { key: 'email', label: '邮箱' },
    { key: 'role', label: '角色', render: (m) => <Badge variant={m.role === 'owner' ? 'danger' : m.role === 'admin' ? 'warning' : 'primary'}>{m.role}</Badge> },
    { key: 'joined_at', label: '加入时间' },
    { key: 'last_active', label: '最近活跃' },
    { key: 'id', label: '操作', render: (m) => m.role !== 'owner' ? <button className="text-xs text-muted-foreground hover:text-foreground"><Settings size={14} /></button> : null },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">团队空间</h1>
          <p className="text-sm text-muted-foreground">协作空间 · 成员管理 · 策略共享</p>
        </div>
        <button onClick={() => setNewWsModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"><Plus size={16} />创建空间</button>
      </div>

      {/* Workspace Cards */}
      {!selectedWs && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workspaces.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 col-span-2">暂无工作空间，点击右上角创建</p>
          ) : workspaces.map((ws) => (
            <div key={ws.id} className="rounded-lg border border-border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedWs(ws.id)}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-card-foreground text-lg">{ws.name}</h3>
                <Badge variant={ws.role === 'owner' ? 'danger' : ws.role === 'admin' ? 'warning' : 'primary'}>{ws.role}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{ws.description}</p>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <span><Users size={14} className="inline mr-1" />{ws.members} 成员</span>
                <span>{ws.strategies} 策略</span>
                <span>创建于 {ws.created_at}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedWs && (
        <div className="space-y-4">
          <button onClick={() => setSelectedWs(null)} className="text-sm text-primary hover:underline">&larr; 返回工作空间列表</button>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-card-foreground text-lg">{workspaces.find((w) => w.id === selectedWs)?.name} — 成员管理</h3>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"><Plus size={14} />邀请成员</button>
            </div>
            <DataTable columns={memberCols} data={members} emptyText="暂无成员" />
          </div>
        </div>
      )}

      {/* New Workspace Modal */}
      <Modal open={newWsModal} onClose={() => setNewWsModal(false)} title="创建工作空间" footer={
        <>
          <button onClick={() => setNewWsModal(false)} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted">取消</button>
          <button className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">创建</button>
        </>
      }>
        <div className="flex flex-col gap-4">
          <div><label className="block text-sm font-medium mb-1">空间名称</label><input className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background" placeholder="例如: 量化研究团队" /></div>
          <div><label className="block text-sm font-medium mb-1">描述</label><textarea className="w-full h-20 px-3 py-2 text-sm rounded-md border border-border bg-background resize-none" placeholder="工作空间描述..." /></div>
        </div>
      </Modal>
    </div>
  )
}
