const pool = require('../config/db');
const { emitToUser } = require('../socket');

exports.getNotifications = async (userId) => {
  const [notifications] = await pool.query(
    'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
    [userId]
  );
  const [[{ unreadCount }]] = await pool.query(
    'SELECT COUNT(*) as unreadCount FROM notifications WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );
  return { notifications, unreadCount };
};

exports.markAsRead = async (userId, notificationId) => {
  await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  return { success: true };
};

exports.markAllAsRead = async (userId) => {
  await pool.query(
    'UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE',
    [userId]
  );
  return { success: true };
};

exports.deleteNotification = async (userId, notificationId) => {
  await pool.query(
    'DELETE FROM notifications WHERE id = ? AND user_id = ?',
    [notificationId, userId]
  );
  return { success: true };
};

exports.createNotification = async (userId, { title, message, type = 'INFO', link = null }) => {
  const [result] = await pool.query(
    'INSERT INTO notifications (user_id, title, message, type, link) VALUES (?, ?, ?, ?, ?)',
    [userId, title, message, type, link]
  );

  const [rows] = await pool.query('SELECT * FROM notifications WHERE id = ?', [result.insertId]);
  const newNotif = rows[0];

  // Emit in real-time to user's socket room
  emitToUser(userId, 'new_notification', newNotif);

  return newNotif;
};
