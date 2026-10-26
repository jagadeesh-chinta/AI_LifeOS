const pool = require('../config/db');
const quotes = require('../utils/quotes');

function formatMySQLDate(val) {
  if (!val) return null;
  if (typeof val === 'string') return val.substring(0, 10);
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(val).substring(0, 10);
}

function getTodayString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Helper to compute consecutive-day login streak
 */
exports.updateStreak = async (userId, clientDate) => {
  const todayStr = clientDate ? formatMySQLDate(clientDate) : getTodayString();

  const [users] = await pool.query(
    'SELECT current_streak, last_login_date FROM users WHERE id = ?',
    [userId]
  );

  if (users.length === 0) return 0;

  const { current_streak = 0, last_login_date } = users[0];

  let newStreak = current_streak || 0;
  let shouldUpdate = false;

  if (!last_login_date) {
    // First successful login recorded
    newStreak = 1;
    shouldUpdate = true;
  } else {
    // Format last_login_date as YYYY-MM-DD using local calendar date
    const lastDateStr = formatMySQLDate(last_login_date);

    if (lastDateStr === todayStr) {
      // Same calendar day: do not increment
      if (newStreak === 0) {
        newStreak = 1;
        shouldUpdate = true;
      }
    } else {
      // Calculate day difference
      const last = new Date(`${lastDateStr}T00:00:00Z`);
      const curr = new Date(`${todayStr}T00:00:00Z`);
      const diffDays = Math.round((curr - last) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        // Consecutive calendar day -> increase streak by 1
        newStreak = (current_streak || 0) + 1;
        shouldUpdate = true;
      } else if (diffDays > 1) {
        // Missed one or more days -> reset to 1
        newStreak = 1;
        shouldUpdate = true;
      }
    }
  }

  if (shouldUpdate) {
    await pool.query(
      'UPDATE users SET current_streak = ?, last_login_date = ? WHERE id = ?',
      [newStreak, todayStr, userId]
    );
  }

  return newStreak;
};

/**
 * Deterministic daily quote selection per user per calendar day
 */
exports.getDailyQuote = (userId, dateStr) => {
  const date = dateStr || new Date().toISOString().split('T')[0];
  const [year, month, day] = date.split('-').map(Number);
  const daysSinceEpoch = Math.floor(Date.UTC(year, month - 1, day) / (1000 * 60 * 60 * 24));
  const quoteIndex = Math.abs((daysSinceEpoch + (userId || 1)) % quotes.length);
  return quotes[quoteIndex];
};

/**
 * Track user active website time for today
 */
exports.trackActiveTime = async (userId, dateStr, secondsToAdd) => {
  const date = dateStr || new Date().toISOString().split('T')[0];
  // Sanitize seconds to add: between 1 and 120 seconds per request
  const seconds = Math.min(Math.max(parseInt(secondsToAdd, 10) || 0, 0), 120);

  if (seconds > 0) {
    await pool.query(
      `INSERT INTO user_daily_usage (user_id, usage_date, seconds_tracked)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         seconds_tracked = seconds_tracked + VALUES(seconds_tracked),
         updated_at = CURRENT_TIMESTAMP`,
      [userId, date, seconds]
    );
  }

  const [rows] = await pool.query(
    'SELECT seconds_tracked FROM user_daily_usage WHERE user_id = ? AND usage_date = ?',
    [userId, date]
  );

  return rows.length > 0 ? rows[0].seconds_tracked : 0;
};

/**
 * Get full dashboard stats
 */
