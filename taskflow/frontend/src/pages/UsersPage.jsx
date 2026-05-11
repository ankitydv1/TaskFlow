import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { LoadingPage, Avatar, EmptyState, Modal, Spinner } from '../components/ui/Components'

const ROLE_COLORS = { admin: 'bg-red-100 text-red-700', manager: 'bg-blue-100 text-blue-700', member: 'bg-gray-100 text-gray-600' }

export default function UsersPage() {
  const { user: me } = useAuth()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => api.get('/users', { params: { search, role: roleFilter } }).then(r => r.data.data),
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ id, role }) => api.put(`/users/${id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('Role updated') },
    onError: () => toast.error('Failed to update role'),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id) => api.put(`/users/${id}/deactivate`),
    onSuccess: () => { qc.invalidateQueries(['users']); setSelectedUser(null); toast.success('User deactivated') },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed'),
  })

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Team</h1>
        <p className="text-gray-500 text-sm">{data?.length || 0} members</p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input className="input sm:max-w-xs" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input w-auto" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="member">Member</option>
        </select>
      </div>

      {data?.length === 0 ? (
        <EmptyState icon="◎" title="No users found" description="No team members match your search." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.map(u => (
            <div key={u._id} className="card p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedUser(u)}>
              <div className="flex items-center gap-3 mb-3">
                <Avatar name={u.name} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                    {u._id === me?._id && <span className="text-xs text-indigo-600 font-medium">(you)</span>}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className={`badge ${ROLE_COLORS[u.role]} capitalize`}>{u.role}</span>
                <span className="text-xs text-gray-400">Joined {format(new Date(u.createdAt), 'MMM yyyy')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User detail modal */}
      <Modal isOpen={!!selectedUser} onClose={() => setSelectedUser(null)} title="User details">
        {selectedUser && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar name={selectedUser.name} size="lg" />
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">{selectedUser.name}</h3>
                <p className="text-gray-500 text-sm">{selectedUser.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Role</p>
                <p className="font-medium capitalize">{selectedUser.role}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500 text-xs mb-1">Joined</p>
                <p className="font-medium">{format(new Date(selectedUser.createdAt), 'MMM d, yyyy')}</p>
              </div>
              {selectedUser.lastLogin && (
                <div className="bg-gray-50 rounded-lg p-3 col-span-2">
                  <p className="text-gray-500 text-xs mb-1">Last login</p>
                  <p className="font-medium">{format(new Date(selectedUser.lastLogin), 'MMM d, yyyy HH:mm')}</p>
                </div>
              )}
            </div>

            {me?.role === 'admin' && selectedUser._id !== me._id && (
              <div className="space-y-3 pt-2 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700">Admin controls</p>
                <div>
                  <label className="label">Change role</label>
                  <div className="flex gap-2">
                    {['member', 'manager', 'admin'].map(r => (
                      <button key={r} onClick={() => updateRoleMutation.mutate({ id: selectedUser._id, role: r })}
                        disabled={updateRoleMutation.isPending || selectedUser.role === r}
                        className={`btn text-xs py-1.5 px-3 ${selectedUser.role === r ? 'btn-primary' : 'btn-secondary'}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <button onClick={() => { if (window.confirm('Deactivate this user?')) deactivateMutation.mutate(selectedUser._id) }}
                  disabled={deactivateMutation.isPending}
                  className="btn-danger text-sm py-2">
                  {deactivateMutation.isPending ? <Spinner /> : 'Deactivate user'}
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
