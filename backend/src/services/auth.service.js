const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const uploadService = require('./upload.service');
const AppError = require('../utils/AppError');

exports.registerUser = async (name, email, password) => {
  // Check if user already exists
  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length > 0) {
    throw new AppError('Email is already registered', 400);
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Insert user
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
    [name, email, hashedPassword]
  );

  // Initialize default preferences
  await pool.query(
    'INSERT INTO user_preferences (user_id) VALUES (?)',
    [result.insertId]
  );

  return result.insertId;
};

exports.loginUser = async (email, password) => {
  const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (users.length === 0) {
    throw new AppError('Invalid credentials', 401);
  }

  const user = users[0];

  if (user.account_status === 'TEMPORARILY_BLOCKED') {
    const now = new Date();
    if (user.blocked_until && new Date(user.blocked_until) > now) {
      const err = new AppError('Your account has been temporarily restricted by an administrator.', 403);
      err.is_blocked = true;
      err.account_status = 'TEMPORARILY_BLOCKED';
      err.block_reason = user.block_reason || 'Administrative restriction';
      err.blocked_until = user.blocked_until;
      err.username = user.name;
      err.email = user.email;
      throw err;
    } else {
      // Expiration time passed: automatically restore to ACTIVE
      await pool.query(
        "UPDATE users SET account_status = 'ACTIVE', blocked_until = NULL, block_reason = NULL WHERE id = ?",
        [user.id]
      );
      user.account_status = 'ACTIVE';
    }
  }

  if (user.account_status === 'SUSPENDED') {
    throw new AppError('Your account has been suspended by the administrator.', 403);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  
  if (!isMatch) {
    throw new AppError('Invalid credentials', 401);
  }

  return user;
};

exports.recordLoginSession = async (userId, ipAddress, userAgent) => {
  // Mark any previous active sessions as ended
  await pool.query(
    'UPDATE user_login_logs SET is_active = FALSE, logout_time = NOW() WHERE user_id = ? AND is_active = TRUE',
    [userId]
  );

  // Insert new login log
  await pool.query(
    'INSERT INTO user_login_logs (user_id, ip_address, user_agent, is_active) VALUES (?, ?, ?, TRUE)',
    [userId, ipAddress || null, userAgent || null]
  );

  // Update last_login_date on user
  await pool.query('UPDATE users SET last_login_date = NOW() WHERE id = ?', [userId]);
};

exports.recordLogoutSession = async (userId) => {
  // Mark active sessions as ended
  await pool.query(
    'UPDATE user_login_logs SET is_active = FALSE, logout_time = NOW() WHERE user_id = ? AND is_active = TRUE',
    [userId]
  );

  // Update last_logout_date on user
  await pool.query('UPDATE users SET last_logout_date = NOW() WHERE id = ?', [userId]);
};

exports.getUserById = async (id) => {
  const [users] = await pool.query(
    'SELECT id, name, email, avatar, avatar_public_id, tour_completed, timezone, current_streak, created_at, account_status, blocked_until, block_reason FROM users WHERE id = ?',
    [id]
  );
  
  if (users.length === 0) {
    throw new AppError('User not found', 404);
  }
  
  const user = users[0];
  user.tour_completed = Boolean(user.tour_completed);
  return user;
};

exports.updateProfilePhoto = async (userId, { buffer, mimetype }) => {
  // Fetch current avatar details to delete previous Cloudinary asset if replaced
  const [currentUsers] = await pool.query('SELECT avatar, avatar_public_id FROM users WHERE id = ?', [userId]);
  if (currentUsers.length === 0) {
    throw new AppError('User not found', 404);
  }
  const oldPublicId = currentUsers[0].avatar_public_id;

  // Upload to Cloudinary
  const result = await uploadService.uploadProfilePhoto({ buffer, mimetype, userId });

  // Update MySQL record
  await pool.query(
    'UPDATE users SET avatar = ?, avatar_public_id = ? WHERE id = ?',
    [result.url, result.publicId, userId]
  );

  // If old asset exists and differs, safely delete it
  if (oldPublicId && oldPublicId !== result.publicId) {
    uploadService.deleteCloudinaryPhoto(oldPublicId).catch((err) => {
      console.warn('Old asset delete warning:', err.message);
    });
  }

  return {
    avatar: result.url,
    avatar_public_id: result.publicId,
    isCloudinary: result.isCloudinary
  };
};

exports.updateTourStatus = async (userId, completed = true) => {
  await pool.query('UPDATE users SET tour_completed = ? WHERE id = ?', [completed ? 1 : 0, userId]);
  return { tour_completed: Boolean(completed) };
};

exports.updateProfile = async (userId, data) => {
  const { name, email } = data;

  if (!name || !name.trim()) {
    throw new AppError('Name is required', 400);
  }

  if (!email || !email.trim()) {
    throw new AppError('Email is required', 400);
  }

  // Check email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw new AppError('Invalid email format', 400);
  }

  // Check email uniqueness
  const [existing] = await pool.query(
    'SELECT id FROM users WHERE email = ? AND id != ?',
    [email.trim().toLowerCase(), userId]
  );

  if (existing.length > 0) {
    throw new AppError('Email is already in use by another account', 400);
  }

  await pool.query(
    'UPDATE users SET name = ?, email = ? WHERE id = ?',
    [name.trim(), email.trim().toLowerCase(), userId]
  );

  return this.getUserById(userId);
};

