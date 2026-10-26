const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const AppError = require('../utils/AppError');

exports.protectAdmin = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Admin authentication required', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    
    // Check if role is admin
    if (decoded.role !== 'admin') {
      return next(new AppError('Forbidden: Admin access required', 403));
    }

    // Verify admin user exists in admin_users table
    const [admins] = await pool.query(
      'SELECT id, username, email, role, created_at FROM admin_users WHERE id = ?',
      [decoded.id]
    );

    if (admins.length === 0) {
      return next(new AppError('Admin account not found or deactivated', 401));
    }

    req.admin = admins[0];
    next();
  } catch (err) {
    return next(new AppError('Invalid or expired admin session', 401));
  }
};
