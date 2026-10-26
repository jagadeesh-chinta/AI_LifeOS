const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const { emitToAdmin, emitToUser, disconnectUserSockets } = require('../socket');
const authService = require('./auth.service');
const { createNotification } = require('./notification.service');

const generateAdminToken = (admin) => {
  return jwt.sign(
    { id: admin.id, username: admin.username, email: admin.email, role: 'admin' },
    process.env.JWT_SECRET || 'your_jwt_secret_key',
    { expiresIn: '7d' }
  );
};

// Check if any admin account exists
exports.getAdminStatus = async () => {
  const [[{ count }]] = await pool.query('SELECT COUNT(*) as count FROM admin_users');
  return { hasAdmin: count > 0 };
};

// Register initial admin - only allowed when no admin exists
exports.registerInitialAdmin = async ({ username, email, password }) => {
  if (!username || !username.trim()) {
    throw new AppError('Admin username is required', 400);
  }
  if (!email || !email.trim()) {
    throw new AppError('Admin email is required', 400);
  }
  if (!password || password.length < 6) {
    throw new AppError('Password must be at least 6 characters long', 400);
  }

  const [[{ count }]] = await pool.query('SELECT COUNT(*) as count FROM admin_users');
  if (count > 0) {
    throw new AppError('Initial admin setup has already been completed. Public registration is disabled.', 403);
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const [result] = await pool.query(
    'INSERT INTO admin_users (username, email, password, role) VALUES (?, ?, ?, ?)',
    [username.trim(), email.trim().toLowerCase(), hashedPassword, 'admin']
  );

  const admin = {
    id: result.insertId,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    role: 'admin'
  };

  const token = generateAdminToken(admin);
  return { admin, token };
};

// Admin Login
exports.loginAdmin = async ({ email, password }) => {
  if (!email || !password) {
    throw new AppError('Email and password are required', 400);
  }

  const [admins] = await pool.query(
    'SELECT * FROM admin_users WHERE email = ? OR username = ?',
    [email.trim().toLowerCase(), email.trim()]
  );

  if (admins.length === 0) {
    throw new AppError('Invalid admin credentials', 401);
  }

  const admin = admins[0];
  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    throw new AppError('Invalid admin credentials', 401);
  }

  const adminPayload = {
    id: admin.id,
    username: admin.username,
    email: admin.email,
    role: admin.role
  };

  const token = generateAdminToken(adminPayload);
  return { admin: adminPayload, token };
};

