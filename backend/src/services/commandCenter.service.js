const pool = require('../config/db');
const AppError = require('../utils/AppError');
const aiScheduler = require('./aiScheduler.service');
const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');

/**
 * Helper to get current local date in YYYY-MM-DD
 */
function getLocalDateString(dateInput) {
  if (dateInput) {
    if (typeof dateInput === 'string') return dateInput.substring(0, 10);
    if (dateInput instanceof Date) return dateInput.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * 1. Intelligent Daily Command Briefing
 */
exports.getDailyCommandBriefing = async (userId, targetDate) => {
  const dateStr = getLocalDateString(targetDate);

  // 1. Fetch user tasks for today and upcoming deadlines
  const [tasks] = await pool.query(
    `SELECT id, title, description, priority, status, 
            DATE_FORMAT(task_date, '%Y-%m-%d') as task_date, 
            start_time, end_time, 
            DATE_FORMAT(due_date, '%Y-%m-%d') as due_date, 
            estimated_minutes, category
     FROM tasks
     WHERE user_id = ? 
       AND (task_date = ? OR (task_date IS NULL AND (due_date = ? OR status != 'COMPLETED')))
     ORDER BY CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END, 
              COALESCE(start_time, '23:59') ASC`,
    [userId, dateStr, dateStr]
  );

  const todayTasks = tasks.filter(t => t.task_date === dateStr || t.due_date === dateStr);
  const completedTodayTasks = todayTasks.filter(t => t.status === 'COMPLETED');
  const pendingTodayTasks = todayTasks.filter(t => t.status !== 'COMPLETED');

  // 2. Fetch today's schedule items
  const [scheduleRows] = await pool.query(
    'SELECT id, summary, schedule_date FROM schedules WHERE user_id = ? AND schedule_date = ?',
    [userId, dateStr]
  );
  let scheduleItems = [];
  if (scheduleRows.length > 0) {
    const [items] = await pool.query(
      `SELECT id, title, description, start_time, end_time, item_type, priority, completed, task_id, habit_id
       FROM schedule_items
       WHERE schedule_id = ?
       ORDER BY start_time ASC`,
      [scheduleRows[0].id]
    );
    scheduleItems = items;
  }

  // 3. Fetch habits and today's logs
  const [habits] = await pool.query(
    'SELECT id, name, description, frequency, target_count, preferred_time FROM habits WHERE user_id = ?',
    [userId]
  );
  const [habitLogs] = await pool.query(
    `SELECT habit_id, completed 
     FROM habit_logs 
     WHERE habit_id IN (SELECT id FROM habits WHERE user_id = ?) 
       AND completed_date = ?`,
    [userId, dateStr]
  );
  const completedHabitIds = new Set(habitLogs.filter(hl => hl.completed).map(hl => hl.habit_id));

  // 4. Fetch active goals
  const [goals] = await pool.query(
    "SELECT id, title, target_date, priority, progress FROM goals WHERE user_id = ? AND status != 'COMPLETED' LIMIT 5",
    [userId]
  );

  // 5. Fetch upcoming deadlines (next 7 days)
  const [upcomingDeadlines] = await pool.query(
    `SELECT id, title, priority, DATE_FORMAT(due_date, '%Y-%m-%d') as due_date, estimated_minutes
     FROM tasks 
     WHERE user_id = ? 
       AND status != 'COMPLETED' 
       AND due_date IS NOT NULL 
       AND due_date BETWEEN ? AND DATE_ADD(?, INTERVAL 7 DAY)
     ORDER BY due_date ASC`,
    [userId, dateStr, dateStr]
  );

  // 6. Workload calculation
  const totalPlannedMinutes = pendingTodayTasks.reduce((sum, t) => sum + (Number(t.estimated_minutes) || 45), 0);
  const now = new Date();
  const currentHour = now.getHours();
  const remainingHoursInDay = Math.max(0, 23 - currentHour);
  const availableMinutes = remainingHoursInDay * 60;

  let workloadStatus = 'balanced';
  let workloadRatio = 0.5;
  if (availableMinutes > 0) {
    workloadRatio = Math.min(1.5, totalPlannedMinutes / availableMinutes);
    if (workloadRatio > 1.0) workloadStatus = 'overloaded';
    else if (workloadRatio > 0.75) workloadStatus = 'high';
    else if (workloadRatio < 0.35) workloadStatus = 'light';
  }

  // Top 3 Priorities
  const topPriorities = pendingTodayTasks.slice(0, 3).map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    due_date: t.due_date,
    estimated_minutes: t.estimated_minutes || 45,
    category: t.category || 'General'
  }));

  // Generate AI Executive Briefing
  let aiBriefing = null;
  const briefingPrompt = `You are the AI LifeOS Chief of Staff. Generate a crisp, motivating, and actionable daily command briefing.
User's Real Data:
- Date: ${dateStr}
- Pending Tasks Today (${pendingTodayTasks.length}): ${pendingTodayTasks.map(t => `${t.title} (${t.priority}, ${t.estimated_minutes || 45}m)`).join(', ')}
- Completed Tasks Today: ${completedTodayTasks.length}
- Upcoming Deadlines (7 days): ${upcomingDeadlines.map(u => `${u.title} due ${u.due_date}`).join(', ')}
- Habits Today: ${habits.length} habits (${completedHabitIds.size} completed)
- Active Goals: ${goals.map(g => `${g.title} (${g.progress}%)`).join(', ')}
- Workload: ${workloadStatus} (Planned: ${totalPlannedMinutes}m, Available: ~${availableMinutes}m)

Return a JSON object with:
"focus_first": "1-2 sentences on what requires immediate attention",
"deadline_alert": "1 sentence on closest deadline urgency or none",
"workload_analysis": "Realistic evaluation of whether today's plan fits and what adjustment helps",
"next_action": "The single highest leverage next step to take right now"`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'PASTE_YOUR_NEW_GEMINI_API_KEY_HERE') {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const resp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: briefingPrompt,
        config: { responseMimeType: 'application/json' }
      });
      aiBriefing = JSON.parse(resp.text.trim());
    }
  } catch (e) {
    // Fallback to deterministic briefing if API unavailable
  }

  if (!aiBriefing) {
    aiBriefing = {
      focus_first: topPriorities.length > 0 
        ? `Tackle "${topPriorities[0].title}" first during your peak morning energy window.`
        : 'All scheduled tasks for today are up to date. Review active goals or learn a new topic.',
      deadline_alert: upcomingDeadlines.length > 0
        ? `Upcoming deadline: "${upcomingDeadlines[0].title}" due on ${upcomingDeadlines[0].due_date}.`
        : 'No immediate deadlines in the next 48 hours.',
      workload_analysis: workloadStatus === 'overloaded'
        ? `You have ~${totalPlannedMinutes} mins of work planned with limited hours remaining. Consider deferring low-priority items.`
        : `Your workload is ${workloadStatus}. You have reasonable capacity to achieve today's top priorities.`,
      next_action: topPriorities.length > 0
        ? `Start a 45-minute focused sprint on "${topPriorities[0].title}".`
        : 'Check your habit check-ins or review your career roadmap.'
    };
  }

  return {
    date: dateStr,
    greeting: getGreeting(),
    top_priorities: topPriorities,
    stats: {
      tasks_total: todayTasks.length,
      tasks_completed: completedTodayTasks.length,
      tasks_pending: pendingTodayTasks.length,
      habits_total: habits.length,
      habits_completed: completedHabitIds.size,
      goals_active: goals.length,
      workload_status: workloadStatus,
      planned_minutes: totalPlannedMinutes,
      available_minutes: availableMinutes
    },
    today_schedule: scheduleItems,
    upcoming_deadlines: upcomingDeadlines,
    habits: habits.map(h => ({
      id: h.id,
      name: h.name,
      preferred_time: h.preferred_time,
      completed: completedHabitIds.has(h.id)
    })),
    active_goals: goals,
    ai_briefing: aiBriefing
  };
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * 2. Optimize My Day (Preview Proposed Schedule)
 */
