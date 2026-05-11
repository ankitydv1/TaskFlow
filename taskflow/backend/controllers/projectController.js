const { validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');

// Helper: check if user can access project
const canAccess = (project, userId) => {
  const isOwner = project.owner._id.toString() === userId.toString();
  const isMember = project.members.some((m) => m.user.toString() === userId.toString());
  return isOwner || isMember;
};

const canManage = (project, user) => {
  if (user.role === 'admin') return true;
  if (project.owner._id.toString() === user._id.toString()) return true;
  const member = project.members.find((m) => m.user.toString() === user._id.toString());
  return member && member.role === 'manager';
};

exports.getProjects = async (req, res, next) => {
  try {
    const { status, priority, search, page = 1, limit = 20 } = req.query;
    const query = {
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }],
      isArchived: false,
    };
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) query.name = { $regex: search, $options: 'i' };

    const skip = (Number(page) - 1) * Number(limit);
    const [projects, total] = await Promise.all([
      Project.find(query)
        .populate('owner', 'name email avatar')
        .populate('members.user', 'name email avatar')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Project.countDocuments(query),
    ]);

    // Attach task counts
    const projectsWithCounts = await Promise.all(
      projects.map(async (p) => {
        const taskCount = await Task.countDocuments({ project: p._id });
        const completedTasks = await Task.countDocuments({ project: p._id, status: 'done' });
        return { ...p.toObject(), taskCount, completedTasks };
      })
    );

    res.json({
      success: true,
      data: projectsWithCounts,
      pagination: { total, page: Number(page), pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error) {
    next(error);
  }
};

exports.getProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('owner', 'name email avatar role')
      .populate('members.user', 'name email avatar role');

    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!canAccess(project, req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const taskStats = await Task.aggregate([
      { $match: { project: project._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    res.json({ success: true, data: { ...project.toObject(), taskStats } });
  } catch (error) {
    next(error);
  }
};

exports.createProject = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const project = await Project.create({ ...req.body, owner: req.user._id });
    await project.populate('owner', 'name email avatar');

    res.status(201).json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

exports.updateProject = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

    const project = await Project.findById(req.params.id).populate('owner', 'name email');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!canManage(project, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this project.' });
    }

    const { name, description, status, priority, dueDate, startDate, color, tags } = req.body;
    Object.assign(project, { name, description, status, priority, dueDate, startDate, color, tags });
    await project.save();

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

exports.deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });

    const isOwner = project.owner.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Only the owner can delete a project.' });
    }

    await Task.deleteMany({ project: project._id });
    await project.deleteOne();

    res.json({ success: true, message: 'Project and all associated tasks deleted.' });
  } catch (error) {
    next(error);
  }
};

exports.addMember = async (req, res, next) => {
  try {
    const { email, role = 'member' } = req.body;
    const project = await Project.findById(req.params.id).populate('owner', 'name email');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!canManage(project, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    const userToAdd = await User.findOne({ email });
    if (!userToAdd) return res.status(404).json({ success: false, message: 'User not found.' });

    const alreadyMember = project.members.some((m) => m.user.toString() === userToAdd._id.toString());
    const isOwner = project.owner._id.toString() === userToAdd._id.toString();
    if (alreadyMember || isOwner) {
      return res.status(400).json({ success: false, message: 'User is already in this project.' });
    }

    project.members.push({ user: userToAdd._id, role });
    await project.save();
    await project.populate('members.user', 'name email avatar');

    res.json({ success: true, data: project });
  } catch (error) {
    next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).populate('owner', 'name email');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found.' });
    if (!canManage(project, req.user)) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    project.members = project.members.filter((m) => m.user.toString() !== req.params.userId);
    await project.save();

    res.json({ success: true, message: 'Member removed.' });
  } catch (error) {
    next(error);
  }
};
