import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Loader2, Plus, RefreshCw, Share2, Trash2, UserPlus, Users, X
} from 'lucide-react'
import { teamAPI } from '../lib/api'
import type { TeamWorkspace, WorkspaceMember, StrategyShare } from '../types'

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  member: 'bg-green-100 text-green-700',
  viewer: 'bg-gray-100 text-gray-700',
}

export default function TeamSpace() {
  const { t } = useTranslation(['social', 'common'])
  const [workspaces, setWorkspaces] = useState<TeamWorkspace[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [shares, setShares] = useState<StrategyShare[]>([])
  const [selectedWs, setSelectedWs] = useState<TeamWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showShareStrategy, setShowShareStrategy] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', max_members: 10 })
  const [memberForm, setMemberForm] = useState({ user_id: '', role: 'member' })
  const [shareForm, setShareForm] = useState({ strategy_id: '', shared_with_user_id: '', permission: 'view' })

  const fetchWorkspaces = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await teamAPI.listWorkspaces()
      const result = data as any
      setWorkspaces(result.data || result || [])
    } catch {
      setError(t('teamSpace.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchShares = useCallback(async () => {
    try {
      const { data } = await teamAPI.listSharedWithMe()
      setShares(Array.isArray(data) ? data : data.data || [])
    } catch { /* ignore */ }
  }, [])

  useEffect(() => { fetchWorkspaces(); fetchShares() }, [fetchWorkspaces, fetchShares])

  const selectWorkspace = async (ws: TeamWorkspace) => {
    setSelectedWs(ws)
    try {
      const { data } = await teamAPI.listMembers(ws.id)
      setMembers(Array.isArray(data) ? data : data.data || [])
    } catch {
      setError(t('teamSpace.loadMembersFailed'))
    }
  }

  const handleCreate = async () => {
    if (!form.name.trim()) return
    try {
      await teamAPI.createWorkspace(form)
      setForm({ name: '', description: '', max_members: 10 })
      setShowCreate(false)
      fetchWorkspaces()
    } catch (err: any) {
      setError(err?.response?.data?.message || t('teamSpace.createFailed'))
    }
  }

  const handleDeleteWorkspace = async (id: number) => {
    try {
      await teamAPI.deleteWorkspace(id)
      if (selectedWs?.id === id) { setSelectedWs(null); setMembers([]) }
      fetchWorkspaces()
    } catch { setError(t('teamSpace.deleteFailed')) }
  }

  const handleAddMember = async () => {
    if (!selectedWs || !memberForm.user_id) return
    try {
      await teamAPI.addMember(selectedWs.id, {
        user_id: parseInt(memberForm.user_id), role: memberForm.role,
      })
      setMemberForm({ user_id: '', role: 'member' })
      setShowAddMember(false)
      const { data } = await teamAPI.listMembers(selectedWs.id)
      setMembers(Array.isArray(data) ? data : data.data || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || t('teamSpace.addMemberFailed'))
    }
  }

  const handleRemoveMember = async (userId: number) => {
    if (!selectedWs) return
    try {
      await teamAPI.removeMember(selectedWs.id, userId)
      const { data } = await teamAPI.listMembers(selectedWs.id)
      setMembers(Array.isArray(data) ? data : data.data || [])
    } catch (err: any) {
      setError(err?.response?.data?.message || t('teamSpace.removeMemberFailed'))
    }
  }

  const handleShareStrategy = async () => {
    if (!shareForm.strategy_id || !shareForm.shared_with_user_id) return
    try {
      await teamAPI.shareStrategy({
        strategy_id: parseInt(shareForm.strategy_id),
        shared_with_user_id: parseInt(shareForm.shared_with_user_id),
        permission: shareForm.permission,
      })
      setShareForm({ strategy_id: '', shared_with_user_id: '', permission: 'view' })
      setShowShareStrategy(false)
      fetchShares()
    } catch (err: any) {
      setError(err?.response?.data?.message || t('teamSpace.shareFailed'))
    }
  }

  const handleRevokeShare = async (id: number) => {
    try {
      await teamAPI.revokeShare(id)
      fetchShares()
    } catch { setError(t('teamSpace.revokeFailed')) }
  }

  return (
    <div className="p-6" data-testid="team-space-page">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-7 w-7" /> {t('teamSpace.title')}
        </h1>
        <div className="flex gap-2">
          <button onClick={() => setShowShareStrategy(true)} className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded text-sm hover:bg-gray-50">
            <Share2 className="h-4 w-4" /> {t('teamSpace.shareStrategy')}
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            <Plus className="h-4 w-4" /> {t('teamSpace.newWorkspace')}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2"><X className="h-3 w-3 inline text-red-500" /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workspaces List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-gray-700">{t('teamSpace.workspaces')} ({workspaces.length})</h2>
              <button onClick={fetchWorkspaces} className="p-1 hover:bg-gray-100 rounded">
                <RefreshCw className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            {loading ? (
              <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></div>
            ) : workspaces.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">{t('teamSpace.noWorkspaces')}</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {workspaces.map(ws => (
                  <div
                    key={ws.id}
                    onClick={() => selectWorkspace(ws)}
                    className={`p-3 cursor-pointer flex items-center justify-between group ${
                      selectedWs?.id === ws.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{ws.name}</p>
                      <p className="text-xs text-gray-500">{ws.description || t('common:noDescription')}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDeleteWorkspace(ws.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded">
                      <Trash2 className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shared With Me */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm mt-4">
            <div className="p-3 border-b border-gray-200">
              <h2 className="font-semibold text-sm text-gray-700">{t('teamSpace.sharedWithMe')} ({shares.length})</h2>
            </div>
            {shares.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">{t('teamSpace.noSharedStrategies')}</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {shares.map(s => (
                  <div key={s.id} className="p-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-900">{t('teamSpace.strategyId', { id: s.strategy_id })}</p>
                      <p className="text-xs text-gray-500">{t('teamSpace.permission', { permission: s.permission })}</p>
                    </div>
                    <button onClick={() => handleRevokeShare(s.id)} className="p-1 hover:bg-red-100 rounded">
                      <X className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Workspace Detail */}
        <div className="lg:col-span-2">
          {!selectedWs ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center text-gray-400">
              <Users className="h-10 w-10 mx-auto mb-3" />
              <p>{t('teamSpace.selectWorkspace')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{selectedWs.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded ${selectedWs.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {selectedWs.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{selectedWs.description || t('common:noDescription')}</p>
                <p className="text-xs text-gray-400 mt-2">{t('teamSpace.maxMembers', { count: selectedWs.max_members })}</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-gray-700">{t('teamSpace.members')} ({members.length})</h3>
                  <button onClick={() => setShowAddMember(true)} className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                    <UserPlus className="h-3 w-3" /> {t('common:add')}
                  </button>
                </div>
                <div className="divide-y divide-gray-100">
                  {members.map(m => (
                    <div key={m.user_id} className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium text-gray-600">
                          {m.username?.charAt(0)?.toUpperCase() || '#'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{m.username || `User #${m.user_id}`}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${ROLE_COLORS[m.role] || ''}`}>{m.role}</span>
                        </div>
                      </div>
                      {m.role !== 'owner' && (
                        <button onClick={() => handleRemoveMember(m.user_id)} className="p-1 hover:bg-red-100 rounded">
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Workspace Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">{t('teamSpace.newWorkspace')}</h3>
            <div className="space-y-3">
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={t('teamSpace.workspaceName')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={t('common:description')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              <input type="number" value={form.max_members} onChange={e => setForm(f => ({ ...f, max_members: parseInt(e.target.value) || 10 }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">{t('common:cancel')}</button>
              <button onClick={handleCreate} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">{t('common:create')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">{t('teamSpace.addMember')}</h3>
            <div className="space-y-3">
              <input type="number" value={memberForm.user_id} onChange={e => setMemberForm(f => ({ ...f, user_id: e.target.value }))}
                placeholder={t('teamSpace.userId')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              <select value={memberForm.role} onChange={e => setMemberForm(f => ({ ...f, role: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="member">{t('teamSpace.roleMember')}</option>
                <option value="admin">{t('teamSpace.roleAdmin')}</option>
                <option value="viewer">{t('teamSpace.roleViewer')}</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowAddMember(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">{t('common:cancel')}</button>
              <button onClick={handleAddMember} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700">{t('common:add')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Strategy Modal */}
      {showShareStrategy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
            <h3 className="text-lg font-semibold mb-4">{t('teamSpace.shareStrategy')}</h3>
            <div className="space-y-3">
              <input type="number" value={shareForm.strategy_id} onChange={e => setShareForm(f => ({ ...f, strategy_id: e.target.value }))}
                placeholder={t('teamSpace.strategyIdInput')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              <input type="number" value={shareForm.shared_with_user_id} onChange={e => setShareForm(f => ({ ...f, shared_with_user_id: e.target.value }))}
                placeholder={t('teamSpace.shareWithUserId')} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" />
              <select value={shareForm.permission} onChange={e => setShareForm(f => ({ ...f, permission: e.target.value }))}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="view">{t('common:view')}</option>
                <option value="edit">{t('common:edit')}</option>
                <option value="execute">{t('teamSpace.executePermission')}</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setShowShareStrategy(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">{t('common:cancel')}</button>
              <button onClick={handleShareStrategy} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">{t('teamSpace.share')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
