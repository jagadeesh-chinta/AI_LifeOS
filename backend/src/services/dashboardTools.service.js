const pool = require('../config/db');
const AppError = require('../utils/AppError');

// ==========================================
// 1. TRAVEL PLANNER SERVICE
// ==========================================
exports.getTravelPlans = async (userId) => {
  const [plans] = await pool.query(
    'SELECT * FROM travel_plans WHERE user_id = ? ORDER BY start_date ASC',
    [userId]
  );
  return plans.map(p => ({
    ...p,
    itinerary: typeof p.itinerary === 'string' ? JSON.parse(p.itinerary) : p.itinerary,
    estimated_expenses: typeof p.estimated_expenses === 'string' ? JSON.parse(p.estimated_expenses) : p.estimated_expenses
  }));
};

exports.createTravelPlan = async (userId, data) => {
  const { destination, start_date, end_date, budget, preferences, itinerary, estimated_expenses } = data;
  if (!destination || !start_date || !end_date) {
    throw new AppError('Destination, start date, and end date are required', 400);
  }

  const [result] = await pool.query(
    `INSERT INTO travel_plans (user_id, destination, start_date, end_date, budget, preferences, itinerary, estimated_expenses)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      destination.trim(),
      start_date,
      end_date,
      budget ? parseFloat(budget) : 0,
      preferences || null,
      itinerary ? JSON.stringify(itinerary) : null,
      estimated_expenses ? JSON.stringify(estimated_expenses) : null
    ]
  );

  const [created] = await pool.query('SELECT * FROM travel_plans WHERE id = ?', [result.insertId]);
  return created[0];
};

exports.deleteTravelPlan = async (userId, planId) => {
  await pool.query('DELETE FROM travel_plans WHERE id = ? AND user_id = ?', [planId, userId]);
  return { success: true };
};

// ==========================================
// 2. TIMETABLE BUILDER SERVICE
// ==========================================
exports.getTimetables = async (userId, dayOfWeek = null) => {
  let query = 'SELECT * FROM timetables WHERE user_id = ?';
  const params = [userId];

  if (dayOfWeek && dayOfWeek !== 'ALL') {
    query += ' AND (day_of_week = ? OR day_of_week = "Daily")';
    params.push(dayOfWeek);
  }

  query += ' ORDER BY start_time ASC';
  const [entries] = await pool.query(query, params);
  return entries;
};

exports.createTimetableEntry = async (userId, data) => {
  const { title, day_of_week, start_time, end_time, activity_type, color } = data;
  if (!title || !day_of_week || !start_time || !end_time) {
    throw new AppError('Title, day of week, start time, and end time are required', 400);
  }

  if (end_time <= start_time) {
    throw new AppError('End time must be after start time', 400);
  }

  // Detect overlapping time slots on the same day
  const [conflicts] = await pool.query(
    `SELECT * FROM timetables 
     WHERE user_id = ? 
       AND (day_of_week = ? OR day_of_week = "Daily" OR ? = "Daily")
       AND (
         (start_time <= ? AND end_time > ?) OR
         (start_time < ? AND end_time >= ?) OR
         (start_time >= ? AND end_time <= ?)
       )`,
    [userId, day_of_week, day_of_week, start_time, start_time, end_time, end_time, start_time, end_time]
  );

  const hasConflict = conflicts.length > 0;
  const conflictMessage = hasConflict
    ? `Warning: Overlaps with existing activity "${conflicts[0].title}" (${conflicts[0].start_time} - ${conflicts[0].end_time})`
    : null;

  const [result] = await pool.query(
    `INSERT INTO timetables (user_id, title, day_of_week, start_time, end_time, activity_type, color)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      title.trim(),
      day_of_week,
      start_time,
      end_time,
      activity_type || 'STUDY',
      color || '#06b6d4'
    ]
  );

  const [created] = await pool.query('SELECT * FROM timetables WHERE id = ?', [result.insertId]);
  return {
    entry: created[0],
    hasConflict,
    conflictMessage
  };
};

exports.deleteTimetableEntry = async (userId, entryId) => {
  await pool.query('DELETE FROM timetables WHERE id = ? AND user_id = ?', [entryId, userId]);
  return { success: true };
};

// ==========================================
// 3. BUDGET CALCULATOR SERVICE
// ==========================================
exports.getBudgetSummary = async (userId, period = 'Monthly') => {
  const [entries] = await pool.query(
    'SELECT * FROM budget_entries WHERE user_id = ? AND (period = ? OR ? = "ALL") ORDER BY created_at DESC',
    [userId, period, period]
  );

  let totalIncome = 0;
  let totalExpenses = 0;
  const categoryTotals = {};

  entries.forEach(e => {
    const amount = parseFloat(e.amount) || 0;
    if (e.type === 'INCOME') {
      totalIncome += amount;
    } else {
      totalExpenses += amount;
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + amount;
    }
  });

  const remainingBalance = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0;

  return {
    entries,
    summary: {
      totalIncome,
      totalExpenses,
      remainingBalance,
      savingsRate,
      categoryTotals
    }
  };
};

exports.createBudgetEntry = async (userId, data) => {
  const { type, category, amount, period = 'Monthly', description, entry_date } = data;
  if (!type || !category || !amount) {
    throw new AppError('Type, category, and amount are required', 400);
  }

  const numericAmount = parseFloat(amount);
  if (isNaN(numericAmount) || numericAmount <= 0) {
    throw new AppError('Amount must be a positive number', 400);
  }

  const [result] = await pool.query(
    `INSERT INTO budget_entries (user_id, type, category, amount, period, description, entry_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      type.toUpperCase(),
      category.trim(),
      numericAmount,
      period,
      description ? description.trim() : null,
      entry_date || null
    ]
  );

  const [created] = await pool.query('SELECT * FROM budget_entries WHERE id = ?', [result.insertId]);
  return created[0];
};

exports.deleteBudgetEntry = async (userId, entryId) => {
  await pool.query('DELETE FROM budget_entries WHERE id = ? AND user_id = ?', [entryId, userId]);
  return { success: true };
};
