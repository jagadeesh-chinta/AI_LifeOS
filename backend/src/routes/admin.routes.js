const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { protectAdmin } = require('../middleware/admin.middleware');

// Public admin & help request endpoints
router.get('/status', adminController.getAdminStatus);
router.post('/register', adminController.registerInitialAdmin);
router.post('/login', adminController.loginAdmin);
router.post('/help-requests', adminController.submitHelpRequest);

// Protected admin routes
router.use(protectAdmin);

router.get('/stats', adminController.getAdminStats);
router.get('/users', adminController.getUsers);
router.get('/users/:id/profile', adminController.getUserProfile);
router.get('/users/:id/connections', adminController.getUserConnections);
router.post('/users/:id/block', adminController.blockUser);
router.post('/users/:id/unblock', adminController.unblockUser);
router.delete('/users/:id/permanent', adminController.permanentlyDeleteUser);
router.put('/users/:id/status', adminController.updateUserStatus);

// Help & Feedback management routes
router.get('/help-requests', adminController.getHelpRequests);
router.put('/help-requests/:id', adminController.updateHelpRequest);

module.exports = router;
