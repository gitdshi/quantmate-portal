import { useQuery } from '@tanstack/react-query'
import { Plus, Settings, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation('social')
  const [newWsModal, setNewWsModal] = useState(false)
  const [selectedWs, setSelectedWs] = useState<string | null>(null)

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () =>
      teamAPI.listWorkspaces().then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
  })

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['workspace-members', selectedWs],
    queryFn: () =>
      teamAPI.listMembers(Number(selectedWs)).then((r) => {
        const d = r.data
        return Array.isArray(d) ? d : d?.data ?? []
      }),
    enabled: !!selectedWs,
  })

  const roleLabel = (role: string) => t(`teamSpace.roles.${role}`, { defaultValue: role })

  const memberCols: Column<Member>[] = [
    { key: 'username', label: t('teamSpace.columns.member') },
    { key: 'email', label: t('teamSpace.columns.email') },
    {
      key: 'role',
      label: t('teamSpace.columns.role'),
      render: (member) => (
        <Badge
          variant={member.role === 'owner' ? 'destructive' : member.role === 'admin' ? 'warning' : 'primary'}
        >
          {roleLabel(member.role)}
        </Badge>
      ),
    },
    { key: 'joined_at', label: t('teamSpace.columns.joinedAt') },
    { key: 'last_active', label: t('teamSpace.columns.lastActive') },
    {
      key: 'id',
      label: t('teamSpace.columns.actions'),
      render: (member) =>
        member.role !== 'owner' ? (
          <button className="text-xs text-muted-foreground hover:text-foreground">
            <Settings size={14} />
          </button>
        ) : null,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('teamSpace.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('teamSpace.subtitle')}</p>
        </div>
        <button
          onClick={() => setNewWsModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90"
        >
          <Plus size={16} />
          {t('teamSpace.createWorkspace')}
        </button>
      </div>

      {!selectedWs && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workspaces.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 col-span-2">
              {t('teamSpace.noWorkspaces')}
            </p>
          ) : (
            workspaces.map((ws) => (
              <div
                key={ws.id}
                className="rounded-lg border border-border bg-card p-5 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedWs(ws.id)}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-card-foreground text-lg">{ws.name}</h3>
                  <Badge
                    variant={ws.role === 'owner' ? 'destructive' : ws.role === 'admin' ? 'warning' : 'primary'}
                  >
                    {roleLabel(ws.role)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{ws.description}</p>
                <div className="flex gap-6 text-sm text-muted-foreground">
                  <span>
                    <Users size={14} className="inline mr-1" />
                    {ws.members} {t('teamSpace.members')}
                  </span>
                  <span>
                    {ws.strategies} {t('teamSpace.strategies')}
                  </span>
                  <span>
                    {t('teamSpace.createdAt')} {ws.created_at}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedWs && (
        <div className="space-y-4">
          <button onClick={() => setSelectedWs(null)} className="text-sm text-primary hover:underline">
            {t('teamSpace.backToList')}
          </button>
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-card-foreground text-lg">
                {workspaces.find((w) => w.id === selectedWs)?.name} ? {t('teamSpace.memberManagement')}
              </h3>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-primary text-white hover:opacity-90">
                <Plus size={14} />
                {t('teamSpace.inviteMember')}
              </button>
            </div>
            <DataTable columns={memberCols} data={members} emptyText={t('teamSpace.emptyMembers')} />
          </div>
        </div>
      )}

      <Modal
        open={newWsModal}
        onClose={() => setNewWsModal(false)}
        title={t('teamSpace.modal.title')}
        footer={
          <>
            <button
              onClick={() => setNewWsModal(false)}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted"
            >
              {t('teamSpace.modal.cancel')}
            </button>
            <button className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90">
              {t('teamSpace.modal.submit')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('teamSpace.modal.name')}</label>
            <input
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background"
              placeholder={t('teamSpace.modal.namePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('teamSpace.modal.description')}</label>
            <textarea
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background min-h-[120px]"
              placeholder={t('teamSpace.modal.descriptionPlaceholder')}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
