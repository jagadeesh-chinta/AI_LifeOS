const pool = require('../config/db');
const AppError = require('../utils/AppError');

exports.createGoal = async (userId, data) => {
  const {
    title,
    description,
    target_date,
    priority,
    progress,
    status,
    duration_value,
    duration_unit,
    custom_duration
  } = data;
  
  const [result] = await pool.query(
    `INSERT INTO goals (user_id, title, description, target_date, priority, progress, status, duration_value, duration_unit, custom_duration) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      title,
      description || null,
      target_date || null,
      priority || 'MEDIUM',
      progress || 0,
      status || 'TODO',
      duration_value ? parseInt(duration_value) : null,
      duration_unit || 'Months',
      custom_duration || null
    ]
  );
  
  return this.getGoalById(userId, result.insertId);
};

exports.getGoals = async (userId) => {
  const [goals] = await pool.query('SELECT * FROM goals WHERE user_id = ? ORDER BY target_date ASC', [userId]);
  return goals;
};

exports.getGoalById = async (userId, goalId) => {
  const [goals] = await pool.query('SELECT * FROM goals WHERE id = ? AND user_id = ?', [goalId, userId]);
  
  if (goals.length === 0) {
    throw new AppError('Goal not found', 404);
  }
  
  return goals[0];
};

exports.updateGoal = async (userId, goalId, data) => {
  await this.getGoalById(userId, goalId);

  const updates = [];
  const params = [];

  const fields = [
    'title',
    'description',
    'target_date',
    'priority',
    'progress',
    'status',
    'duration_value',
    'duration_unit',
    'custom_duration',
    'career_roadmap'
  ];
  
  fields.forEach(field => {
    if (data[field] !== undefined) {
      updates.push(`${field} = ?`);
      let val = data[field];
      if (field === 'career_roadmap' && typeof val === 'object') {
        val = JSON.stringify(val);
      }
      params.push(val);
    }
  });

  if (updates.length === 0) return this.getGoalById(userId, goalId);

  params.push(goalId, userId);
  
  await pool.query(
    `UPDATE goals SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
    params
  );
  
  return this.getGoalById(userId, goalId);
};

exports.deleteGoal = async (userId, goalId) => {
  const [result] = await pool.query('DELETE FROM goals WHERE id = ? AND user_id = ?', [goalId, userId]);
  
  if (result.affectedRows === 0) {
    throw new AppError('Goal not found', 404);
  }
  
  return true;
};
