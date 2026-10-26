const pool = require('../config/db');
const AppError = require('../utils/AppError');

function getLocalDateString(dateInput) {
  if (dateInput) {
    if (typeof dateInput === 'string') return dateInput.substring(0, 10);
    if (dateInput instanceof Date) return dateInput.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Compute real consecutive streak for a habit
 */
function calculateStreak(logs = [], todayStr) {
  if (!logs || logs.length === 0) return 0;
  const completedDates = new Set(
    logs.filter(l => l.completed).map(l => l.completed_date.substring(0, 10))
  );

  let streak = 0;
  const today = new Date(`${todayStr}T00:00:00Z`);

  // Check if completed today or yesterday to start streak
  let checkDate = new Date(today);
  const checkStr = checkDate.toISOString().substring(0, 10);

  if (!completedDates.has(checkStr)) {
    // If not completed today, check yesterday
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }

  while (true) {
    const dStr = checkDate.toISOString().substring(0, 10);
    if (completedDates.has(dStr)) {
      streak++;
      checkDate.setUTCDate(checkDate.getUTCDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * 1. Adaptive Habit Coach Overview
 */
exports.getHabitCoachOverview = async (userId, targetDate) => {
  const todayStr = getLocalDateString(targetDate);

  // 1. Fetch user habits
  const [habits] = await pool.query(
    'SELECT id, name, description, frequency, target_count, preferred_time FROM habits WHERE user_id = ? ORDER BY id ASC',
    [userId]
  );

  if (habits.length === 0) {
    return {
      habits: [],
      adaptive_recommendations: [],
      recovery_plans: [],
      weekly_completion_rate: 0
    };
  }

  // 2. Fetch logs for the past 30 days
  const [logs] = await pool.query(
    `SELECT habit_id, DATE_FORMAT(completed_date, '%Y-%m-%d') as completed_date, completed
     FROM habit_logs
     WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ?)
       AND completed_date >= DATE_SUB(?, INTERVAL 30 DAY)
     ORDER BY completed_date DESC`,
    [userId, todayStr]
  );

  // 3. Fetch today's schedule items to analyze workload
  const [scheduleRows] = await pool.query(
    'SELECT id FROM schedules WHERE user_id = ? AND schedule_date = ?',
    [userId, todayStr]
  );
  let todayScheduleItems = [];
  if (scheduleRows.length > 0) {
    const [items] = await pool.query(
      'SELECT start_time, end_time, title, item_type FROM schedule_items WHERE schedule_id = ?',
      [scheduleRows[0].id]
    );
    todayScheduleItems = items;
  }

  const isBusyDay = todayScheduleItems.length >= 5;

  // Process habit stats
  const processedHabits = habits.map(h => {
    const hLogs = logs.filter(l => l.habit_id === h.id);
    const completedToday = hLogs.some(l => l.completed_date === todayStr && l.completed);
    const streak = calculateStreak(hLogs, todayStr);

    // Calculate weekly completion (past 7 days)
    const past7DaysLogs = hLogs.filter(l => {
      const diffDays = (new Date(todayStr) - new Date(l.completed_date)) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 6;
    });
    const weeklyRate = past7DaysLogs.length > 0
      ? Math.round((past7DaysLogs.filter(l => l.completed).length / 7) * 100)
      : 0;

    return {
      ...h,
      completed_today: completedToday,
      current_streak: streak,
      weekly_completion_rate: weeklyRate
    };
  });

  // Calculate overall weekly consistency rate
  const totalWeeklyRate = processedHabits.length > 0
    ? Math.round(processedHabits.reduce((acc, h) => acc + h.weekly_completion_rate, 0) / processedHabits.length)
    : 0;

  // 4. Generate Adaptive Recommendations
  const adaptiveRecommendations = [];

  // Suggest smaller micro-habits if day is packed
  if (isBusyDay) {
    processedHabits.forEach(h => {
      if (!h.completed_today) {
        adaptiveRecommendations.push({
          habit_id: h.id,
          habit_name: h.name,
          type: 'MICRO_VERSION',
          title: `Busy Day Adaptation: 5-minute Micro-${h.name}`,
          explanation: `Your schedule has ${todayScheduleItems.length} commitments today. Instead of skipping "${h.name}", do a condensed 5-minute version to protect your streak.`,
          action_label: 'Complete 5-min Micro Version',
          reduced_duration: 5
        });
      }
    });
  }

  // Suggest optimal time slots based on preferred_time and schedule
  processedHabits.forEach(h => {
    if (!h.completed_today) {
      adaptiveRecommendations.push({
        habit_id: h.id,
        habit_name: h.name,
        type: 'OPTIMAL_SLOT',
        title: `Prime Window for ${h.name}`,
        explanation: `Scheduled free block detected around ${h.preferred_time || '18:00'}. Ideal time to complete "${h.name}".`,
        action_label: 'Set Reminder',
        suggested_time: h.preferred_time || '18:00'
      });
    }
  });

  // 5. Generate Recovery Mode Plans for Missed Habits
  const recoveryPlans = [];
  const yesterday = new Date(new Date(todayStr) - 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

  processedHabits.forEach(h => {
    const hLogs = logs.filter(l => l.habit_id === h.id);
    const missedYesterday = !hLogs.some(l => l.completed_date === yesterday && l.completed);

    if (missedYesterday && h.current_streak === 0) {
      recoveryPlans.push({
        habit_id: h.id,
        habit_name: h.name,
        missed_date: yesterday,
        message: `You missed "${h.name}" yesterday, which happens to everyone! Don't worry—habits are built on consistency, not perfection.`,
        recovery_action: `Complete today's session to restart your momentum.`,
        quick_recover_duration: 15
      });
    }
  });

  return {
    habits: processedHabits,
    adaptive_recommendations: adaptiveRecommendations.slice(0, 3),
    recovery_plans: recoveryPlans.slice(0, 2),
    weekly_completion_rate: totalWeeklyRate,
    is_busy_day: isBusyDay
  };
};

/**
 * 2. Log Habit with Adaptive Recovery Handling
 */
exports.logHabitWithRecovery = async (userId, habitId, targetDate, completed = true, notes = '') => {
  const dateStr = getLocalDateString(targetDate);

  // Verify habit ownership
  const [habits] = await pool.query('SELECT id, name FROM habits WHERE id = ? AND user_id = ?', [habitId, userId]);
  if (habits.length === 0) {
    throw new AppError('Habit not found or unauthorized', 404);
  }

  const [existing] = await pool.query(
    'SELECT id, completed FROM habit_logs WHERE habit_id = ? AND completed_date = ?',
    [habitId, dateStr]
  );

  let isCompleted = completed ? 1 : 0;
  if (existing.length > 0) {
    await pool.query(
      'UPDATE habit_logs SET completed = ? WHERE id = ?',
      [isCompleted, existing[0].id]
    );
  } else {
    await pool.query(
      'INSERT INTO habit_logs (habit_id, completed_date, completed) VALUES (?, ?, ?)',
      [habitId, dateStr, isCompleted]
    );
  }

  return {
    success: true,
    habit_id: habitId,
    habit_name: habits[0].name,
    completed: !!isCompleted,
    date: dateStr
  };
};
