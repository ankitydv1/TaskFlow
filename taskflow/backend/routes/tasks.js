const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { getTasks, getTask, createTask, updateTask, deleteTask, addComment, getMyTasks } = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

const taskValidation = [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('status').optional().isIn(['todo', 'in-progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
];

router.use(protect);
router.get('/my', getMyTasks);
router.route('/project/:projectId').get(getTasks).post(taskValidation, createTask);
router.route('/:id').get(getTask).put(taskValidation, updateTask).delete(deleteTask);
router.post('/:id/comments', addComment);

module.exports = router;
