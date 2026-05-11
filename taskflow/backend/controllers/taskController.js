const { validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');

const hasProjectAccess = async (projectId, userId, userRole) => {
  if (userRole === 'admin') return true;
  const project = await Project.findById(projectId);
  if (!project) return false;
  const isOwner = project.owner.toString() === userId.toString();
  const isMember = project.members.some((m) => m.user.toString() === userId.toString());
  return isOwner || isMember;
};

exports.getTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { status, priority, assignee, search, page = 1, limit = 50 } = req.query;

    if (!(await hasProjectAccess(projectId, req.user._id, req.user.role))) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const query = { project: projectId };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignee) query.assignee = assignee;
    if (search) query.title = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('assignee', 'name email avatar')
        .populate('reporter', 'name email avatar')
        .populate('comments.author', 'name avatar')
        .sort({ order: 1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Task.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignee', 'name email avatar')
      .populate('reporter', 'name email avatar')
      .populate('comments.author', 'name email avatar');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    if (!(await hasProjectAccess(task.project, req.user._id, req.user.role))) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const { projectId } = req.params;
    if (!(await hasProjectAccess(projectId, req.user._id, req.user.role))) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const lastTask = await Task.findOne({ project: projectId }).sort({ order: -1 });
    const order = lastTask ? lastTask.order + 1 : 0;

    const task = await Task.create({
      ...req.body,
      project: projectId,
      reporter: req.user._id,
      order,
    });

    await task.populate('assignee reporter', 'name email avatar');
    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    if (!(await hasProjectAccess(task.project, req.user._id, req.user.role))) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const allowed = ['title', 'description', 'status', 'priority', 'assignee', 'dueDate', 'estimatedHours', 'loggedHours', 'tags', 'order'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });
    await task.save();
    await task.populate('assignee reporter', 'name email avatar');

    res.json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    if (!(await hasProjectAccess(task.project, req.user._id, req.user.role))) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const isReporter = task.reporter.toString() === req.user._id.toString();
    if (!isReporter && req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this task.' });
    }

    await task.deleteOne();
    res.json({ success: true, message: 'Task deleted.' });
  } catch (error) {
    next(error);
  }
};

exports.addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required.' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ success: false, message: 'Task not found.' });
    if (!(await hasProjectAccess(task.project, req.user._id, req.user.role))) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    task.comments.push({ author: req.user._id, text: text.trim() });
    await task.save();
    await task.populate('comments.author', 'name email avatar');

    res.status(201).json({ success: true, data: task.comments });
  } catch (error) {
    next(error);
  }
};

exports.getMyTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ assignee: req.user._id })
      .populate('project', 'name color')
      .populate('reporter', 'name email')
      .sort({ dueDate: 1, priority: -1 })
      .limit(50);
    res.json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};