exports.optimizeMyDayPreview = async (userId, targetDate) => {
  const dateStr = getLocalDateString(targetDate);
  const now = new Date();
  const currentHour = now.getHours();
  const currentMin = now.getMinutes();
  const currentMins = currentHour * 60 + currentMin;

  // Retrieve today's existing schedule items
  const [scheduleRows] = await pool.query(
    'SELECT id, summary FROM schedules WHERE user_id = ? AND schedule_date = ?',
    [userId, dateStr]
  );

  let existingItems = [];
  if (scheduleRows.length > 0) {
    const [items] = await pool.query(
      'SELECT * FROM schedule_items WHERE schedule_id = ? ORDER BY start_time ASC',
      [scheduleRows[0].id]
    );
    existingItems = items;
  }

  // Retrieve uncompleted tasks for today
  const [tasks] = await pool.query(
    `SELECT id, title, priority, estimated_minutes, category
     FROM tasks
     WHERE user_id = ? 
       AND status != 'COMPLETED'
       AND (task_date = ? OR (task_date IS NULL AND due_date = ?))
     ORDER BY CASE priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END`,
    [userId, dateStr, dateStr]
  );

  // Preserve fixed commitments and already passed slots
  const fixedSlots = existingItems.filter(item => {
    const [h, m] = (item.start_time || '00:00').split(':').map(Number);
    const startMins = h * 60 + m;
    return item.item_type === 'COMMITMENT' || item.completed || (startMins < currentMins && dateStr === getLocalDateString());
  });

  // Calculate available blocks from max(currentMins + 15, 08:00) to 22:30
  const startSchedulingMins = Math.max(currentMins + 10, 8 * 60);
  let curMins = Math.ceil(startSchedulingMins / 15) * 15; // align to 15m
  const endOfDayMins = 22 * 60 + 30;

  const proposedItems = [...fixedSlots];
  const changesExplained = [];

  tasks.forEach(task => {
    const duration = Number(task.estimated_minutes) || 45;
    
    // Find next non-clashing slot
    while (curMins + duration <= endOfDayMins) {
      const slotEnd = curMins + duration;
      const clash = proposedItems.find(p => {
        const [ph1, pm1] = (p.start_time || '00:00').split(':').map(Number);
        const [ph2, pm2] = (p.end_time || '00:00').split(':').map(Number);
        const pStart = ph1 * 60 + pm1;
        const pEnd = ph2 * 60 + pm2;
        return Math.max(curMins, pStart) < Math.min(slotEnd, pEnd);
      });

      if (!clash) {
        const startStr = `${String(Math.floor(curMins / 60)).padStart(2, '0')}:${String(curMins % 60).padStart(2, '0')}`;
        const endStr = `${String(Math.floor(slotEnd / 60)).padStart(2, '0')}:${String(slotEnd % 60).padStart(2, '0')}`;

        proposedItems.push({
          title: task.title,
          description: `Optimized study/task session (${task.priority} priority)`,
          start_time: startStr,
          end_time: endStr,
          item_type: 'TASK',
          priority: task.priority,
          task_id: task.id,
          completed: false,
          action_plan: `Focus on ${task.title}`
        });

        changesExplained.push({
          task_title: task.title,
          proposed_time: `${startStr} - ${endStr}`,
          reason: `Scheduled in upcoming free window after preserving fixed commitments.`
        });

        curMins = slotEnd + 15; // 15 min rest
        break;
      } else {
        const [ph2, pm2] = (clash.end_time || '00:00').split(':').map(Number);
        curMins = ph2 * 60 + pm2;
      }
    }
  });

  // Sort chronologically
  proposedItems.sort((a, b) => a.start_time.localeCompare(b.start_time));

  return {
    date: dateStr,
    summary: `Optimized schedule created for ${proposedItems.length} items. All fixed commitments and past activities preserved.`,
    proposed_items: proposedItems,
    changes_explained: changesExplained,
    fixed_count: fixedSlots.length,
    scheduled_tasks_count: changesExplained.length
  };
};

