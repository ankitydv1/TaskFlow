const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

exports.getDashboard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const isAdmin = req.user.role === 'admin';

    const projectQuery = isAdmin
      ? { isArchived: false }
      : { $or: [{ owner: userId }, { 'members.user': userId }], isArchived: false };

    const taskQuery = isAdmin ? {} : { $or: [{ assignee: userId }, { reporter: userId }] };

    const [
      totalProjects,
      activeProjects,
      totalTasks,
      tasksByStatus,
      tasksByPriority,
      recentTasks,
      overdueTasks,
      myTasks,
      totalUsers,
      projectProgress,
    ] = await Promise.all([
      Project.countDocuments(projectQuery),
      Project.countDocuments({ ...projectQuery, status: 'active' }),
      Task.countDocuments(taskQuery),
      Task.aggregate([
        { $match: taskQuery },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Task.aggregate([
        { $match: taskQuery },
        { $group: { _id: '$priority', count: { $sum: 1 } } },
      ]),
      Task.find(taskQuery)
        .populate('project', 'name color')
        .populate('assignee', 'name avatar')
        .sort({ createdAt: -1 })
        .limit(5),
      Task.countDocuments({
        ...taskQuery,
        dueDate: { $lt: new Date() },
        status: { $ne: 'done' },
      }),
      Task.find({ assignee: userId, status: { $ne: 'done' } })
        .populate('project', 'name color')
        .sort({ dueDate: 1 })
        .limit(8),
      isAdmin ? User.countDocuments({ isActive: true }) : null,
      Project.find(projectQuery)
        .select('name color status')
        .limit(6),
    ]);

    // Calculate completion % per project
    const projectProgressData = await Promise.all(
      projectProgress.map(async (p) => {
        const total = await Task.countDocuments({ project: p._id });
        const done = await Task.countDocuments({ project: p._id, status: 'done' });
        return {
          _id: p._id,
          name: p.name,
          color: p.color,
          status: p.status,
          total,
          done,
          progress: total > 0 ? Math.round((done / total) * 100) : 0,
        };
      })
    );

    res.json({
      success: true,
      data: {
        stats: {
          totalProjects,
          activeProjects,
          totalTasks,
          overdueTasks,
          ...(isAdmin && { totalUsers }),
        },
        tasksByStatus,
        tasksByPriority,
        recentTasks,
        myTasks,
        projectProgress: projectProgressData,
      },
    });
  } catch (error) {
    next(error);
  }
};
