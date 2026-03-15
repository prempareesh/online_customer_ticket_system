const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All admin routes require authentication and 'admin' role
router.use(protect);
router.use(authorize('admin'));

// Route:  GET /api/admin/users
// Desc:   Get all customer users and their ticket counts
router.get('/users', adminController.getUsers);

// Route:  GET /api/admin/reports
// Desc:   Get platform reports and statistics
router.get('/reports', adminController.getReports);

module.exports = router;
