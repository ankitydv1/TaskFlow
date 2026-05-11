import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import api from '../utils/api'
import { LoadingPage, StatusBadge, PriorityBadge, EmptyState, Avatar } from '../components/ui/Components'

export default function TasksPage() {
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: () => api.get('/tasks/my').then(r => r.data.data),
  })

  const filtered = tasks.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false
    if (priorityFilter && t.priority !== priorityFilter) return false
    return true
  })

  const overdue = filtered.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done')
  const upcoming = filtered.filter(t => !overdue.includes(t) && t.status !== 'done')
  const done = filtered.filter(t => t.status === 'done')

  if (isLoading) return <LoadingPage />

  const Section = ({ title, items, color }) => (
    items.length > 0 && (
      <div>
        <h3 className={`text-sm font-semibold mb-3 ${color}`}>{title} <span className="font-normal text-gray-400">({items.length})</span></h3>
        <div className="space-y-2">
          {items.map(task => (
            <div key={task._id} className="card p-4 hover:shadow-md transition-shadow flex items-start gap-4">
              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${task.status === 'done' ? 'bg-green-400' : task.dueDate && new Date(task.dueDate) < new Date() ? 'bg-red-400' : 'bg-indigo-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-gray-800">{task.title}</p>
                  <div className="flex gap-2 flex-shrink-0">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
                  {task.project && (
                    <Link to={`/projects/${task.project._id}`} className="flex items-center gap-1 hover:text-indigo-600">
                      <span className="w-2 h-2 rounded-full" style={{ background: task.project.color }} />
                      {task.project.name}
                    </Link>
                  )}
                  {task.dueDate && (
                    <span className={new Date(task.dueDate) < new Date() && task.status !== 'done' ? 'text-red-500 font-medium' : ''}>
                      Due {format(new Date(task.dueDate), 'MMM d, yyyy')}
                    </span>
                  )}
                  {task.reporter && <span>by {task.reporter.name}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  )

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-500 text-sm">{filtered.length} tasks assigned to you</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          {['todo', 'in-progress', 'review', 'done'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input w-auto" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}>
          <option value="">All priorities</option>
          {['low', 'medium', 'high', 'critical'].map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="✓" title="No tasks found" description="You have no tasks assigned to you right now." />
      ) : (
        <div className="space-y-8">
          <Section title="Overdue" items={overdue} color="text-red-600" />
          <Section title="Active" items={upcoming} color="text-gray-700" />
          <Section title="Completed" items={done} color="text-green-600" />
        </div>
      )}
    </div>
  )
}