exports.getDashboardStats = async (userId, dateStr) => {
  const today = dateStr || new Date().toISOString().split('T')[0];

  // 1. Update streak for today if needed
  const currentStreak = await exports.updateStreak(userId, today);

  // 2. Upcoming incomplete tasks count
  // Include incomplete tasks where task_date or due_date is NULL or >= today
  const [upcomingTasksRows] = await pool.query(
    `SELECT COUNT(*) as count 
     FROM tasks 
     WHERE user_id = ? 
       AND status != 'COMPLETED' 
       AND (COALESCE(task_date, DATE(due_date)) IS NULL OR COALESCE(task_date, DATE(due_date)) >= ?)`,
    [userId, today]
  );
  const upcomingTasksCount = upcomingTasksRows[0]?.count || 0;

  // 3. Active goals count
  const [activeGoalsRows] = await pool.query(
    `SELECT COUNT(*) as count, 
            COALESCE(AVG(progress), 0) as avg_progress,
            SUM(CASE WHEN progress > 0 THEN 1 ELSE 0 END) as with_progress
     FROM goals 
     WHERE user_id = ? AND status != 'COMPLETED'`,
    [userId]
  );
  const activeGoalsCount = activeGoalsRows[0]?.count || 0;
  const avgGoalProgress = Number(activeGoalsRows[0]?.avg_progress) || 0;
  const activeGoalsWithProgress = Number(activeGoalsRows[0]?.with_progress) || 0;

  // 4. Time tracked for today
  const [usageRows] = await pool.query(
    'SELECT seconds_tracked FROM user_daily_usage WHERE user_id = ? AND usage_date = ?',
    [userId, today]
  );
  const secondsTracked = usageRows.length > 0 ? usageRows[0].seconds_tracked : 0;

  // 5. Today's progress calculation
  // Tasks eligible for today: due today or completed today
  const [tasksTodayRows] = await pool.query(
    `SELECT 
       COUNT(*) as total,
       SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed
     FROM tasks 
     WHERE user_id = ? 
       AND (COALESCE(task_date, DATE(due_date)) = ? OR (DATE(updated_at) = ? AND status = 'COMPLETED'))`,
    [userId, today, today]
  );

  const tasksTodayTotal = Number(tasksTodayRows[0]?.total) || 0;
  const tasksTodayCompleted = Number(tasksTodayRows[0]?.completed) || 0;

  let progressPercentage = 0;
  if (tasksTodayTotal > 0 && activeGoalsCount > 0) {
    const taskRate = (tasksTodayCompleted / tasksTodayTotal) * 100;
    progressPercentage = Math.round((0.70 * taskRate) + (0.30 * avgGoalProgress));
  } else if (tasksTodayTotal > 0 && activeGoalsCount === 0) {
    progressPercentage = Math.round((tasksTodayCompleted / tasksTodayTotal) * 100);
  } else if (tasksTodayTotal === 0 && activeGoalsCount > 0) {
    progressPercentage = Math.round(avgGoalProgress);
  } else {
    progressPercentage = 0;
  }
  progressPercentage = Math.min(Math.max(progressPercentage, 0), 100);

  // 6. Daily Motivation Quote
  const dailyQuote = exports.getDailyQuote(userId, today);

  // 7. Weekly Consistency (current week: Monday to Sunday)
  const todayDate = new Date(`${today}T00:00:00Z`);
  const dayOfWeek = todayDate.getUTCDay(); // 0 is Sun, 1 is Mon...
  const distanceToMon = (dayOfWeek + 6) % 7; // days since Mon
  const monday = new Date(todayDate);
  monday.setUTCDate(todayDate.getUTCDate() - distanceToMon);

  const weekDays = [];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const dStr = d.toISOString().split('T')[0];
    weekDays.push({
      date: dStr,
      dayName: dayNames[i],
      dayNumber: d.getUTCDate(),
      isToday: dStr === today
    });
  }

  const startOfWeek = weekDays[0].date;
  const endOfWeek = weekDays[6].date;

  // Completed tasks by date in week
  const [completedTasksRows] = await pool.query(
    `SELECT DATE(updated_at) as date, COUNT(*) as count 
     FROM tasks 
     WHERE user_id = ? 
       AND status = 'COMPLETED' 
       AND DATE(updated_at) BETWEEN ? AND ?
     GROUP BY DATE(updated_at)`,
    [userId, startOfWeek, endOfWeek]
  );
  const tasksByDate = {};
  completedTasksRows.forEach(row => {
    const dStr = typeof row.date === 'string' ? row.date.substring(0, 10) : new Date(row.date).toISOString().split('T')[0];
    tasksByDate[dStr] = Number(row.count) || 0;
  });

  // Completed habits by date in week
  const [completedHabitsRows] = await pool.query(
    `SELECT hl.completed_date as date, COUNT(*) as count 
     FROM habit_logs hl
     JOIN habits h ON hl.habit_id = h.id
     WHERE h.user_id = ? 
       AND hl.completed = 1 
       AND hl.completed_date BETWEEN ? AND ?
     GROUP BY hl.completed_date`,
    [userId, startOfWeek, endOfWeek]
  );
  const habitsByDate = {};
  completedHabitsRows.forEach(row => {
    const dStr = typeof row.date === 'string' ? row.date.substring(0, 10) : new Date(row.date).toISOString().split('T')[0];
    habitsByDate[dStr] = Number(row.count) || 0;
  });

  const weeklyConsistency = weekDays.map(day => {
    const tasksDone = tasksByDate[day.date] || 0;
    const habitsDone = habitsByDate[day.date] || 0;
    return {
      ...day,
      tasksCompleted: tasksDone,
      habitsCompleted: habitsDone,
      totalCompleted: tasksDone + habitsDone
    };
  });

  return {
    upcomingTasksCount,
    activeGoalsCount,
    currentStreak,
    secondsTracked,
    todayProgress: {
      percentage: progressPercentage,
      tasksCompleted: tasksTodayCompleted,
      tasksTotal: tasksTodayTotal,
      goalsActiveWithProgress: activeGoalsWithProgress,
      goalsActiveTotal: activeGoalsCount
    },
    dailyQuote,
    weeklyConsistency
  };
};

