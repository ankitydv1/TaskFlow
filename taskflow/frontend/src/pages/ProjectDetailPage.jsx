import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { LoadingPage, StatusBadge, PriorityBadge, Avatar, Modal, Spinner, EmptyState } from '../components/ui/Components'

const COLUMNS = [
  { id: 'todo', label: 'To Do', color: 'bg-gray-100' },
  { id: 'in-progress', label: 'In Progress', color: 'bg-blue-50' },
  { id: 'review', label: 'Review', color: 'bg-purple-50' },
  { id: 'done', label: 'Done', color: 'bg-green-50' },
]

const TaskForm = ({ projectId, members, initial, onSubmit, loading }) => {
  const [form, setForm] = useState(initial || { title: '', description: '', priority: 'medium', status: 'todo', assignee: '', dueDate: '', estimatedHours: '' })
  const [errors, setErrors] = useState({})
  const set = (f) => (e) => { setForm(p => ({ ...p, [f]: e.target.value })); setErrors(p => ({ ...p, [f]: '' })) }

  const submit = (e) => {
    e.preventDefault()
    const err = {}
    if (!form.title || form.title.trim().length < 3) err.title = 'Title must be at least 3 characters'
    setErrors(err)
    if (Object.keys(err).length) return
    onSubmit({ ...form, assignee: form.assignee || undefined, estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="label">Task title *</label>
        <input className={`input ${errors.title ? 'input-error' : ''}`} value={form.title} onChange={set('title')} placeholder="What needs to be done?" />
        {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
      </div>
      <div>
        <label className="label">Description</label>
        <textarea className="input" rows={3} value={form.description} onChange={set('description')} placeholder="Add more details..." />
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
            {['todo', 'in-progress', 'review', 'done'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Assignee</label>
        <select className="input" value={form.assignee} onChange={set('assignee')}>
          <option value="">Unassigned</option>
          {members?.map(m => <option key={m.user._id} value={m.user._id}>{m.user.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Due date</label>
          <input type="date" className="input" value={form.dueDate} onChange={set('dueDate')} />
        </div>
        <div>
          <label className="label">Est. hours</label>
          <input type="number" className="input" value={form.estimatedHours} onChange={set('estimatedHours')} placeholder="0" min="0" />
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
        {loading ? <Spinner /> : initial ? 'Update task' : 'Create task'}
      </button>
    </form>
  )
}

const TaskCard = ({ task, onEdit, onDelete }) => (
  <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-all cursor-pointer group animate-slideIn" onClick={() => onEdit(task)}>
    <div className="flex items-start justify-between gap-2 mb-2">
      <p className="text-sm font-medium text-gray-800 leading-snug flex-1">{task.title}</p>
      <button onClick={(e) => { e.stopPropagation(); onDelete(task._id) }}
        className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-base leading-none flex-shrink-0">×</button>
    </div>
    {task.description && <p className="text-xs text-gray-400 mb-2 line-clamp-2">{task.description}</p>}
    <div className="flex items-center gap-2 flex-wrap mb-2">
      <PriorityBadge priority={task.priority} />
      {task.dueDate && (
        <span className={`text-xs ${new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          {format(new Date(task.dueDate), 'MMM d')}
        </span>
      )}
    </div>
    {task.assignee && (
      <div className="flex items-center gap-1.5">
        <Avatar name={task.assignee.name} size="sm" />
        <span className="text-xs text-gray-500 truncate">{task.assignee.name}</span>
      </div>
    )}
  </div>
)

export default function ProjectDetailPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [taskModal, setTaskModal] = useState(null)
  const [editTask, setEditTask] = useState(null)
  const [activeTab, setActiveTab] = useState('board')

  const { data: project, isLoading: projLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => api.get(`/projects/${id}`).then(r => r.data.data),
  })

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api.get(`/tasks/project/${id}`).then(r => r.data.data),
  })

  const createTask = useMutation({
    mutationFn: (body) => api.post(`/tasks/project/${id}`, body),
    onSuccess: () => { qc.invalidateQueries(['tasks', id]); setTaskModal(null); toast.success('Task created!') },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create task'),
  })

  const updateTask = useMutation({
    mutationFn: ({ taskId, body }) => api.put(`/tasks/${taskId}`, body),
    onSuccess: () => { qc.invalidateQueries(['tasks', id]); setEditTask(null); toast.success('Task updated') },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
  })

  const deleteTask = useMutation({
    mutationFn: (taskId) => api.delete(`/tasks/${taskId}`),
    onSuccess: () => { qc.invalidateQueries(['tasks', id]); toast.success('Task deleted') },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
  })

  if (projLoading || tasksLoading) return <LoadingPage />
  if (!project) return <div className="text-red-500">Project not found.</div>

  const tasks = tasksData || []
  const allMembers = [{ user: project.owner, role: 'manager' }, ...(project.members || [])]

  const handleDeleteTask = (taskId) => {
    if (window.confirm('Delete this task?')) deleteTask.mutate(taskId)
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
            <Link to="/projects" className="hover:text-indigo-600">Projects</Link>
            <span>/</span>
            <span className="text-gray-600">{project.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-4 h-4 rounded-full" style={{ background: project.color }} />
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            <StatusBadge status={project.status} />
          </div>
          {project.description && <p className="text-gray-500 text-sm mt-1">{project.description}</p>}
        </div>
        <button onClick={() => setTaskModal('create')} className="btn-primary flex-shrink-0">+ Add task</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {['board', 'list', 'members'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Board view */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 overflow-x-auto">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.id)
            return (
              <div key={col.id} className={`${col.color} rounded-xl p-3 min-w-[240px]`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-gray-700">{col.label}</span>
                  <span className="text-xs bg-white rounded-full px-2 py-0.5 text-gray-500 font-medium">{colTasks.length}</span>
                </div>
                <div className="kanban-column">
                  {colTasks.map(task => (
                    <TaskCard key={task._id} task={task} onEdit={setEditTask} onDelete={handleDeleteTask} />
                  ))}
                  <button onClick={() => setTaskModal(col.id)}
                    className="w-full text-xs text-gray-400 hover:text-indigo-600 hover:bg-white rounded-lg py-2 border border-dashed border-gray-300 hover:border-indigo-400 transition-all">
                    + Add task
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {activeTab === 'list' && (
        <div className="card overflow-hidden">
          {tasks.length === 0 ? (
            <EmptyState icon="✓" title="No tasks yet" description="Add tasks to get started." action={<button onClick={() => setTaskModal('create')} className="btn-primary">Add task</button>} />
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Task', 'Status', 'Priority', 'Assignee', 'Due date'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map(task => (
                  <tr key={task._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setEditTask(task)}>
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-xs truncate">{task.title}</td>
                    <td className="px-4 py-3"><StatusBadge status={task.status} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={task.priority} /></td>
                    <td className="px-4 py-3">
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar name={task.assignee.name} size="sm" />
                          <span className="text-gray-600">{task.assignee.name}</span>
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {task.dueDate ? <span className={new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500 font-medium' : ''}>{format(new Date(task.dueDate), 'MMM d, yyyy')}</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Members view */}
      {activeTab === 'members' && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Team members ({allMembers.length})</h3>
          <div className="space-y-3">
            {allMembers.map(m => (
              <div key={m.user._id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                <Avatar name={m.user.name} size="md" />
                <div className="flex-1">
                  <p className="font-medium text-gray-800">{m.user.name}</p>
                  <p className="text-sm text-gray-500">{m.user.email}</p>
                </div>
                <span className="badge bg-indigo-100 text-indigo-700 capitalize">{m.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create task modal */}
      <Modal isOpen={!!taskModal} onClose={() => setTaskModal(null)} title="New task">
        <TaskForm
          projectId={id}
          members={project.members}
          initial={{ title: '', description: '', priority: 'medium', status: taskModal !== 'create' ? taskModal : 'todo', assignee: '', dueDate: '', estimatedHours: '' }}
          onSubmit={createTask.mutate}
          loading={createTask.isPending}
        />
      </Modal>

      {/* Edit task modal */}
      <Modal isOpen={!!editTask} onClose={() => setEditTask(null)} title="Edit task">
        {editTask && (
          <TaskForm
            projectId={id}
            members={project.members}
            initial={{ ...editTask, assignee: editTask.assignee?._id || '', dueDate: editTask.dueDate ? format(new Date(editTask.dueDate), 'yyyy-MM-dd') : '' }}
            onSubmit={(body) => updateTask.mutate({ taskId: editTask._id, body })}
            loading={updateTask.isPending}
          />
        )}
      </Modal>
    </div>
  )
}
