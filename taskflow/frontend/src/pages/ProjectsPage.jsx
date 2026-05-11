import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { LoadingPage, EmptyState, StatusBadge, PriorityBadge, Modal, Spinner, ProgressBar } from '../components/ui/Components'
import { format } from 'date-fns'

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#10b981', '#3b82f6', '#f59e0b']

const ProjectForm = ({ initial, onSubmit, loading }) => {
  const [form, setForm] = useState(initial || { name: '', description: '', priority: 'medium', status: 'planning', color: '#6366f1', dueDate: '' })
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.name || form.name.trim().length < 3) e.name = 'Name must be at least 3 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit(form)
  }

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Project name *</label>
        <input className={`input ${errors.name ? 'input-error' : ''}`} value={form.name} onChange={set('name')} placeholder="e.g. Website Redesign" />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={3} value={form.description} onChange={set('description')} placeholder="What is this project about?" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Priority</label>
          <select className="input" value={form.priority} onChange={set('priority')}>
            {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input" value={form.status} onChange={set('status')}>
            {['planning', 'active', 'on-hold', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Due date</label>
        <input type="date" className="input" value={form.dueDate} onChange={set('dueDate')} />
      </div>
      <div>
        <label className="label">Color</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map(c => (
            <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
              className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: form.color === c ? '#1e293b' : 'transparent' }} />
          ))}
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
        {loading ? <Spinner /> : initial ? 'Update project' : 'Create project'}
      </button>
    </form>
  )
}

export default function ProjectsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['projects', search, statusFilter],
    queryFn: () => api.get('/projects', { params: { search, status: statusFilter } }).then(r => r.data.data),
    keepPreviousData: true,
  })

  const createMutation = useMutation({
    mutationFn: (body) => api.post('/projects', body),
    onSuccess: () => { qc.invalidateQueries(['projects']); setShowCreate(false); toast.success('Project created!') },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create project'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/projects/${id}`),
    onSuccess: () => { qc.invalidateQueries(['projects']); toast.success('Project deleted') },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
  })

  if (isLoading) return <LoadingPage />

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500 text-sm">{data?.length || 0} projects</p>
        </div>
        <div className="sm:ml-auto flex gap-3">
          <button onClick={() => setShowCreate(true)} className="btn-primary">+ New project</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input className="input sm:max-w-xs" placeholder="Search projects..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="input sm:max-w-[160px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['planning', 'active', 'on-hold', 'completed', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Grid */}
      {data?.length === 0 ? (
        <EmptyState icon="◫" title="No projects yet" description="Create your first project to start managing work." action={<button onClick={() => setShowCreate(true)} className="btn-primary">Create project</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data?.map(project => (
            <div key={project._id} className="card p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: project.color }} />
                  <Link to={`/projects/${project._id}`} className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-1">
                    {project.name}
                  </Link>
                </div>
                {(user?.role === 'admin' || project.owner?._id === user?._id) && (
                  <button onClick={() => { if (window.confirm('Delete this project?')) deleteMutation.mutate(project._id) }}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-lg leading-none transition-all">×</button>
                )}
              </div>

              {project.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{project.description}</p>}

              <div className="flex gap-2 mb-3 flex-wrap">
                <StatusBadge status={project.status} />
                <PriorityBadge priority={project.priority} />
              </div>

              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span>{project.completedTasks} / {project.taskCount} tasks</span>
                  <span>{project.taskCount > 0 ? Math.round((project.completedTasks / project.taskCount) * 100) : 0}%</span>
                </div>
                <ProgressBar value={project.taskCount > 0 ? (project.completedTasks / project.taskCount) * 100 : 0} />
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <span>◎</span>
                  <span>{project.owner?.name}</span>
                </div>
                {project.dueDate && (
                  <span className={new Date(project.dueDate) < new Date() ? 'text-red-500' : ''}>
                    Due {format(new Date(project.dueDate), 'MMM d')}
                  </span>
                )}
              </div>

              <Link to={`/projects/${project._id}`} className="mt-3 btn-secondary w-full justify-center text-xs py-1.5 block text-center">
                Open project →
              </Link>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="New project">
        <ProjectForm onSubmit={createMutation.mutate} loading={createMutation.isPending} />
      </Modal>
    </div>
  )
}