/**
 * Get timeline for "Your Day at a Glance"
 */
exports.getTimeline = async (userId, dateStr) => {
  const today = dateStr || new Date().toISOString().split('T')[0];

  // 1. Fetch AI Schedule / Saved Schedule Items for today
  const [schedules] = await pool.query(
    'SELECT id FROM schedules WHERE user_id = ? AND schedule_date = ?',
    [userId, today]
  );

  let scheduleItems = [];
  if (schedules.length > 0) {
    const [items] = await pool.query(
      'SELECT * FROM schedule_items WHERE schedule_id = ? ORDER BY start_time ASC',
      [schedules[0].id]
    );
    scheduleItems = items;
  }

  // 2. Fetch Tasks due or scheduled for today
  const [tasks] = await pool.query(
    `SELECT id, title, description, priority, status, task_date, start_time, end_time, due_date, estimated_minutes, category
     FROM tasks 
     WHERE user_id = ? AND (task_date = ? OR (task_date IS NULL AND DATE(due_date) = ?))
     ORDER BY COALESCE(start_time, '12:00:00') ASC, due_date ASC`,
    [userId, today, today]
  );

  // 3. Fetch Events for today
  const [events] = await pool.query(
    `SELECT id, title, description, start_time, end_time, event_type, location
     FROM events 
     WHERE user_id = ? AND DATE(start_time) = ?
     ORDER BY start_time ASC`,
    [userId, today]
  );

  // 4. Fetch Habits with today's completion log
  const [habits] = await pool.query(
    `SELECT h.id, h.name, h.frequency, h.preferred_time,
            COALESCE(hl.completed, 0) as completed
     FROM habits h
     LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.completed_date = ?
     WHERE h.user_id = ?`,
    [today, userId]
  );

  // Merge items into timeline
  const timeline = [];

  // If schedule items exist, format them
  scheduleItems.forEach(item => {
    // Format start time e.g. "08:00:00" to "08:00 AM"
    const startTimeFormatted = formatTimeString(item.start_time);
    const duration = calculateDuration(item.start_time, item.end_time);

    timeline.push({
      id: `schedule-${item.id}`,
      rawId: item.id,
      scheduleItemId: item.id,
      taskId: item.task_id,
      goalId: item.goal_id,
      habitId: item.habit_id,
      title: item.title,
      description: item.description,
      startTime: startTimeFormatted,
      rawStartTime: item.start_time,
      endTime: formatTimeString(item.end_time),
      duration: duration || (item.estimated_minutes ? `${item.estimated_minutes}m` : null),
      category: item.item_type || 'TASK',
      priority: item.priority || 'MEDIUM',
      completed: Boolean(item.completed),
      sourceType: 'SCHEDULE_ITEM'
    });
  });

  // If a task due today is not already linked in scheduleItems, add it
  const linkedTaskIds = new Set(scheduleItems.map(i => i.task_id).filter(Boolean));
  tasks.forEach(task => {
    if (!linkedTaskIds.has(task.id)) {
      let taskTime = 'All Day';
      let rawStartTime = '12:00:00';
      let endTimeFormatted = null;

      if (task.start_time) {
        taskTime = formatTimeString(task.start_time);
        rawStartTime = task.start_time.length === 5 ? `${task.start_time}:00` : task.start_time;
        if (task.end_time) {
          endTimeFormatted = formatTimeString(task.end_time);
        }
      } else if (task.due_date) {
        taskTime = new Date(task.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        rawStartTime = new Date(task.due_date).toTimeString().substring(0, 8);
      }

      const duration = (task.start_time && task.end_time) 
        ? calculateDuration(task.start_time, task.end_time)
        : (task.estimated_minutes ? `${task.estimated_minutes}m` : null);

      timeline.push({
        id: `task-${task.id}`,
        rawId: task.id,
        taskId: task.id,
        title: task.title,
        description: task.description,
        startTime: taskTime,
        rawStartTime: rawStartTime,
        endTime: endTimeFormatted,
        duration: duration,
        category: task.category || 'TASK',
        priority: task.priority || 'MEDIUM',
        completed: task.status === 'COMPLETED',
        sourceType: 'TASK'
      });
    }
  });

  // Events today
  events.forEach(evt => {
    const startTimeFormatted = new Date(evt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const endTimeFormatted = new Date(evt.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const durationMin = Math.round((new Date(evt.end_time) - new Date(evt.start_time)) / 60000);
    timeline.push({
      id: `event-${evt.id}`,
      rawId: evt.id,
      eventId: evt.id,
      title: evt.title,
      description: evt.description || evt.location,
      startTime: startTimeFormatted,
      rawStartTime: new Date(evt.start_time).toTimeString().substring(0, 8),
      endTime: endTimeFormatted,
      duration: durationMin > 0 ? `${durationMin}m` : null,
      category: evt.event_type || 'EVENT',
      priority: 'MEDIUM',
      completed: false,
      sourceType: 'EVENT'
    });
  });

  // Sort timeline chronologically by rawStartTime
  timeline.sort((a, b) => {
    if (a.rawStartTime && b.rawStartTime) {
      return a.rawStartTime.localeCompare(b.rawStartTime);
    }
    return 0;
  });

  return timeline;
};

/**
 * Get actionable focus recommendations for "Focus for Today"
 */
exports.getRecommendations = async (userId, dateStr) => {
  const today = dateStr || new Date().toISOString().split('T')[0];
  const recommendations = [];

  // Rule 1: Incomplete high-priority or urgent tasks due today
  const [highPriorityTasks] = await pool.query(
    `SELECT * FROM tasks 
     WHERE user_id = ? 
       AND status != 'COMPLETED' 
       AND priority IN ('URGENT', 'HIGH')
       AND (DATE(due_date) = ? OR due_date IS NULL)
     ORDER BY CASE WHEN priority = 'URGENT' THEN 1 ELSE 2 END, due_date ASC
     LIMIT 1`,
    [userId, today]
  );

  if (highPriorityTasks.length > 0) {
    const t = highPriorityTasks[0];
    recommendations.push({
      id: `rec-task-high-${t.id}`,
      title: `${t.priority === 'URGENT' ? 'Urgent' : 'High Priority'}: ${t.title}`,
      description: `This task requires focus today. Complete it to keep your momentum high.`,
      priority: t.priority,
      category: 'TASK',
      actionLabel: 'View Task',
      actionType: 'NAVIGATE',
      actionPath: '/tasks',
      targetId: t.id
    });
  }

  // Rule 2: Pending tasks scheduled for today
  const [todayPendingTasks] = await pool.query(
    `SELECT * FROM tasks 
     WHERE user_id = ? 
       AND status != 'COMPLETED' 
       AND (COALESCE(task_date, DATE(due_date)) = ?)
     ORDER BY COALESCE(start_time, '00:00') ASC
     LIMIT 1`,
    [userId, today]
  );

  if (todayPendingTasks.length > 0 && recommendations.length < 3) {
    const pt = todayPendingTasks[0];
    const isAlreadyAdded = recommendations.some(r => r.targetId === pt.id);
    if (!isAlreadyAdded) {
      recommendations.push({
        id: `rec-task-pending-${pt.id}`,
        title: `Pending Task: ${pt.title}`,
        description: `Scheduled for today. Tackle this task to stay ahead on your commitments.`,
        priority: pt.priority || 'MEDIUM',
        category: 'TASK',
        actionLabel: 'View Task',
        actionType: 'NAVIGATE',
        actionPath: '/tasks',
        targetId: pt.id
      });
    }
  }

  // Rule 3: Daily habit remaining for today
  const [pendingHabits] = await pool.query(
    `SELECT h.id, h.name, h.preferred_time
     FROM habits h 
     LEFT JOIN habit_logs hl ON h.id = hl.habit_id AND hl.completed_date = ? AND hl.completed = 1
     WHERE h.user_id = ? AND h.frequency = 'DAILY' AND hl.id IS NULL
     LIMIT 1`,
    [today, userId]
  );

  if (pendingHabits.length > 0 && recommendations.length < 3) {
    const habit = pendingHabits[0];
    recommendations.push({
      id: `rec-habit-${habit.id}`,
      title: `Daily Habit: ${habit.name}`,
      description: `Keep your consistency streak alive by checking this off today.`,
      priority: 'MEDIUM',
      category: 'HABIT',
      actionLabel: 'Complete Habit',
      actionType: 'COMPLETE_HABIT',
      actionPath: '/habits',
      targetId: habit.id
    });
  }

  // Rule 4: Active goal with lowest progress
  const [lowGoals] = await pool.query(
    `SELECT * FROM goals 
     WHERE user_id = ? AND status != 'COMPLETED'
     ORDER BY progress ASC, target_date ASC
     LIMIT 1`,
    [userId]
  );

  if (lowGoals.length > 0 && recommendations.length < 3) {
    const goal = lowGoals[0];
    recommendations.push({
      id: `rec-goal-${goal.id}`,
      title: `Goal: ${goal.title}`,
      description: `Currently at ${goal.progress}%. Dedicate a focused block today to build progress.`,
      priority: goal.priority || 'HIGH',
      category: 'GOAL',
      actionLabel: 'Open Goal',
      actionType: 'NAVIGATE',
      actionPath: '/goals',
      targetId: goal.id
    });
  }

  // Rule 5: Next scheduled task if we still have room
  if (recommendations.length < 3) {
    const [nextTasks] = await pool.query(
      `SELECT * FROM tasks 
       WHERE user_id = ? AND status != 'COMPLETED'
       ORDER BY due_date ASC, created_at DESC
       LIMIT 2`,
      [userId]
    );

    for (const nt of nextTasks) {
      if (recommendations.length >= 3) break;
      if (!recommendations.some(r => r.targetId === nt.id)) {
        recommendations.push({
          id: `rec-next-${nt.id}`,
          title: `Next Up: ${nt.title}`,
          description: `Ready to be tackled. Make quick headway on your upcoming tasks.`,
          priority: nt.priority || 'MEDIUM',
          category: 'TASK',
          actionLabel: 'View Task',
          actionType: 'NAVIGATE',
          actionPath: '/tasks',
          targetId: nt.id
        });
      }
    }
  }

  return recommendations;
};

// Format helper
function formatTimeString(timeStr) {
  if (!timeStr) return '';
  const parts = timeStr.toString().split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = hours < 10 ? `0${hours}` : `${hours}`;
  return `${hoursStr}:${minutes} ${ampm}`;
}

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const sParts = startTime.toString().split(':').map(Number);
  const eParts = endTime.toString().split(':').map(Number);
  if (sParts.length < 2 || eParts.length < 2) return null;
  const sMinutes = sParts[0] * 60 + sParts[1];
  const eMinutes = eParts[0] * 60 + eParts[1];
  const diff = eMinutes - sMinutes;
  if (diff <= 0) return null;
  if (diff < 60) return `${diff}m`;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}
