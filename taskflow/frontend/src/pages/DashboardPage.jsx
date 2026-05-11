import { useQuery } from '@tanstack/react-query'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Link } from 'react-router-dom'
import api from '../utils/api'
import { useAuth } from '../contexts/AuthContext'
import { LoadingPage, StatusBadge, PriorityBadge, Avatar, ProgressBar, EmptyState } from '../components/ui/Components'
import { format } from 'date-fns'

const STATUS_COLORS = { todo: '#94a3b8', 'in-progress': '#6366f1', review: '#8b5cf6', done: '#10b981' }
const PRIORITY_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#f97316', critical: '#ef4444' }

const StatCard = ({ label, value, sub, color = 'indigo' }) => (
  <div className="card p-5">
    <p className="text-sm text-gray-500 mb-1">{label}</p>
    <p className={`text-3xl font-bold text-${color}-600`}>{value ?? '—'}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
)

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data.data),
    refetchInterval: 60000,
  })

  if (isLoading) return <LoadingPage />
  if (error) return <div className="text-red-500 text-sm">Failed to load dashboard.</div>

  const { stats, tasksByStatus = [], tasksByPriority = [], recentTasks = [], myTasks = [], projectProgress = [] } = data || {}

  const statusChartData = tasksByStatus.map(t => ({ name: t._id?.replace('-', ' ') || 'unknown', value: t.count, color: STATUS_COLORS[t._id] || '#94a3b8' }))
  const priorityChartData = tasksByPriority.map(t => ({ name: t._id, value: t.count, color: PRIORITY_COLORS[t._id] || '#94a3b8' }))

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Projects" value={stats?.totalProjects} sub={`${stats?.activeProjects} active`} />
        <StatCard label="Total Tasks" value={stats?.totalTasks} color="blue" />
        <StatCard label="Overdue" value={stats?.overdueTasks} color="red" sub="Need attention" />
        {user?.role === 'admin' && <StatCard label="Team Members" value={stats?.totalUsers} color="green" />}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Tasks by Status</h3>
          {statusChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusChartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                  {statusChartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-10">No tasks yet</p>}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Tasks by Priority</h3>
          {priorityChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={priorityChartData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {priorityChartData.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-gray-400 text-sm text-center py-10">No tasks yet</p>}
        </div>
      </div>

      {/* Project progress */}
      {projectProgress.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Project Progress</h3>
          <div className="space-y-4">
            {projectProgress.map(p => (
              <div key={p._id}>
                <div className="flex items-center justify-between mb-1.5">
                  <Link to={`/projects/${p._id}`} className="text-sm font-medium text-gray-800 hover:text-indigo-600 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    {p.name}
                  </Link>
                  <span className="text-xs text-gray-500">{p.done}/{p.total} tasks · {p.progress}%</span>
                </div>
                <ProgressBar value={p.progress} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My tasks & Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">My Pending Tasks</h3>
            <Link to="/tasks" className="text-xs text-indigo-600 hover:underline">View all</Link>
          </div>
          {myTasks.length === 0 ? (
            <EmptyState icon="✓" title="All done!" description="No pending tasks assigned to you." />
          ) : (
            <div className="space-y-2">
              {myTasks.map(task => (
                <div key={task._id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5" style={{ color: task.project?.color }}>{task.project?.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <PriorityBadge priority={task.priority} />
                    {task.dueDate && <span className="text-xs text-gray-400">{format(new Date(task.dueDate), 'MMM d')}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Recent Activity</h3>
          {recentTasks.length === 0 ? (
            <EmptyState icon="◎" title="No recent tasks" description="Tasks will appear here as they are created." />
          ) : (
            <div className="space-y-2">
              {recentTasks.map(task => (
                <div key={task._id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50">
                  <Avatar name={task.assignee?.name || '?'} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 truncate">{task.title}</p>
                    <p className="text-xs text-gray-400">{task.project?.name} · {format(new Date(task.createdAt), 'MMM d')}</p>
                  </div>
                  <StatusBadge status={task.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
