import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Share2, Trash2, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import Badge from '../components/ui/Badge'
import DataTable, { type Column } from '../components/ui/DataTable'
import Modal from '../components/ui/Modal'
import TabPanel from '../components/ui/TabPanel'
import { showToast } from '../components/ui/toast-service'
import { strategiesAPI, teamAPI } from '../lib/api'

interface Workspace {
  id: number
  name: string
  description?: string
  members?: number
  strategies?: number
  created_at: string
  role?: string
  my_role?: string
  max_members?: number
}

interface Member {
  id: number
  workspace_id: number
  user_id: number
  username?: string
  email?: string
  role: string
  joined_at: string
  last_active?: string
}

interface StrategyOption {
  id: number
  name: string
  description?: string
}

interface StrategyShareRecord {
  id: number
  strategy_id: number
  strategy_name?: string
  shared_by?: number
  shared_by_username?: string
  shared_with_user_id?: number | null
  shared_with_username?: string | null
  shared_with_team_id?: number | null
  shared_with_team_name?: string | null
  permission: string
  created_at: string
}

function extractList<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  if (payload && typeof payload === 'object') {
    const maybeItems = payload as { data?: T[]; items?: T[] }
    return maybeItems.data ?? maybeItems.items ?? []
  }

  return []
}

export default function TeamSpace() {
  const { t } = useTranslation('social')
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'sharing' ? 'sharing' : 'workspaces'
  const [newWsModal, setNewWsModal] = useState(false)
  const [inviteModal, setInviteModal] = useState(false)
  const [shareModal, setShareModal] = useState(false)
  const [selectedWs, setSelectedWs] = useState<number | null>(null)
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceDescription, setWorkspaceDescription] = useState('')
  const [inviteUserId, setInviteUserId] = useState('')
  const [inviteRole, setInviteRole] = useState('member')
  const [shareStrategyId, setShareStrategyId] = useState('')
  const [shareTargetType, setShareTargetType] = useState<'user' | 'workspace'>('user')
  const [shareUserId, setShareUserId] = useState('')
  const [shareTeamId, setShareTeamId] = useState('')
  const [sharePermission, setSharePermission] = useState('view')

  const handleTabChange = (tab: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', tab)
    setSearchParams(next)
  }

  const tabs = [
    { key: 'workspaces', label: t('teamSpace.tabs.workspaces'), icon: <Users className="h-4 w-4" /> },
    { key: 'sharing', label: t('teamSpace.tabs.sharing'), icon: <Share2 className="h-4 w-4" /> },
  ]

  const formatDate = (value?: string) => {
    if (!value) {
      return '--'
    }

    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
  }

  const resetWorkspaceForm = () => {
    setWorkspaceName('')
    setWorkspaceDescription('')
  }

  const resetInviteForm = () => {
    setInviteUserId('')
    setInviteRole('member')
  }

  const resetShareForm = () => {
    setShareStrategyId('')
    setShareTargetType('user')
    setShareUserId('')
    setShareTeamId('')
    setSharePermission('view')
  }

  const { data: workspaces = [] } = useQuery<Workspace[]>({
    queryKey: ['workspaces'],
    queryFn: () =>
      teamAPI.listWorkspaces().then((r) => {
        return extractList<Workspace>(r.data)
      }),
  })

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['workspace-members', selectedWs],
    queryFn: () =>
      teamAPI.listMembers(Number(selectedWs)).then((r) => {
        return extractList<Member>(r.data)
      }),
    enabled: !!selectedWs,
  })

  const { data: strategies = [] } = useQuery<StrategyOption[]>({
    queryKey: ['team-space-strategies'],
    queryFn: () =>
      strategiesAPI.list().then((r) => {
        return extractList<StrategyOption>(r.data)
      }),
    enabled: activeTab === 'sharing' || shareModal,
  })

  const { data: receivedShares = [] } = useQuery<StrategyShareRecord[]>({
    queryKey: ['received-shares'],
    queryFn: () =>
      teamAPI.listSharedWithMe().then((r) => {
        return extractList<StrategyShareRecord>(r.data)
      }),
    enabled: activeTab === 'sharing',
  })

  const { data: sentShares = [] } = useQuery<StrategyShareRecord[]>({
    queryKey: ['sent-shares'],
    queryFn: () =>
      teamAPI.listSentShares().then((r) => {
        return extractList<StrategyShareRecord>(r.data)
      }),
    enabled: activeTab === 'sharing',
  })

  const createWorkspace = useMutation({
    mutationFn: () => teamAPI.createWorkspace({ name: workspaceName, description: workspaceDescription }),
    onSuccess: () => {
      resetWorkspaceForm()
      setNewWsModal(false)
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      showToast(t('teamSpace.toasts.workspaceCreated'), 'success')
    },
    onError: () => showToast(t('teamSpace.toasts.workspaceCreateFailed'), 'error'),
  })

  const inviteMember = useMutation({
    mutationFn: () =>
      teamAPI.addMember(Number(selectedWs), {
        user_id: Number(inviteUserId),
        role: inviteRole,
      }),
    onSuccess: () => {
      resetInviteForm()
      setInviteModal(false)
      void queryClient.invalidateQueries({ queryKey: ['workspace-members', selectedWs] })
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      showToast(t('teamSpace.toasts.memberInvited'), 'success')
    },
    onError: () => showToast(t('teamSpace.toasts.memberInviteFailed'), 'error'),
  })

  const removeMember = useMutation({
    mutationFn: ({ workspaceId, userId }: { workspaceId: number; userId: number }) =>
      teamAPI.removeMember(workspaceId, userId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspace-members', selectedWs] })
      void queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      showToast(t('teamSpace.toasts.memberRemoved'), 'success')
    },
    onError: () => showToast(t('teamSpace.toasts.memberRemoveFailed'), 'error'),
  })

  const shareStrategy = useMutation({
    mutationFn: () =>
      teamAPI.shareStrategy({
        strategy_id: Number(shareStrategyId),
        shared_with_user_id: shareTargetType === 'user' ? Number(shareUserId) : undefined,
        shared_with_team_id: shareTargetType === 'workspace' ? Number(shareTeamId) : undefined,
        permission: sharePermission,
      }),
    onSuccess: () => {
      resetShareForm()
      setShareModal(false)
      void queryClient.invalidateQueries({ queryKey: ['received-shares'] })
      void queryClient.invalidateQueries({ queryKey: ['sent-shares'] })
      showToast(t('teamSpace.toasts.strategyShared'), 'success')
    },
    onError: () => showToast(t('teamSpace.toasts.strategyShareFailed'), 'error'),
  })

  const revokeShare = useMutation({
    mutationFn: (shareId: number) => teamAPI.revokeShare(shareId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sent-shares'] })
      showToast(t('teamSpace.toasts.shareRevoked'), 'success')
    },
    onError: () => showToast(t('teamSpace.toasts.shareRevokeFailed'), 'error'),
  })

  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWs) ?? null
  const selectedWorkspaceRole = selectedWorkspace?.role ?? selectedWorkspace?.my_role ?? 'member'
  const canManageMembers = selectedWorkspaceRole === 'owner' || selectedWorkspaceRole === 'admin'

  const roleLabel = (role: string) => t(`teamSpace.roles.${role}`, { defaultValue: role })
  const permissionLabel = (permission: string) =>
    t(`teamSpace.permissions.${permission}`, { defaultValue: permission })
  const shareTargetLabel = (share: StrategyShareRecord) => {
    if (share.shared_with_team_name) {
      return share.shared_with_team_name
    }

    if (share.shared_with_username) {
      return share.shared_with_username
    }

    if (share.shared_with_user_id) {
      return `#${share.shared_with_user_id}`
    }

    return '--'
  }

  const memberCols: Column<Member>[] = [
    {
      key: 'username',
      label: t('teamSpace.columns.member'),
      render: (member) => member.username ?? `#${member.user_id}`,
    },
    {
      key: 'email',
      label: t('teamSpace.columns.email'),
      render: (member) => member.email ?? '--',
    },
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
    {
      key: 'joined_at',
      label: t('teamSpace.columns.joinedAt'),
      render: (member) => formatDate(member.joined_at),
    },
    {
      key: 'last_active',
      label: t('teamSpace.columns.lastActive'),
      render: (member) => formatDate(member.last_active),
    },
    {
      key: 'id',
      label: t('teamSpace.columns.actions'),
      render: (member) =>
        canManageMembers && member.role !== 'owner' ? (
          <button
            type="button"
            className="text-xs text-destructive hover:underline"
            onClick={() => removeMember.mutate({ workspaceId: Number(selectedWs), userId: member.user_id })}
          >
            {t('teamSpace.removeMember')}
          </button>
        ) : null,
    },
  ]

  const receivedCols: Column<StrategyShareRecord>[] = [
    {
      key: 'strategy_name',
      label: t('teamSpace.sharing.columns.strategy'),
      render: (share) => share.strategy_name ?? `#${share.strategy_id}`,
    },
    {
      key: 'shared_by_username',
      label: t('teamSpace.sharing.columns.sharedBy'),
      render: (share) => share.shared_by_username ?? (share.shared_by ? `#${share.shared_by}` : '--'),
    },
    {
      key: 'target',
      label: t('teamSpace.sharing.columns.target'),
      render: (share) => shareTargetLabel(share),
    },
    {
      key: 'permission',
      label: t('teamSpace.sharing.columns.permission'),
      render: (share) => <Badge variant="primary">{permissionLabel(share.permission)}</Badge>,
    },
    {
      key: 'created_at',
      label: t('teamSpace.sharing.columns.createdAt'),
      render: (share) => formatDate(share.created_at),
    },
  ]

  const sentCols: Column<StrategyShareRecord>[] = [
    {
      key: 'strategy_name',
      label: t('teamSpace.sharing.columns.strategy'),
      render: (share) => share.strategy_name ?? `#${share.strategy_id}`,
    },
    {
      key: 'target',
      label: t('teamSpace.sharing.columns.target'),
      render: (share) => shareTargetLabel(share),
    },
    {
      key: 'permission',
      label: t('teamSpace.sharing.columns.permission'),
      render: (share) => <Badge variant="warning">{permissionLabel(share.permission)}</Badge>,
    },
    {
      key: 'created_at',
      label: t('teamSpace.sharing.columns.createdAt'),
      render: (share) => formatDate(share.created_at),
    },
    {
      key: 'actions',
      label: t('teamSpace.columns.actions'),
      render: (share) => (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-destructive hover:underline"
          onClick={() => revokeShare.mutate(share.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t('teamSpace.sharing.revoke')}
        </button>
      ),
    },
  ]

  return (
    <div data-testid="team-space-page" className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('teamSpace.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('teamSpace.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              handleTabChange('sharing')
              setShareModal(true)
            }}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            <Share2 size={16} />
            {t('teamSpace.shareStrategy')}
          </button>
          <button
            type="button"
            onClick={() => {
              handleTabChange('workspaces')
              setNewWsModal(true)
            }}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-white hover:opacity-90"
          >
            <Plus size={16} />
            {t('teamSpace.createWorkspace')}
          </button>
        </div>
      </div>

      <TabPanel tabs={tabs} activeTab={activeTab} onChange={handleTabChange}>
        {activeTab === 'workspaces' && (
          <div className="space-y-6">
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-lg font-semibold text-card-foreground">{t('teamSpace.sections.workspaces')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('teamSpace.sections.workspacesHint')}</p>
            </div>

            {!selectedWs && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {workspaces.length === 0 ? (
                  <p className="col-span-2 py-8 text-center text-muted-foreground">{t('teamSpace.noWorkspaces')}</p>
                ) : (
                  workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      className="rounded-lg border border-border bg-card p-5 text-left transition-shadow hover:shadow-md"
                      onClick={() => setSelectedWs(ws.id)}
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold text-card-foreground">{ws.name}</h3>
                        <Badge
                          variant={
                            (ws.role ?? ws.my_role) === 'owner'
                              ? 'destructive'
                              : (ws.role ?? ws.my_role) === 'admin'
                                ? 'warning'
                                : 'primary'
                          }
                        >
                          {roleLabel(ws.role ?? ws.my_role ?? 'member')}
                        </Badge>
                      </div>
                      <p className="mb-4 text-sm text-muted-foreground">
                        {ws.description || t('teamSpace.noDescription')}
                      </p>
                      <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                        <span>
                          <Users size={14} className="mr-1 inline" />
                          {ws.members ?? 0} {t('teamSpace.members')}
                        </span>
                        <span>
                          {ws.strategies ?? 0} {t('teamSpace.strategies')}
                        </span>
                        <span>
                          {t('teamSpace.createdAt')} {formatDate(ws.created_at)}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}

            {selectedWorkspace && (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => setSelectedWs(null)}
                  className="text-sm text-primary hover:underline"
                >
                  {t('teamSpace.backToList')}
                </button>

                <div className="rounded-lg border border-border bg-card p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-card-foreground">{selectedWorkspace.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedWorkspace.description || t('teamSpace.noDescription')}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        <span>{selectedWorkspace.members ?? 0} {t('teamSpace.members')}</span>
                        <span>{selectedWorkspace.max_members ?? 10} {t('teamSpace.maxMembers')}</span>
                        <span>{selectedWorkspace.strategies ?? 0} {t('teamSpace.strategies')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={canManageMembers ? 'warning' : 'primary'}>
                        {roleLabel(selectedWorkspaceRole)}
                      </Badge>
                      {canManageMembers && (
                        <button
                          type="button"
                          onClick={() => setInviteModal(true)}
                          className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-white hover:opacity-90"
                        >
                          <Plus size={14} />
                          {t('teamSpace.inviteMember')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-card p-5">
                  <h3 className="mb-4 text-lg font-semibold text-card-foreground">{t('teamSpace.memberManagement')}</h3>
                  <DataTable columns={memberCols} data={members} emptyText={t('teamSpace.emptyMembers')} />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'sharing' && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">{t('teamSpace.sharing.metrics.workspaces')}</p>
                <p className="mt-2 text-2xl font-semibold text-card-foreground">{workspaces.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">{t('teamSpace.sharing.metrics.received')}</p>
                <p className="mt-2 text-2xl font-semibold text-card-foreground">{receivedShares.length}</p>
              </div>
              <div className="rounded-lg border border-border bg-card p-5">
                <p className="text-sm text-muted-foreground">{t('teamSpace.sharing.metrics.sent')}</p>
                <p className="mt-2 text-2xl font-semibold text-card-foreground">{sentShares.length}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-card-foreground">{t('teamSpace.sharing.receivedTitle')}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{t('teamSpace.sharing.receivedHint')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShareModal(true)}
                  className="flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm text-white hover:opacity-90"
                >
                  <Share2 size={14} />
                  {t('teamSpace.shareStrategy')}
                </button>
              </div>
              <DataTable
                columns={receivedCols}
                data={receivedShares}
                emptyText={t('teamSpace.sharing.emptyReceived')}
              />
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-card-foreground">{t('teamSpace.sharing.sentTitle')}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t('teamSpace.sharing.sentHint')}</p>
              </div>
              <DataTable columns={sentCols} data={sentShares} emptyText={t('teamSpace.sharing.emptySent')} />
            </div>
          </div>
        )}
      </TabPanel>

      <Modal
        open={newWsModal}
        onClose={() => {
          setNewWsModal(false)
          resetWorkspaceForm()
        }}
        title={t('teamSpace.modal.title')}
        footer={
          <>
            <button
              onClick={() => {
                setNewWsModal(false)
                resetWorkspaceForm()
              }}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted"
            >
              {t('teamSpace.modal.cancel')}
            </button>
            <button
              type="button"
              disabled={!workspaceName.trim() || createWorkspace.isPending}
              onClick={() => createWorkspace.mutate()}
              className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              {t('teamSpace.modal.submit')}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('teamSpace.modal.name')}</label>
            <input
              value={workspaceName}
              onChange={(event) => setWorkspaceName(event.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background"
              placeholder={t('teamSpace.modal.namePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('teamSpace.modal.description')}</label>
            <textarea
              value={workspaceDescription}
              onChange={(event) => setWorkspaceDescription(event.target.value)}
              className="w-full px-3 py-2 text-sm rounded-md border border-border bg-background min-h-[120px]"
              placeholder={t('teamSpace.modal.descriptionPlaceholder')}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={inviteModal && !!selectedWorkspace}
        onClose={() => {
          setInviteModal(false)
          resetInviteForm()
        }}
        title={t('teamSpace.inviteModal.title')}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setInviteModal(false)
                resetInviteForm()
              }}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted"
            >
              {t('teamSpace.modal.cancel')}
            </button>
            <button
              type="button"
              disabled={!inviteUserId || inviteMember.isPending}
              onClick={() => inviteMember.mutate()}
              className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              {t('teamSpace.inviteModal.submit')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('teamSpace.inviteModal.userId')}</label>
            <input
              type="number"
              value={inviteUserId}
              onChange={(event) => setInviteUserId(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              placeholder={t('teamSpace.inviteModal.userIdPlaceholder')}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">{t('teamSpace.inviteModal.role')}</label>
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="admin">{roleLabel('admin')}</option>
              <option value="member">{roleLabel('member')}</option>
              <option value="viewer">{roleLabel('viewer')}</option>
            </select>
          </div>
        </div>
      </Modal>

      <Modal
        open={shareModal}
        onClose={() => {
          setShareModal(false)
          resetShareForm()
        }}
        title={t('teamSpace.shareModal.title')}
        footer={
          <>
            <button
              type="button"
              onClick={() => {
                setShareModal(false)
                resetShareForm()
              }}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted"
            >
              {t('teamSpace.modal.cancel')}
            </button>
            <button
              type="button"
              disabled={
                !shareStrategyId ||
                (shareTargetType === 'user' ? !shareUserId : !shareTeamId) ||
                shareStrategy.isPending
              }
              onClick={() => shareStrategy.mutate()}
              className="px-4 py-2 text-sm rounded-md bg-primary text-white hover:opacity-90 disabled:opacity-50"
            >
              {t('teamSpace.shareModal.submit')}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">{t('teamSpace.shareModal.strategy')}</label>
            <select
              value={shareStrategyId}
              onChange={(event) => setShareStrategyId(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">{t('teamSpace.shareModal.strategyPlaceholder')}</option>
              {strategies.map((strategy) => (
                <option key={strategy.id} value={strategy.id}>{strategy.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t('teamSpace.shareModal.targetType')}</label>
            <select
              value={shareTargetType}
              onChange={(event) => setShareTargetType(event.target.value as 'user' | 'workspace')}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="user">{t('teamSpace.shareModal.targetUser')}</option>
              <option value="workspace">{t('teamSpace.shareModal.targetWorkspace')}</option>
            </select>
          </div>

          {shareTargetType === 'user' ? (
            <div>
              <label className="mb-1 block text-sm font-medium">{t('teamSpace.shareModal.userId')}</label>
              <input
                type="number"
                value={shareUserId}
                onChange={(event) => setShareUserId(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder={t('teamSpace.shareModal.userIdPlaceholder')}
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-sm font-medium">{t('teamSpace.shareModal.workspace')}</label>
              <select
                value={shareTeamId}
                onChange={(event) => setShareTeamId(event.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="">{t('teamSpace.shareModal.workspacePlaceholder')}</option>
                {workspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">{t('teamSpace.shareModal.permission')}</label>
            <select
              value={sharePermission}
              onChange={(event) => setSharePermission(event.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="view">{permissionLabel('view')}</option>
              <option value="edit">{permissionLabel('edit')}</option>
              <option value="execute">{permissionLabel('execute')}</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
