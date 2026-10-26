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
 * 1. Generate or Retrieve Weekly Life Review
 */
exports.getWeeklyReview = async (userId, customStartDate = null) => {
  // Determine Monday of current week
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  
  const weekStartStr = customStartDate ? getLocalDateString(customStartDate) : getLocalDateString(monday);
  const sunday = new Date(`${weekStartStr}T00:00:00Z`);
  sunday.setUTCDate(sunday.getUTCDate() + 6);
  const weekEndStr = sunday.toISOString().substring(0, 10);

  // Check if review already saved
  const [existing] = await pool.query(
    'SELECT * FROM weekly_reviews WHERE user_id = ? AND week_start_date = ?',
    [userId, weekStartStr]
  );

  if (existing.length > 0) {
    const row = existing[0];
    let report = row.report_data;
    let insights = row.insights;
    let nextPlan = row.next_week_plan;
    if (typeof report === 'string') { try { report = JSON.parse(report); } catch (e) { report = {}; } }
    if (typeof insights === 'string') { try { insights = JSON.parse(insights); } catch (e) { insights = []; } }
    if (typeof nextPlan === 'string') { try { nextPlan = JSON.parse(nextPlan); } catch (e) { nextPlan = {}; } }
    return {
      id: row.id,
      week_start_date: row.week_start_date,
      week_end_date: row.week_end_date,
      status: row.status,
      report: report || {},
      insights: insights || [],
      next_week_plan: nextPlan || {}
    };
  }

  // Generate new weekly report from actual data
  // 1. Tasks in this week
  const [tasks] = await pool.query(
    `SELECT id, title, priority, status, 
            DATE_FORMAT(task_date, '%Y-%m-%d') as task_date, 
            DATE_FORMAT(due_date, '%Y-%m-%d') as due_date, 
            estimated_minutes, created_at
     FROM tasks 
     WHERE user_id = ? 
       AND (
         (task_date BETWEEN ? AND ?) OR 
         (due_date BETWEEN ? AND ?) OR
         (created_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY))
       )`,
    [userId, weekStartStr, weekEndStr, weekStartStr, weekEndStr, weekStartStr, weekEndStr]
  );

  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');
  const unfinishedTasks = tasks.filter(t => t.status !== 'COMPLETED');
  const taskCompletionRate = tasks.length > 0
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  // 2. Habits in this week
  const [habitLogs] = await pool.query(
    `SELECT habit_id, completed 
     FROM habit_logs 
     WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ?) 
       AND completed_date BETWEEN ? AND ?`,
    [userId, weekStartStr, weekEndStr]
  );
  const completedHabitLogsCount = habitLogs.filter(h => h.completed).length;

  // 3. Goal progress
  const [goals] = await pool.query(
    "SELECT id, title, progress FROM goals WHERE user_id = ? AND status != 'COMPLETED'",
    [userId]
  );

  // 4. Learning topics completed in this week
  const [topics] = await pool.query(
    `SELECT topic_id, technology_id, mastery_score 
     FROM career_topic_progress 
     WHERE user_id = ? AND completed = 1 AND updated_at BETWEEN ? AND DATE_ADD(?, INTERVAL 1 DAY)`,
    [userId, weekStartStr, weekEndStr]
  );

  // 5. Scheduled vs recorded duration from user_daily_usage
  const [usageRows] = await pool.query(
    `SELECT SUM(seconds_tracked) as total_seconds 
     FROM user_daily_usage 
     WHERE user_id = ? AND usage_date BETWEEN ? AND ?`,
    [userId, weekStartStr, weekEndStr]
  );
  const recordedHours = (Number(usageRows[0]?.total_seconds || 0) / 3600).toFixed(1);
  const scheduledHours = (completedTasks.reduce((acc, t) => acc + (Number(t.estimated_minutes) || 30), 0) / 60).toFixed(1);

  // Evidence-based Insights (3 to 5)
  const insights = [
    {
      type: 'TASK_VELOCITY',
      title: `Task Execution Velocity: ${taskCompletionRate}%`,
      explanation: `You completed ${completedTasks.length} out of ${tasks.length} planned tasks this week.`,
      evidence: `${completedTasks.length} completed, ${unfinishedTasks.length} pending`,
      recommendation: taskCompletionRate < 60
        ? 'Consider breaking down larger tasks into smaller 30-minute subtasks.'
        : 'Strong task velocity! Maintain momentum by locking in next week priorities early.'
    },
    {
      type: 'HABIT_MOMENTUM',
      title: `Habit Consistency: ${completedHabitLogsCount} Check-ins`,
      explanation: `Recorded ${completedHabitLogsCount} habit completion logs across the week.`,
      evidence: `${completedHabitLogsCount} active habit logs in past 7 days`,
      recommendation: 'Protect your streaks by utilizing 5-minute micro-habits on high-workload days.'
    },
    {
      type: 'SKILL_PROGRESS',
      title: `Career Learning: ${topics.length} Topics Mastered`,
      explanation: `You advanced on ${topics.length} technical roadmap topics this week with positive mastery scores.`,
      evidence: `${topics.length} topics updated`,
      recommendation: 'Take topic quizzes to solidify long-term retention before moving to subsequent stages.'
    }
  ];

  if (unfinishedTasks.length > 2) {
    insights.push({
      type: 'OVERDUE_AUDIT',
      title: `${unfinishedTasks.length} Unfinished Tasks for Rollover`,
      explanation: `You have ${unfinishedTasks.length} tasks scheduled this week that were not finished.`,
      evidence: unfinishedTasks.slice(0, 3).map(t => t.title).join(', '),
      recommendation: 'Review unfinished tasks during "Prepare Next Week" and defer non-essential items.'
    });
  }

  // Proposed Next Week Plan
  const nextWeekStart = new Date(`${weekEndStr}T00:00:00Z`);
  nextWeekStart.setUTCDate(nextWeekStart.getUTCDate() + 1);
  const nextWeekStartStr = nextWeekStart.toISOString().substring(0, 10);

  const nextWeekPlan = {
    proposed_start_date: nextWeekStartStr,
    rollover_tasks: unfinishedTasks.slice(0, 5).map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      suggested_day: 'Monday'
    })),
    priority_focus: goals.length > 0 ? `Advance goal: ${goals[0].title}` : 'Complete backlog tasks',
    recommended_target_hours: 20
  };

  const reportData = {
    tasks_planned: tasks.length,
    tasks_completed: completedTasks.length,
    tasks_unfinished: unfinishedTasks.length,
    task_completion_rate: taskCompletionRate,
    habits_logged_count: completedHabitLogsCount,
    topics_mastered_count: topics.length,
    recorded_hours: recordedHours,
    scheduled_hours: scheduledHours,
    active_goals_count: goals.length,
    completed_task_titles: completedTasks.slice(0, 5).map(t => t.title)
  };

  // Persist weekly review
  const [res] = await pool.query(
    `INSERT INTO weekly_reviews 
      (user_id, week_start_date, week_end_date, report_data, insights, next_week_plan, status)
     VALUES (?, ?, ?, ?, ?, ?, 'draft')
     ON DUPLICATE KEY UPDATE 
       report_data = VALUES(report_data),
       insights = VALUES(insights),
       next_week_plan = VALUES(next_week_plan)`,
    [
      userId,
      weekStartStr,
      weekEndStr,
      JSON.stringify(reportData),
      JSON.stringify(insights),
      JSON.stringify(nextWeekPlan)
    ]
  );

  return {
    id: res.insertId || existing[0]?.id,
    week_start_date: weekStartStr,
    week_end_date: weekEndStr,
    status: 'draft',
    report: reportData,
    insights: insights,
    next_week_plan: nextWeekPlan
  };
};

/**
 * 2. Apply "Prepare Next Week" Approved Schedule
 */
exports.applyNextWeekPlan = async (userId, reviewId) => {
  const [reviews] = await pool.query(
    'SELECT * FROM weekly_reviews WHERE id = ? AND user_id = ?',
    [reviewId, userId]
  );

  if (reviews.length === 0) {
    throw new AppError('Weekly review not found or unauthorized', 404);
  }

  const review = reviews[0];
  let nextPlan = review.next_week_plan;
  if (typeof nextPlan === 'string') {
    try { nextPlan = JSON.parse(nextPlan); } catch (e) { nextPlan = {}; }
  }

  // Reschedule rollover tasks to the new week without creating duplicate tasks
  const rollover = nextPlan.rollover_tasks || [];
  for (const t of rollover) {
    await pool.query(
      'UPDATE tasks SET task_date = ? WHERE id = ? AND user_id = ?',
      [nextPlan.proposed_start_date, t.id, userId]
    );
  }

  await pool.query(
    "UPDATE weekly_reviews SET status = 'approved', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [reviewId]
  );

  return {
    success: true,
    message: `Next week plan adopted: ${rollover.length} tasks scheduled for the week of ${nextPlan.proposed_start_date}`,
    status: 'approved'
  };
};