exports.changePassword = async (userId, currentPassword, newPassword) => {
  if (!currentPassword) {
    throw new AppError('Current password is required', 400);
  }

  if (!newPassword || newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters long', 400);
  }

  const [users] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    throw new AppError('User not found', 404);
  }

  const isMatch = await bcrypt.compare(currentPassword, users[0].password);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);

  return { success: true, message: 'Password successfully changed' };
};

exports.getUserStats = async (userId) => {
  // 1. Tasks completed count
  const [[{ completedCount }]] = await pool.query(
    "SELECT COUNT(*) as completedCount FROM tasks WHERE user_id = ? AND status = 'COMPLETED'",
    [userId]
  );

  // 2. Total tasks count
  const [[{ totalTasks }]] = await pool.query(
    'SELECT COUNT(*) as totalTasks FROM tasks WHERE user_id = ?',
    [userId]
  );

  // 3. Active goals count
  const [[{ activeGoals }]] = await pool.query(
    "SELECT COUNT(*) as activeGoals FROM goals WHERE user_id = ? AND status != 'COMPLETED'",
    [userId]
  );

  // 4. Notes count
  const [[{ totalNotes }]] = await pool.query(
    'SELECT COUNT(*) as totalNotes FROM notes WHERE user_id = ?',
    [userId]
  );

  // 5. Documents count
  let totalDocs = 0;
  try {
    const [[{ docCount }]] = await pool.query(
      'SELECT COUNT(*) as docCount FROM documents WHERE user_id = ?',
      [userId]
    );
    totalDocs = docCount;
  } catch {}

  // 6. User streak & details
  const [users] = await pool.query(
    'SELECT current_streak, created_at FROM users WHERE id = ?',
    [userId]
  );

  const currentStreak = users.length > 0 ? (users[0].current_streak || 0) : 0;
  const createdAt = users.length > 0 ? users[0].created_at : null;

  return {
    tasks_completed: completedCount || 0,
    total_tasks: totalTasks || 0,
    active_goals: activeGoals || 0,
    total_notes: totalNotes || 0,
    total_documents: totalDocs || 0,
    current_streak: currentStreak,
    member_since: createdAt
  };
};

/**
 * Permanently deletes a user account and all associated data within a MySQL transaction.
 * @param {number} userId - The authenticated user's ID
 * @param {string} password - User password for re-authentication
 * @param {string} confirmationText - Must strictly match "DELETE MY ACCOUNT"
 */
exports.deleteAccount = async (userId, password, confirmationText) => {
  // 1. Strict validation
  if (!confirmationText || confirmationText.trim() !== 'DELETE MY ACCOUNT') {
    throw new AppError('Confirmation phrase must be exactly "DELETE MY ACCOUNT"', 400);
  }

  if (!password) {
    throw new AppError('Password is required to confirm account deletion', 400);
  }

  // 2. Fetch user to verify credentials and get external asset references
  const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = users[0];

  // Re-authenticate
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Incorrect password. Account deletion aborted.', 401);
  }

  await exports.permanentlyDeleteUserData(userId);

  return {
    success: true,
    message: 'Your account and associated data have been permanently deleted.'
  };
};

/**
 * Atomic helper to permanently delete all data belonging to a user.
 * Reused by both user self-deletion and admin-authorized permanent deletion.
 */
