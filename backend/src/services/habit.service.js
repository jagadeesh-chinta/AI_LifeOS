const pool = require('../config/db');
const AppError = require('../utils/AppError');

exports.createHabit = async (userId, data) => {
  const { name, description, frequency, target_count, preferred_time } = data;
  
  const [result] = await pool.query(
    `INSERT INTO habits (user_id, name, description, frequency, target_count, preferred_time) 
     VALUES (?, ?, ?, ?, ?, ?)`,
    [userId, name, description || null, frequency || 'DAILY', target_count || 1, preferred_time || null]
  );
  
  return this.getHabitById(userId, result.insertId);
};

exports.getHabits = async (userId) => {
  const [habits] = await pool.query('SELECT * FROM habits WHERE user_id = ?', [userId]);
  return habits;
};

exports.getHabitById = async (userId, habitId) => {
  const [habits] = await pool.query('SELECT * FROM habits WHERE id = ? AND user_id = ?', [habitId, userId]);
  
  if (habits.length === 0) {
    throw new AppError('Habit not found', 404);
  }
  
  return habits[0];
};

exports.updateHabit = async (userId, habitId, data) => {
  await this.getHabitById(userId, habitId);

  const updates = [];
  const params = [];

  const fields = ['name', 'description', 'frequency', 'target_count', 'preferred_time'];
  
  fields.forEach(field => {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      params.push(data[field]);
    }
  });

  if (updates.length === 0) return this.getHabitById(userId, habitId);

  params.push(habitId, userId);
  
  await pool.query(
    `UPDATE habits SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  );
  
  return this.getHabitById(userId, habitId);
};

exports.deleteHabit = async (userId, habitId) => {
  const [result] = await pool.query('DELETE FROM habits WHERE id = ? AND user_id = ?', [habitId, userId]);
  
  if (result.affectedRows === 0) {
    throw new AppError('Habit not found', 404);
  }
  
  return true;
};

exports.logHabit = async (userId, habitId, data) => {
  await this.getHabitById(userId, habitId);
  const { completed_date, completed } = data;

  // Check if log already exists
  const [existing] = await pool.query(
    'SELECT id FROM habit_logs WHERE habit_id = ? AND completed_date = ?',
    [habitId, completed_date]
  );

  if (existing.length > 0) {
    await pool.query(
      'UPDATE habit_logs SET completed = ? WHERE id = ?',
      [completed, existing[0].id]
    );
  } else {
    await pool.query(
      'INSERT INTO habit_logs (habit_id, completed_date, completed) VALUES (?, ?, ?)',
      [habitId, completed_date, completed]
    );
  }

  return { success: true, message: 'Habit logged successfully' };
};
