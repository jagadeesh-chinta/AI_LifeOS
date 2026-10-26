const adminService = require('../services/admin.service');

exports.getAdminStatus = async (req, res, next) => {
  try {
    const status = await adminService.getAdminStatus();
    res.json({ success: true, ...status });
  } catch (err) {
    next(err);
  }
};

exports.registerInitialAdmin = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;
    const result = await adminService.registerInitialAdmin({ username, email, password });
    res.status(201).json({
      success: true,
      message: 'Admin account provisioned successfully',
      ...result
    });
  } catch (err) {
    next(err);
  }
};

exports.loginAdmin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await adminService.loginAdmin({ email, password });
    res.json({
      success: true,
      message: 'Admin login successful',
      ...result
    });
  } catch (err) {
    next(err);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const { page, limit, search, status, sortBy, sortOrder } = req.query;
    const data = await adminService.getAllUsers({
      page,
      limit,
      search,
      status,
      sortBy,
      sortOrder
    });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = await adminService.updateUserStatus(id, status);
    res.json({
      success: true,
      message: `User status updated to ${status}`,
      user: updated
    });
  } catch (err) {
    next(err);
  }
};

exports.getAdminStats = async (req, res, next) => {
  try {
    const stats = await adminService.getAdminStats();
    res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
};

// 1. User Full Profile for Admin Modal
exports.getUserProfile = async (req, res, next) => {
  try {
    const profile = await adminService.getUserProfile(req.params.id);
    res.json({ success: true, ...profile });
  } catch (err) {
    next(err);
  }
};

// 2. User Connections Details for Connections View
exports.getUserConnections = async (req, res, next) => {
  try {
    const data = await adminService.getUserConnectionsDetails(req.params.id);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// 3. Block User Account
exports.blockUser = async (req, res, next) => {
  try {
    const user = await adminService.blockUser(req.admin.id, req.params.id, req.body);
    res.json({
      success: true,
      message: `User ${user.name} has been temporarily blocked until ${user.blocked_until}`,
      user
    });
  } catch (err) {
    next(err);
  }
};

// 4. Unblock User Account
exports.unblockUser = async (req, res, next) => {
  try {
    const user = await adminService.unblockUser(req.admin.id, req.params.id, req.body);
    res.json({
      success: true,
      message: `User ${user.name} has been unblocked and restored to active status`,
      user
    });
  } catch (err) {
    next(err);
  }
};

// 5. Permanently Delete User Account
exports.permanentlyDeleteUser = async (req, res, next) => {
  try {
    const { confirmation } = req.body;
    const result = await adminService.permanentlyDeleteUser(req.admin.id, req.params.id, confirmation);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

// 6. User Help Request Submission (public / user endpoint)
exports.submitHelpRequest = async (req, res, next) => {
  try {
    const { message, email, username } = req.body;
    const result = await adminService.submitHelpRequest({
      message,
      email,
      username,
      userId: req.user?.id || null
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

// 7. Get Help Requests for Admin
exports.getHelpRequests = async (req, res, next) => {
  try {
    const data = await adminService.getHelpRequests(req.query);
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
};

// 8. Update Help Request
exports.updateHelpRequest = async (req, res, next) => {
  try {
    const updated = await adminService.updateHelpRequest(req.admin.id, req.params.id, req.body);
    res.json({
      success: true,
      message: 'Help request updated successfully',
      request: updated
    });
  } catch (err) {
    next(err);
  }
};
