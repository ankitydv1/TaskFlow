const express = require('express');
const router = express.Router();
const { getUsers, getUser, updateUserRole, deactivateUser } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', getUsers);
router.get('/:id', getUser);
router.put('/:id/role', authorize('admin'), updateUserRole);
router.put('/:id/deactivate', authorize('admin'), deactivateUser);

module.exports = router;
