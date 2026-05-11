import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { Avatar, Spinner } from '../components/ui/Components'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ name: user?.name || '', avatar: user?.avatar || '' })
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState({})

  const profileMutation = useMutation({
    mutationFn: (body) => api.put('/auth/profile', body),
    onSuccess: (res) => { updateUser(res.data.user); toast.success('Profile updated!') },
    onError: () => toast.error('Failed to update profile'),
  })

  const passwordMutation = useMutation({
    mutationFn: (body) => api.put('/auth/change-password', body),
    onSuccess: () => { setPwForm({ currentPassword: '', newPassword: '', confirm: '' }); toast.success('Password changed!') },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to change password'),
  })

  const handlePassword = (e) => {
    e.preventDefault()
    const errs = {}
    if (!pwForm.currentPassword) errs.currentPassword = 'Required'
    if (!pwForm.newPassword || pwForm.newPassword.length < 6) errs.newPassword = 'Min 6 characters'
    if (pwForm.newPassword !== pwForm.confirm) errs.confirm = 'Passwords do not match'
    setPwErrors(errs)
    if (Object.keys(errs).length) return
    passwordMutation.mutate({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
  }

  return (
    <div className="max-w-2xl space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-gray-500 text-sm">Manage your account settings</p>
      </div>

      {/* Profile card */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-4 mb-2">
          <Avatar name={user?.name} size="lg" />
          <div>
            <p className="font-semibold text-gray-900 text-lg">{user?.name}</p>
            <p className="text-gray-500 text-sm">{user?.email}</p>
            <span className="badge bg-indigo-100 text-indigo-700 capitalize mt-1">{user?.role}</span>
          </div>
        </div>

        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
        </div>

        <button onClick={() => profileMutation.mutate(form)} disabled={profileMutation.isPending} className="btn-primary">
          {profileMutation.isPending ? <Spinner /> : 'Save changes'}
        </button>
      </div>

      {/* Password card */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-800 mb-4">Change password</h2>
        <form onSubmit={handlePassword} className="space-y-4">
          {[
            { key: 'currentPassword', label: 'Current password' },
            { key: 'newPassword', label: 'New password' },
            { key: 'confirm', label: 'Confirm new password' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input type="password" className={`input ${pwErrors[key] ? 'input-error' : ''}`}
                value={pwForm[key]} onChange={e => { setPwForm(p => ({ ...p, [key]: e.target.value })); setPwErrors(p => ({ ...p, [key]: '' })) }} />
              {pwErrors[key] && <p className="text-red-500 text-xs mt-1">{pwErrors[key]}</p>}
            </div>
          ))}
          <button type="submit" disabled={passwordMutation.isPending} className="btn-secondary">
            {passwordMutation.isPending ? <Spinner /> : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  )
}