/**
 * 3. Apply Approved Optimized Schedule
 */
exports.applyOptimizedSchedule = async (userId, targetDate, proposedItems) => {
  const dateStr = getLocalDateString(targetDate);
  if (!proposedItems || !Array.isArray(proposedItems)) {
    throw new AppError('Invalid proposed items list', 400);
  }

  // Create or update schedule row
  const [existing] = await pool.query(
    'SELECT id FROM schedules WHERE user_id = ? AND schedule_date = ?',
    [userId, dateStr]
  );

  let scheduleId;
  if (existing.length > 0) {
    scheduleId = existing[0].id;
    await pool.query(
      'UPDATE schedules SET summary = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['Optimized schedule applied by user', scheduleId]
    );
    // Delete non-fixed items that user is replacing
    await pool.query(
      "DELETE FROM schedule_items WHERE schedule_id = ? AND item_type != 'COMMITMENT' AND completed = 0",
      [scheduleId]
    );
  } else {
    const [res] = await pool.query(
      `INSERT INTO schedules (user_id, schedule_date, generated_by_ai, summary)
       VALUES (?, ?, 1, ?)`,
      [userId, dateStr, 'Optimized schedule applied by user']
    );
    scheduleId = res.insertId;
  }

  // Insert proposed items
  for (const item of proposedItems) {
    // Avoid re-inserting already existing fixed items
    if (item.id && existing.length > 0) continue;

    await pool.query(
      `INSERT INTO schedule_items 
        (schedule_id, title, description, start_time, end_time, item_type, priority, task_id, habit_id, completed, action_plan)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        scheduleId,
        item.title,
        item.description || '',
        item.start_time,
        item.end_time,
        item.item_type || 'TASK',
        item.priority || 'Medium',
        item.task_id || null,
        item.habit_id || null,
        item.completed ? 1 : 0,
        item.action_plan || ''
      ]
    );
  }

  return { success: true, message: 'Optimized schedule applied successfully', schedule_id: scheduleId };
};