exports.permanentlyDeleteUserData = async (userId) => {
  // 1. Find document file paths before deletion to clean up physical storage
  let documentPaths = [];
  try {
    const [docs] = await pool.query('SELECT file_path FROM documents WHERE user_id = ?', [userId]);
    documentPaths = docs.map(d => d.file_path).filter(Boolean);
  } catch (err) {
    console.warn('Could not query user documents for deletion:', err.message);
  }

  const [users] = await pool.query('SELECT avatar_public_id FROM users WHERE id = ?', [userId]);
  const avatarPublicId = users[0]?.avatar_public_id;

  // 2. Atomic MySQL Transaction
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // A. Delete dependent schedule_items (child of schedules, tasks, goals, habits)
    await connection.query(
      'DELETE FROM schedule_items WHERE schedule_id IN (SELECT id FROM schedules WHERE user_id = ?)',
      [userId]
    );

    // B. Delete dependent goal_tasks (child of goals and tasks)
    await connection.query(
      'DELETE FROM goal_tasks WHERE goal_id IN (SELECT id FROM goals WHERE user_id = ?) OR task_id IN (SELECT id FROM tasks WHERE user_id = ?)',
      [userId, userId]
    );

    // C. Delete dependent habit_logs (child of habits)
    await connection.query(
      'DELETE FROM habit_logs WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ?)',
      [userId]
    );

    // D. Delete documents
    await connection.query('DELETE FROM documents WHERE user_id = ?', [userId]);

    // E. Delete notes
    await connection.query('DELETE FROM notes WHERE user_id = ?', [userId]);

    // F. Delete schedules
    await connection.query('DELETE FROM schedules WHERE user_id = ?', [userId]);

    // G. Delete tasks
    await connection.query('DELETE FROM tasks WHERE user_id = ?', [userId]);

    // H. Delete goals
    await connection.query('DELETE FROM goals WHERE user_id = ?', [userId]);

    // I. Delete habits
    await connection.query('DELETE FROM habits WHERE user_id = ?', [userId]);

    // J. Delete events
    await connection.query('DELETE FROM events WHERE user_id = ?', [userId]);

    // K. Delete timetables and saved_timetables
    await connection.query('DELETE FROM timetables WHERE user_id = ?', [userId]);
    await connection.query('DELETE FROM saved_timetables WHERE user_id = ?', [userId]);

    // L. Delete travel_plans
    await connection.query('DELETE FROM travel_plans WHERE user_id = ?', [userId]);

    // M. Delete budget_entries
    await connection.query('DELETE FROM budget_entries WHERE user_id = ?', [userId]);

    // N. Delete notifications
    await connection.query('DELETE FROM notifications WHERE user_id = ?', [userId]);

    // N2. Delete connections (cascading conversations and messages)
    await connection.query('DELETE FROM connections WHERE user_id_1 = ? OR user_id_2 = ?', [userId, userId]);

    // O. Delete user_daily_usage
    await connection.query('DELETE FROM user_daily_usage WHERE user_id = ?', [userId]);

    // P. Delete user_login_logs
    await connection.query('DELETE FROM user_login_logs WHERE user_id = ?', [userId]);

    // Q. Delete user_preferences
    await connection.query('DELETE FROM user_preferences WHERE user_id = ?', [userId]);

    // Q2. Delete account_block_history
    await connection.query('DELETE FROM account_block_history WHERE user_id = ?', [userId]);

    // Q3. Set user_id NULL in help_requests
    await connection.query('UPDATE help_requests SET user_id = NULL WHERE user_id = ?', [userId]);

    // R. Finally, delete user row
    await connection.query('DELETE FROM users WHERE id = ?', [userId]);

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    console.error(`Account deletion transaction failed for user ${userId}:`, error);
    throw new AppError('Failed to delete account data. Database transaction rolled back.', 500);
  } finally {
    connection.release();
  }

  // 3. External cleanup (executed only after successful DB transaction commit)
  for (const filePath of documentPaths) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      console.warn(`Could not remove physical document file ${filePath}:`, err.message);
    }
  }

  if (avatarPublicId) {
    try {
      await uploadService.deleteCloudinaryPhoto(avatarPublicId);
    } catch (err) {
      console.warn(`Could not remove Cloudinary avatar ${avatarPublicId}:`, err.message);
    }
  }

  return { success: true };
};

