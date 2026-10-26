const pool = require('../config/db');
const AppError = require('../utils/AppError');

exports.getPreferences = async (userId) => {
  const [preferences] = await pool.query('SELECT * FROM user_preferences WHERE user_id = ?', [userId]);
  
  if (preferences.length === 0) {
    // Return defaults if none exist
    return {
      wake_time: '06:00:00',
      sleep_time: '22:00:00',
      work_start: '09:00:00',
      work_end: '17:00:00',
      preferred_break_minutes: 15,
      preferred_focus_minutes: 60,
      timezone: 'UTC',
      theme: 'system'
    };
  }
  
  return preferences[0];
};

exports.updatePreferences = async (userId, data) => {
  const { wake_time, sleep_time, work_start, work_end, preferred_break_minutes, preferred_focus_minutes, timezone, ai_preferences, theme } = data;
  
  const updates = [];
  const params = [];
  
  if (wake_time) { updates.push('wake_time = ?'); params.push(wake_time); }
  if (sleep_time) { updates.push('sleep_time = ?'); params.push(sleep_time); }
  if (work_start) { updates.push('work_start = ?'); params.push(work_start); }
  if (work_end) { updates.push('work_end = ?'); params.push(work_end); }
  if (preferred_break_minutes !== undefined) { updates.push('preferred_break_minutes = ?'); params.push(preferred_break_minutes); }
  if (preferred_focus_minutes !== undefined) { updates.push('preferred_focus_minutes = ?'); params.push(preferred_focus_minutes); }
  if (timezone) { updates.push('timezone = ?'); params.push(timezone); }
  if (ai_preferences) { updates.push('ai_preferences = ?'); params.push(JSON.stringify(ai_preferences)); }
  if (theme) { updates.push('theme = ?'); params.push(theme.toLowerCase()); }

  if (updates.length > 0) {
    params.push(userId);
    
    // Check if exists
    const [existing] = await pool.query('SELECT id FROM user_preferences WHERE user_id = ?', [userId]);
    
    if (existing.length > 0) {
      await pool.query(
        `UPDATE user_preferences SET ${updates.join(', ')} WHERE user_id = ?`,
        params
      );
    } else {
      // Create new
      const fields = updates.map(u => u.split(' =')[0]);
      const values = params.slice(0, -1);
      
      const placeholders = values.map(() => '?').join(', ');
      
      await pool.query(
        `INSERT INTO user_preferences (user_id, ${fields.join(', ')}) VALUES (?, ${placeholders})`,
        [userId, ...values]
      );
    }
  }

  // Also update timezone in users table if changed
  if (timezone) {
    await pool.query('UPDATE users SET timezone = ? WHERE id = ?', [timezone, userId]);
  }

  return this.getPreferences(userId);
};