// Get all registered users with rich session, block & activity metadata
exports.getAllUsers = async ({
  page = 1,
  limit = 10,
  search = '',
  status = '',
  sortBy = 'created_at',
  sortOrder = 'DESC'
}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  let whereClauses = [];

  if (search && search.trim()) {
    whereClauses.push('(u.name LIKE ? OR u.email LIKE ?)');
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  if (status && status.trim() && status !== 'ALL') {
    if (status === 'TEMPORARILY_BLOCKED') {
      whereClauses.push("u.account_status = 'TEMPORARILY_BLOCKED' AND u.blocked_until > NOW()");
    } else if (status === 'ACTIVE') {
      whereClauses.push("(u.account_status = 'ACTIVE' OR (u.account_status = 'TEMPORARILY_BLOCKED' AND u.blocked_until <= NOW()))");
    } else {
      whereClauses.push('u.account_status = ?');
      params.push(status.trim().toUpperCase());
    }
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const allowedSortCols = {
    name: 'u.name',
    email: 'u.email',
    created_at: 'u.created_at',
    last_login: 'last_login_time',
    streak: 'u.current_streak',
    status: 'u.account_status'
  };
  const sortCol = allowedSortCols[sortBy] || 'u.created_at';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) as total FROM users u ${whereSql}`,
    params
  );

  const querySql = `
    SELECT 
      u.id,
      u.name as username,
      u.email,
      u.avatar,
      u.current_streak,
      u.account_status,
      u.blocked_until,
      u.block_reason,
      u.blocked_at,
      u.created_at,
      u.updated_at as last_activity_time,
      u.last_logout_date,
      (
        SELECT ull.login_time 
        FROM user_login_logs ull 
        WHERE ull.user_id = u.id 
        ORDER BY ull.login_time DESC 
        LIMIT 1
      ) as last_login_time,
      (
        SELECT ull.logout_time 
        FROM user_login_logs ull 
        WHERE ull.user_id = u.id AND ull.logout_time IS NOT NULL 
        ORDER BY ull.logout_time DESC 
        LIMIT 1
      ) as last_session_logout,
      (
        SELECT ull.is_active 
        FROM user_login_logs ull 
        WHERE ull.user_id = u.id 
        ORDER BY ull.login_time DESC 
        LIMIT 1
      ) as has_active_session,
      (
        SELECT COUNT(*) FROM tasks t WHERE t.user_id = u.id
      ) as total_tasks,
      (
        SELECT COUNT(*) FROM tasks t WHERE t.user_id = u.id AND t.status = 'COMPLETED'
      ) as completed_tasks
    FROM users u
    ${whereSql}
    ORDER BY ${sortCol} ${order}
    LIMIT ? OFFSET ?
  `;

  const queryParams = [...params, parseInt(limit), parseInt(offset)];
  const [users] = await pool.query(querySql, queryParams);

  const now = new Date();
  const formattedUsers = users.map(u => {
    let effectiveStatus = u.account_status || 'ACTIVE';
    // Expired blocks automatically surface as ACTIVE
    if (effectiveStatus === 'TEMPORARILY_BLOCKED' && u.blocked_until && new Date(u.blocked_until) <= now) {
      effectiveStatus = 'ACTIVE';
    }

    return {
      id: u.id,
      username: u.username,
      email: u.email,
      avatar: u.avatar,
      created_at: u.created_at,
      last_login_time: u.last_login_time || null,
      last_logout_time: u.last_logout_date || u.last_session_logout || null,
      is_online: Boolean(u.has_active_session),
      session_status: Boolean(u.has_active_session) ? 'ONLINE' : 'OFFLINE',
      current_streak: u.current_streak || 0,
      last_activity_time: u.last_activity_time || u.created_at,
      account_status: effectiveStatus,
      blocked_until: u.blocked_until || null,
      block_reason: u.block_reason || null,
      blocked_at: u.blocked_at || null,
      total_tasks: u.total_tasks || 0,
      completed_tasks: u.completed_tasks || 0
    };
  });

  return {
    users: formattedUsers,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)) || 1
    }
  };
};

// Update user status legacy method
exports.updateUserStatus = async (userId, status) => {
  const allowed = ['ACTIVE', 'SUSPENDED'];
  const formattedStatus = status.toUpperCase();
  if (!allowed.includes(formattedStatus)) {
    throw new AppError('Invalid account status. Allowed: ACTIVE, SUSPENDED', 400);
  }

  await pool.query('UPDATE users SET account_status = ? WHERE id = ?', [formattedStatus, userId]);

  if (formattedStatus === 'SUSPENDED') {
    await pool.query(
      'UPDATE user_login_logs SET is_active = FALSE, logout_time = NOW() WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );
    disconnectUserSockets(userId);
  }

  const [users] = await pool.query('SELECT id, name, email, account_status FROM users WHERE id = ?', [userId]);
  const user = users[0];

  emitToAdmin('user_status_changed', {
    userId,
    status: formattedStatus,
    email: user?.email
  });

  return user;
};

// Overall admin dashboard overview counters
exports.getAdminStats = async () => {
  const [[{ totalUsers }]] = await pool.query('SELECT COUNT(*) as totalUsers FROM users');
  // Active Accounts excludes temporarily blocked (with future expiry) and suspended users
  const [[{ activeUsers }]] = await pool.query(
    "SELECT COUNT(*) as activeUsers FROM users WHERE account_status = 'ACTIVE' OR (account_status = 'TEMPORARILY_BLOCKED' AND blocked_until <= NOW())"
  );
  const [[{ onlineUsers }]] = await pool.query(
    'SELECT COUNT(DISTINCT user_id) as onlineUsers FROM user_login_logs WHERE is_active = TRUE'
  );
  const [[{ totalTasks }]] = await pool.query('SELECT COUNT(*) as totalTasks FROM tasks');
  const [[{ totalGoals }]] = await pool.query('SELECT COUNT(*) as totalGoals FROM goals');
  const [[{ totalDocuments }]] = await pool.query('SELECT COUNT(*) as totalDocuments FROM documents');

  return {
    totalUsers,
    activeUsers,
    onlineUsers,
    totalTasks,
    totalGoals,
    totalDocuments
  };
};

// 1. Get comprehensive user profile details and authorized history for Admin Modal
exports.getUserProfile = async (userId) => {
  const [users] = await pool.query(
    `SELECT u.id, u.name as username, u.email, u.avatar, u.timezone, u.current_streak,
            u.account_status, u.blocked_until, u.block_reason, u.blocked_at, u.blocked_by,
            u.created_at, u.updated_at, u.last_login_date, u.last_logout_date,
            (SELECT ull.is_active FROM user_login_logs ull WHERE ull.user_id = u.id ORDER BY ull.login_time DESC LIMIT 1) as has_active_session,
            (SELECT ull.login_time FROM user_login_logs ull WHERE ull.user_id = u.id ORDER BY ull.login_time DESC LIMIT 1) as latest_login_time,
            (SELECT ull.logout_time FROM user_login_logs ull WHERE ull.user_id = u.id AND ull.logout_time IS NOT NULL ORDER BY ull.logout_time DESC LIMIT 1) as latest_logout_time
     FROM users u
     WHERE u.id = ?`,
    [userId]
  );

  if (users.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = users[0];

  // Auto-expire block if time has passed
  const now = new Date();
  if (user.account_status === 'TEMPORARILY_BLOCKED' && user.blocked_until && new Date(user.blocked_until) <= now) {
    user.account_status = 'ACTIVE';
    await pool.query("UPDATE users SET account_status = 'ACTIVE', blocked_until = NULL, block_reason = NULL WHERE id = ?", [user.id]);
  }

  // 1. Goals
  const [goals] = await pool.query(
    `SELECT id, title, description, priority, progress, status, duration_value, duration_unit, custom_duration, target_date, created_at
     FROM goals WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );

  // 2. Tasks
  const [tasks] = await pool.query(
    `SELECT id, title, description, priority, status, due_date, estimated_minutes, category, created_at
     FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`,
    [userId]
  );

  // 3. Habits
  const [habits] = await pool.query(
    `SELECT h.id, h.name, h.frequency, h.target_count, h.preferred_time, h.created_at,
            (SELECT COUNT(*) FROM habit_logs hl WHERE hl.habit_id = h.id) as completion_count
     FROM habits h WHERE h.user_id = ? ORDER BY h.created_at DESC`,
    [userId]
  );

  // 4. Notes
  const [notes] = await pool.query(
    `SELECT id, title, content, tags, created_at, updated_at
     FROM notes WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );

  // 5. Documents
  const [documents] = await pool.query(
    `SELECT id, original_name, file_size, mime_type, created_at
     FROM documents WHERE user_id = ? ORDER BY created_at DESC`,
    [userId]
  );

  // 6. Events & Schedules
  const [events] = await pool.query(
    `SELECT id, title, start_time, end_time, event_type, location, created_at
     FROM events WHERE user_id = ? ORDER BY start_time DESC LIMIT 20`,
    [userId]
  );

  const [schedules] = await pool.query(
    `SELECT id, schedule_date, generated_by_ai, created_at
     FROM schedules WHERE user_id = ? ORDER BY schedule_date DESC LIMIT 10`,
    [userId]
  );

  // 7. Login Logs
  const [loginLogs] = await pool.query(
    `SELECT id, login_time, logout_time, ip_address, user_agent, is_active
     FROM user_login_logs WHERE user_id = ? ORDER BY login_time DESC LIMIT 20`,
    [userId]
  );

  // 8. Block History
  const [blockHistory] = await pool.query(
    `SELECT abh.*, au.username as admin_username
     FROM account_block_history abh
     LEFT JOIN admin_users au ON au.id = abh.admin_id
     WHERE abh.user_id = ?
     ORDER BY abh.created_at DESC`,
    [userId]
  );

  // 9. Connections Stats & Overview
  const [[connStats]] = await pool.query(
    `SELECT
       SUM(CASE WHEN status = 'ACCEPTED' THEN 1 ELSE 0 END) as accepted_count,
       SUM(CASE WHEN status = 'PENDING' AND requester_id = ? THEN 1 ELSE 0 END) as outgoing_count,
       SUM(CASE WHEN status = 'PENDING' AND requester_id != ? THEN 1 ELSE 0 END) as incoming_count
     FROM connections
     WHERE user_id_1 = ? OR user_id_2 = ?`,
    [userId, userId, userId, userId]
  );

  const [acceptedConns] = await pool.query(
    `SELECT c.id as connection_id, c.created_at,
            u.id as partner_id, u.name as partner_name, u.email as partner_email, u.avatar as partner_avatar,
            (SELECT title FROM goals g WHERE g.user_id = u.id ORDER BY g.created_at DESC LIMIT 1) as primary_goal
     FROM connections c
     JOIN users u ON u.id = (CASE WHEN c.user_id_1 = ? THEN c.user_id_2 ELSE c.user_id_1 END)
     WHERE (c.user_id_1 = ? OR c.user_id_2 = ?) AND c.status = 'ACCEPTED'`,
    [userId, userId, userId]
  );

  const userProfile = {
    id: user.id,
    name: user.username,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    avatar_url: user.avatar,
    timezone: user.timezone || 'UTC',
    current_streak: user.current_streak || 0,
    streak: user.current_streak || 0,
    account_status: user.account_status || 'ACTIVE',
    blocked_until: user.blocked_until || null,
    block_reason: user.block_reason || null,
    blocked_at: user.blocked_at || null,
    created_at: user.created_at,
    updated_at: user.updated_at,
    last_login: user.latest_login_time || user.last_login_date || null,
    last_logout: user.latest_logout_time || user.last_logout_date || null,
    is_online: Boolean(user.has_active_session),
    session_status: Boolean(user.has_active_session) ? 'ONLINE' : 'OFFLINE'
  };

  const metricsCounts = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter(t => t.status === 'COMPLETED').length,
    totalGoals: goals.length,
    totalHabits: habits.length,
    totalNotes: notes.length,
    totalDocuments: documents.length,
    totalEvents: events.length,
    totalSchedules: schedules.length,
    acceptedConnections: connStats.accepted_count || 0,
    incomingRequests: connStats.incoming_count || 0,
    outgoingRequests: connStats.outgoing_count || 0,
    total_tasks: tasks.length,
    completed_tasks: tasks.filter(t => t.status === 'COMPLETED').length,
    total_goals: goals.length,
    total_habits: habits.length,
    total_notes: notes.length,
    total_documents: documents.length
  };

  return {
    user: userProfile,
    profile: userProfile,
    metrics: metricsCounts,
    counts: metricsCounts,
    goals,
    tasks,
    habits,
    notes,
    documents,
    events,
    schedules,
    loginLogs: loginLogs,
    login_history: loginLogs,
    activityLogs: [],
    blockHistory: blockHistory,
    block_history: blockHistory,
    connections: {
      stats: {
        accepted: connStats.accepted_count || 0,
        incoming: connStats.incoming_count || 0,
        outgoing: connStats.outgoing_count || 0
      },
      accepted: acceptedConns,
      accepted_list: acceptedConns
    }
  };
};

// 2. Get dedicated connection details for a specific user
exports.getUserConnectionsDetails = async (userId) => {
  const [users] = await pool.query('SELECT id, name as username, email, avatar FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    throw new AppError('User not found', 404);
  }
  const user = users[0];

  // Accepted connections
  const [accepted] = await pool.query(
    `SELECT c.id as connection_id, c.created_at as connected_since,
            u.id as partner_id, u.name as partner_name, u.email as partner_email, u.avatar as partner_avatar,
            (SELECT title FROM goals g WHERE g.user_id = u.id ORDER BY g.created_at DESC LIMIT 1) as primary_goal,
            (SELECT COUNT(*) FROM goals g WHERE g.user_id = u.id) as total_goals
     FROM connections c
     JOIN users u ON u.id = (CASE WHEN c.user_id_1 = ? THEN c.user_id_2 ELSE c.user_id_1 END)
     WHERE (c.user_id_1 = ? OR c.user_id_2 = ?) AND c.status = 'ACCEPTED'
     ORDER BY c.updated_at DESC`,
    [userId, userId, userId]
  );

  // Incoming requests (requester is someone else, user is recipient)
  const [incoming] = await pool.query(
    `SELECT c.id as connection_id, c.created_at as requested_at,
            u.id as requester_id, u.name as requester_name, u.email as requester_email, u.avatar as requester_avatar,
            (SELECT title FROM goals g WHERE g.user_id = u.id ORDER BY g.created_at DESC LIMIT 1) as primary_goal
     FROM connections c
     JOIN users u ON u.id = c.requester_id
     WHERE (c.user_id_1 = ? OR c.user_id_2 = ?) AND c.requester_id != ? AND c.status = 'PENDING'
     ORDER BY c.created_at DESC`,
    [userId, userId, userId]
  );

  // Outgoing requests (user is requester)
  const [outgoing] = await pool.query(
    `SELECT c.id as connection_id, c.created_at as sent_at,
            u.id as recipient_id, u.name as recipient_name, u.email as recipient_email, u.avatar as recipient_avatar,
            (SELECT title FROM goals g WHERE g.user_id = u.id ORDER BY g.created_at DESC LIMIT 1) as primary_goal
     FROM connections c
     JOIN users u ON u.id = (CASE WHEN c.user_id_1 = ? THEN c.user_id_2 ELSE c.user_id_1 END)
     WHERE c.requester_id = ? AND c.status = 'PENDING'
     ORDER BY c.created_at DESC`,
    [userId, userId]
  );

  return {
    user,
    stats: {
      accepted_count: accepted.length,
      incoming_count: incoming.length,
      outgoing_count: outgoing.length,
      total_connections: accepted.length + incoming.length + outgoing.length
    },
    accepted,
    incoming,
    outgoing
  };
};

// 3. Temporarily block user account
exports.blockUser = async (adminId, userId, { durationDays, reason }) => {
  if (!durationDays || parseInt(durationDays) < 1) {
    throw new AppError('Block duration must be at least 1 day', 400);
  }
  if (!reason || !reason.trim()) {
    throw new AppError('A valid block reason is required', 400);
  }

  const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = users[0];

  // Prevent blocking admin accounts
  const [adminMatches] = await pool.query('SELECT id FROM admin_users WHERE email = ?', [user.email]);
  if (adminMatches.length > 0) {
    throw new AppError('Cannot block a system administrator account', 403);
  }

  const days = parseInt(durationDays);
  const trimmedReason = reason.trim();

  // Compute expiration on server
  await pool.query(
    `UPDATE users 
     SET account_status = 'TEMPORARILY_BLOCKED',
         blocked_until = DATE_ADD(NOW(), INTERVAL ? DAY),
         block_reason = ?,
         blocked_by = ?,
         blocked_at = NOW()
     WHERE id = ?`,
    [days, trimmedReason, adminId, userId]
  );

  const [updatedUsers] = await pool.query(
    'SELECT id, name, email, account_status, blocked_until, block_reason, blocked_at FROM users WHERE id = ?',
    [userId]
  );
  const updatedUser = updatedUsers[0];

  // Record audit history
  await pool.query(
    `INSERT INTO account_block_history (user_id, admin_id, action, duration_days, block_reason, blocked_until)
     VALUES (?, ?, 'BLOCK', ?, ?, ?)`,
    [userId, adminId, days, trimmedReason, updatedUser.blocked_until]
  );

  // Revoke active sessions in user_login_logs
  await pool.query(
    'UPDATE user_login_logs SET is_active = FALSE, logout_time = NOW() WHERE user_id = ? AND is_active = TRUE',
    [userId]
  );

  // Terminate user's active sockets
  disconnectUserSockets(userId);

  // Emit event to admin dashboard
  emitToAdmin('user_status_changed', {
    userId,
    status: 'TEMPORARILY_BLOCKED',
    blocked_until: updatedUser.blocked_until,
    email: updatedUser.email
  });

  return updatedUser;
};

// 4. Unblock user account
exports.unblockUser = async (adminId, userId, { notes = '' } = {}) => {
  const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    throw new AppError('User not found', 404);
  }

  await pool.query(
    `UPDATE users 
     SET account_status = 'ACTIVE',
         blocked_until = NULL,
         block_reason = NULL,
         blocked_by = NULL
     WHERE id = ?`,
    [userId]
  );

  // Record unblock in audit history
  await pool.query(
    `INSERT INTO account_block_history (user_id, admin_id, action, block_reason)
     VALUES (?, ?, 'UNBLOCK', ?)`,
    [userId, adminId, notes.trim() || 'Unblocked by administrator']
  );

  const [updatedUsers] = await pool.query(
    'SELECT id, name, email, account_status, blocked_until, block_reason FROM users WHERE id = ?',
    [userId]
  );
  const updatedUser = updatedUsers[0];

  emitToAdmin('user_status_changed', {
    userId,
    status: 'ACTIVE',
    email: updatedUser.email
  });

  return updatedUser;
};

// 5. Permanently delete user account by authorized Admin
exports.permanentlyDeleteUser = async (adminId, userId, confirmationText) => {
  if (confirmationText !== 'DELETE ACCOUNT') {
    throw new AppError('Confirmation must be exactly "DELETE ACCOUNT"', 400);
  }

  const [users] = await pool.query('SELECT id, name, email FROM users WHERE id = ?', [userId]);
  if (users.length === 0) {
    throw new AppError('User not found', 404);
  }

  const user = users[0];

  // Safety: Prevent deleting admin account
  const [adminMatches] = await pool.query('SELECT id FROM admin_users WHERE email = ?', [user.email]);
  if (adminMatches.length > 0) {
    throw new AppError('Cannot delete a registered administrator account', 403);
  }

  // Terminate socket connections
  disconnectUserSockets(userId);

  // Perform full atomic deletion
  await authService.permanentlyDeleteUserData(userId);

  // Notify admin dashboard
  emitToAdmin('user_deleted', {
    userId,
    username: user.name,
    email: user.email
  });

  return { success: true, message: `Account for ${user.name} (${user.email}) permanently deleted.` };
};

// 6. Help / Account Recovery Request Submission (User facing)
exports.submitHelpRequest = async ({ message, email, username, userId = null }) => {
  if (!message || !message.trim()) {
    throw new AppError('Message is required', 400);
  }
  if (!email || !email.trim()) {
    throw new AppError('Email is required', 400);
  }
  if (!username || !username.trim()) {
    throw new AppError('Username is required', 400);
  }

  let matchedUserId = userId;
  if (!matchedUserId) {
    const [matched] = await pool.query('SELECT id FROM users WHERE email = ?', [email.trim().toLowerCase()]);
    if (matched.length > 0) {
      matchedUserId = matched[0].id;
    }
  }

  const requestId = `REQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const [result] = await pool.query(
    `INSERT INTO help_requests (request_id, user_id, email, username, message, status)
     VALUES (?, ?, ?, ?, ?, 'NEW')`,
    [requestId, matchedUserId || null, email.trim().toLowerCase(), username.trim(), message.trim()]
  );

  emitToAdmin('new_help_request', {
    id: result.insertId,
    requestId,
    username: username.trim(),
    email: email.trim().toLowerCase(),
    message: message.trim(),
    created_at: new Date().toISOString()
  });

  return {
    success: true,
    requestId,
    message: 'Your help request has been submitted successfully. An administrator will review your account.'
  };
};

// 7. Get paginated help requests for Admin
exports.getHelpRequests = async ({
  page = 1,
  limit = 10,
  search = '',
  status = 'ALL',
  sortBy = 'created_at',
  sortOrder = 'DESC'
}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const params = [];
  const whereClauses = [];

  if (search && search.trim()) {
    whereClauses.push('(hr.request_id LIKE ? OR hr.username LIKE ? OR hr.email LIKE ? OR hr.message LIKE ?)');
    const t = `%${search.trim()}%`;
    params.push(t, t, t, t);
  }

  if (status && status !== 'ALL') {
    whereClauses.push('hr.status = ?');
    params.push(status.trim().toUpperCase());
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) as total FROM help_requests hr ${whereSql}`, params);

  const [requests] = await pool.query(
    `SELECT hr.*, 
            u.account_status, u.blocked_until, u.block_reason,
            au.username as admin_username
     FROM help_requests hr
     LEFT JOIN users u ON u.id = hr.user_id
     LEFT JOIN admin_users au ON au.id = hr.assigned_admin_id
     ${whereSql}
     ORDER BY hr.created_at ${order}
     LIMIT ? OFFSET ?`,
    [...params, parseInt(limit), parseInt(offset)]
  );

  return {
    requests,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)) || 1
    }
  };
};

// 8. Update Help Request (Status & Admin Response)
exports.updateHelpRequest = async (adminId, requestId, { status, adminResponse = '' }) => {
  const allowed = ['NEW', 'IN_REVIEW', 'RESOLVED', 'CLOSED'];
  const formattedStatus = status.toUpperCase();
  if (!allowed.includes(formattedStatus)) {
    throw new AppError(`Invalid status. Allowed: ${allowed.join(', ')}`, 400);
  }

  const [rows] = await pool.query('SELECT * FROM help_requests WHERE id = ?', [requestId]);
  if (rows.length === 0) {
    throw new AppError('Help request not found', 404);
  }

  const req = rows[0];

  await pool.query(
    `UPDATE help_requests 
     SET status = ?, 
         admin_response = ?, 
         assigned_admin_id = ?,
         resolved_at = CASE WHEN ? IN ('RESOLVED', 'CLOSED') THEN NOW() ELSE resolved_at END,
         updated_at = NOW()
     WHERE id = ?`,
    [formattedStatus, adminResponse.trim() || null, adminId, formattedStatus, requestId]
  );

  // If user exists, notify them in real-time and create persistent notification
  if (req.user_id) {
    await createNotification(req.user_id, {
      title: 'Help Request Updated',
      message: `Your request ${req.request_id} has been marked as ${formattedStatus}.${adminResponse ? ` Admin Note: ${adminResponse}` : ''}`,
      type: 'SECURITY'
    }).catch(e => console.warn('Notification create error:', e.message));
  }

  const [updatedRows] = await pool.query('SELECT * FROM help_requests WHERE id = ?', [requestId]);
  const updatedReq = updatedRows[0];

  emitToAdmin('help_request_updated', updatedReq);

  return updatedReq;
};
