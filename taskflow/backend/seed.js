const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
dotenv.config();

const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await User.deleteMany({});
  await Project.deleteMany({});
  await Task.deleteMany({});

  // Create users
  const admin = await User.create({ name: 'Admin User', email: 'admin@taskflow.com', password: 'admin123', role: 'admin' });
  const manager = await User.create({ name: 'Jane Manager', email: 'manager@taskflow.com', password: 'manager123', role: 'manager' });
  const member = await User.create({ name: 'John Member', email: 'member@taskflow.com', password: 'member123', role: 'member' });

  console.log('Users created');

  // Create projects
  const p1 = await Project.create({
    name: 'Website Redesign',
    description: 'Complete overhaul of the company website with modern design and improved UX.',
    status: 'active',
    priority: 'high',
    owner: admin._id,
    color: '#6366f1',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    members: [{ user: manager._id, role: 'manager' }, { user: member._id, role: 'member' }],
  });

  const p2 = await Project.create({
    name: 'Mobile App Development',
    description: 'Build a cross-platform mobile application for iOS and Android.',
    status: 'planning',
    priority: 'critical',
    owner: manager._id,
    color: '#8b5cf6',
    dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    members: [{ user: member._id, role: 'member' }],
  });

  const p3 = await Project.create({
    name: 'API Integration',
    description: 'Integrate third-party APIs and improve backend performance.',
    status: 'active',
    priority: 'medium',
    owner: admin._id,
    color: '#14b8a6',
    members: [{ user: manager._id, role: 'manager' }],
  });

  console.log('Projects created');

  // Create tasks for p1
  const statuses = ['todo', 'in-progress', 'review', 'done'];
  const priorities = ['low', 'medium', 'high', 'critical'];

  const taskData = [
    { title: 'Design homepage wireframes', status: 'done', priority: 'high', assignee: manager._id },
    { title: 'Create color palette and typography system', status: 'done', priority: 'medium', assignee: member._id },
    { title: 'Build navigation component', status: 'in-progress', priority: 'high', assignee: member._id },
    { title: 'Implement hero section', status: 'in-progress', priority: 'medium', assignee: member._id },
    { title: 'Design mobile responsive layouts', status: 'review', priority: 'high', assignee: manager._id },
    { title: 'Write content for About page', status: 'todo', priority: 'low', assignee: member._id },
    { title: 'Set up analytics tracking', status: 'todo', priority: 'medium', assignee: null },
    { title: 'Performance optimization', status: 'todo', priority: 'critical', assignee: manager._id },
  ];

  for (let i = 0; i < taskData.length; i++) {
    await Task.create({
      ...taskData[i],
      project: p1._id,
      reporter: admin._id,
      order: i,
      dueDate: new Date(Date.now() + (i + 1) * 5 * 24 * 60 * 60 * 1000),
      estimatedHours: Math.floor(Math.random() * 8) + 2,
    });
  }

  // Tasks for p2
  const taskData2 = [
    { title: 'Define app requirements and scope', status: 'done', priority: 'critical', assignee: manager._id },
    { title: 'Choose tech stack (React Native vs Flutter)', status: 'done', priority: 'high', assignee: manager._id },
    { title: 'Create user flow diagrams', status: 'in-progress', priority: 'high', assignee: member._id },
    { title: 'Set up development environment', status: 'todo', priority: 'medium', assignee: member._id },
  ];

  for (let i = 0; i < taskData2.length; i++) {
    await Task.create({ ...taskData2[i], project: p2._id, reporter: manager._id, order: i });
  }

  console.log('Tasks created');
  console.log('\nSeed complete! Demo accounts:');
  console.log('  Admin:   admin@taskflow.com   / admin123');
  console.log('  Manager: manager@taskflow.com / manager123');
  console.log('  Member:  member@taskflow.com  / member123');

  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
