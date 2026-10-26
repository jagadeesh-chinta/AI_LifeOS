const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const AppError = require('../utils/AppError');

const protect = async (req, res, next) => {
  let token;
  
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    return next(new AppError('Not authorized to access this route', 401));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key');
    
    // Validate user in database and check active block / suspension status
    const [rows] = await pool.query(
      'SELECT id, name, email, account_status, blocked_until, block_reason FROM users WHERE id = ?',
      [decoded.id]
    );

    if (rows.length === 0) {
      return next(new AppError('User account no longer exists', 401));
    }

    const user = rows[0];

    // Enforce temporary block
    if (user.account_status === 'TEMPORARILY_BLOCKED') {
      const now = new Date();
      if (user.blocked_until && new Date(user.blocked_until) > now) {
        return res.status(403).json({
          success: false,
          is_blocked: true,
          account_status: 'TEMPORARILY_BLOCKED',
          message: 'Your account has been temporarily restricted by an administrator.',
          block_reason: user.block_reason || 'Administrative restriction',
          blocked_until: user.blocked_until,
          username: user.name,
          email: user.email
        });
      } else {
        // Expiration time passed: automatically restore to ACTIVE without manual intervention
        await pool.query(
          "UPDATE users SET account_status = 'ACTIVE', blocked_until = NULL, block_reason = NULL WHERE id = ?",
          [user.id]
        );
        user.account_status = 'ACTIVE';
      }
    }

    if (user.account_status === 'SUSPENDED') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended by the administrator.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return next(new AppError('Not authorized to access this route', 401));
  }
};

module.exports = { protect };
