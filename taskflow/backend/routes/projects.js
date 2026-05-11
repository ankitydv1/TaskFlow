const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const {
  getProjects, getProject, createProject, updateProject, deleteProject, addMember, removeMember,
} = require('../controllers/projectController');
const { protect } = require('../middleware/auth');

const projectValidation = [
  body('name').trim().isLength({ min: 3, max: 100 }).withMessage('Name must be 3-100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description max 500 chars'),
  body('status').optional().isIn(['planning', 'active', 'on-hold', 'completed', 'cancelled']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
];

router.use(protect);
router.route('/').get(getProjects).post(projectValidation, createProject);
router.route('/:id').get(getProject).put(projectValidation, updateProject).delete(deleteProject);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

module.exports = router;
