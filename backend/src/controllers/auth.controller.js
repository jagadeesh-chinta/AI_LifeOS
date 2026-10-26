const jwt = require('jsonwebtoken');
const authService = require('../services/auth.service');
const dashboardService = require('../services/dashboard.service');
const { emitToAdmin } = require('../socket');

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, clientDate } = req.body;
    
    const userId = await authService.registerUser(name, email, password);
    const token = generateToken(userId);
    const streak = await dashboardService.updateStreak(userId, clientDate);

    // Record initial session
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;
    await authService.recordLoginSession(userId, ip, userAgent);

    // Emit real-time update to admin dashboard
    emitToAdmin('new_user_registered', {
      id: userId,
      username: name,
      email,
      created_at: new Date()
    });
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: userId,
        name,
        email,
        avatar: null,
        tour_completed: false,
        current_streak: streak
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password, clientDate } = req.body;
    
    const user = await authService.loginUser(email, password);
    const token = generateToken(user.id);
    const streak = await dashboardService.updateStreak(user.id, clientDate);

    // Record login session
    const ip = req.ip || req.headers['x-forwarded-for'] || null;
    const userAgent = req.headers['user-agent'] || null;
    await authService.recordLoginSession(user.id, ip, userAgent);

    // Emit real-time update to admin dashboard
    emitToAdmin('user_logged_in', {
      userId: user.id,
      username: user.name,
      email: user.email,
      streak,
      login_time: new Date()
    });
    
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        tour_completed: Boolean(user.tour_completed),
        timezone: user.timezone,
        current_streak: streak
      }
    });
  } catch (error) {
    if (error.is_blocked) {
      return res.status(403).json({
        success: false,
        is_blocked: true,
        account_status: error.account_status || 'TEMPORARILY_BLOCKED',
        message: error.message,
        block_reason: error.block_reason,
        blocked_until: error.blocked_until,
        username: error.username,
        email: error.email
      });
    }
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    if (req.user && req.user.id) {
      await authService.recordLogoutSession(req.user.id);
      emitToAdmin('user_logged_out', {
        userId: req.user.id,
        logout_time: new Date()
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user.id);
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const updatedUser = await authService.updateProfile(req.user.id, req.body);

    emitToAdmin('user_profile_updated', {
      userId: req.user.id,
      name: updatedUser.name,
      email: updatedUser.email
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getStats = async (req, res, next) => {
  try {
    const stats = await authService.getUserStats(req.user.id);
    res.status(200).json({
      success: true,
      stats
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please select an image to upload' });
    }

    const result = await authService.updateProfilePhoto(req.user.id, {
      buffer: req.file.buffer,
      mimetype: req.file.mimetype
    });

    emitToAdmin('user_profile_updated', {
      userId: req.user.id,
      avatar: result.avatar
    });

    res.status(200).json({
      success: true,
      message: 'Profile photo updated successfully',
      avatar: result.avatar,
      avatar_public_id: result.avatar_public_id,
      isCloudinary: result.isCloudinary
    });
  } catch (error) {
    next(error);
  }
};

exports.completeTour = async (req, res, next) => {
  try {
    const result = await authService.updateTourStatus(req.user.id, true);
    res.status(200).json({
      success: true,
      message: 'Tour state updated successfully',
      ...result
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const { password, confirmation } = req.body;
    const userId = req.user.id;

    const result = await authService.deleteAccount(userId, password, confirmation);

    try {
      emitToAdmin('user_deleted', {
        userId,
        deleted_at: new Date()
      });
    } catch (socketErr) {
      console.warn('Could not emit user_deleted to admin:', socketErr.message);
    }

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};



