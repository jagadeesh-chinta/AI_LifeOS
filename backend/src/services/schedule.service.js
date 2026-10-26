const pool = require('../config/db');
const AppError = require('../utils/AppError');

function parseJsonSafe(val, fallback = null) {
  if (!val) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function buildDefaultActionPlan(title = '', itemType = '', durationMinutes = 60) {
  const t = (title || '').toLowerCase();
  if (t.includes('exam') || t.includes('test') || t.includes('revise') || t.includes('quiz')) {
    return [
      { id: 'step-1', title: 'Review core concepts, formulas, and theorems', completed: false },
      { id: 'step-2', title: 'Work through high-yield practice questions', completed: false },
      { id: 'step-3', title: 'Perform quick active recall and weak spot check', completed: false }
    ];
  }
  if (t.includes('interview')) {
    return [
      { id: 'step-1', title: 'Polish 90-second self-introduction and elevator pitch', completed: false },
      { id: 'step-2', title: 'Rehearse project explanation using STAR method', completed: false },
      { id: 'step-3', title: 'Practice top technical and behavioral questions', completed: false }
    ];
  }
  if (t.includes('code') || t.includes('programming') || t.includes('bug') || t.includes('feature')) {
    return [
      { id: 'step-1', title: 'Analyze requirements, data structures, and edge cases', completed: false },
      { id: 'step-2', title: 'Implement core functionality cleanly', completed: false },
      { id: 'step-3', title: 'Run tests and verify error handling', completed: false }
    ];
  }
  if (t.includes('meeting') || t.includes('sync')) {
    return [
      { id: 'step-1', title: 'Review agenda and background documents', completed: false },
      { id: 'step-2', title: 'Prepare key talking points and questions', completed: false },
      { id: 'step-3', title: 'Log meeting notes and action items', completed: false }
    ];
  }
  return [
    { id: 'step-1', title: 'Setup workspace and define concrete goals for this block', completed: false },
    { id: 'step-2', title: 'Focus on high-priority execution without distractions', completed: false },
    { id: 'step-3', title: 'Review progress and note next action steps', completed: false }
  ];
}

exports.saveSchedule = async (userId, data) => {
  const { date, schedule_items, generated_by_ai, summary, recommendations } = data;

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Check if schedule already exists for this date
    const [existing] = await connection.query(
      'SELECT id FROM schedules WHERE user_id = ? AND schedule_date = ?', 
      [userId, date]
    );
    
    let scheduleId;

    if (existing.length > 0) {
      scheduleId = existing[0].id;
      // Update schedule record
      await connection.query(
        'UPDATE schedules SET generated_by_ai = ?, summary = ?, recommendations = ? WHERE id = ?', 
        [
          generated_by_ai || false, 
          summary || null, 
          recommendations ? JSON.stringify(recommendations) : null,
          scheduleId
        ]
      );
    } else {
      // Create new schedule record
      const [res] = await connection.query(
        'INSERT INTO schedules (user_id, schedule_date, generated_by_ai, summary, recommendations) VALUES (?, ?, ?, ?, ?)',
        [
          userId, 
          date, 
          generated_by_ai || false,
          summary || null,
          recommendations ? JSON.stringify(recommendations) : null
        ]
      );
      scheduleId = res.insertId;
    }

    // Smart reconciliation of schedule_items so existing slot IDs and messages are preserved
    const [currentDbItems] = await connection.query(
      'SELECT id, title, start_time, end_time, task_id, completed, action_plan, slot_metadata FROM schedule_items WHERE schedule_id = ?',
      [scheduleId]
    );

    const allowedTypes = ['TASK', 'GOAL', 'HABIT', 'EVENT', 'BREAK', 'FOCUS', 'ROUTINE'];
    const keptItemIds = new Set();

    if (schedule_items && schedule_items.length > 0) {
      for (const item of schedule_items) {
        const rawType = String(item.type || item.item_type || 'TASK').toUpperCase();
        const safeType = allowedTypes.includes(rawType) ? rawType : 'FOCUS';
        const sTime = item.start || item.start_time;
        const eTime = item.end || item.end_time;

        // Try to match with an existing db item by item.id, or (title + start_time), or task_id
        let matched = null;
        if (item.id) {
          matched = currentDbItems.find(dbItem => dbItem.id === Number(item.id));
        }
        if (!matched && sTime) {
          matched = currentDbItems.find(dbItem => 
            !keptItemIds.has(dbItem.id) &&
            dbItem.title.trim().toLowerCase() === String(item.title).trim().toLowerCase() &&
            dbItem.start_time.substring(0, 5) === String(sTime).substring(0, 5)
          );
        }
        if (!matched && item.task_id) {
          matched = currentDbItems.find(dbItem => !keptItemIds.has(dbItem.id) && dbItem.task_id === Number(item.task_id));
        }

        const actionPlanVal = item.action_plan 
          ? (typeof item.action_plan === 'string' ? item.action_plan : JSON.stringify(item.action_plan))
          : (matched && matched.action_plan ? JSON.stringify(matched.action_plan) : JSON.stringify(buildDefaultActionPlan(item.title, safeType)));

        const slotMetaVal = item.slot_metadata
          ? (typeof item.slot_metadata === 'string' ? item.slot_metadata : JSON.stringify(item.slot_metadata))
          : (matched && matched.slot_metadata ? JSON.stringify(matched.slot_metadata) : JSON.stringify({ is_fixed: Boolean(item.is_fixed) }));

        const isCompleted = item.completed !== undefined ? Boolean(item.completed) : (matched ? Boolean(matched.completed) : false);

        if (matched) {
          // Update existing item in place
          await connection.query(
            `UPDATE schedule_items 
             SET title = ?, description = ?, start_time = ?, end_time = ?, item_type = ?, 
                 priority = ?, task_id = ?, goal_id = ?, habit_id = ?, completed = ?, 
                 action_plan = ?, slot_metadata = ? 
             WHERE id = ?`,
            [
              item.title,
              item.description || null,
              sTime,
              eTime,
              safeType,
              item.priority || 'MEDIUM',
              item.task_id || null,
              item.goal_id || null,
              item.habit_id || null,
              isCompleted,
              actionPlanVal,
              slotMetaVal,
              matched.id
            ]
          );
          keptItemIds.add(matched.id);
        } else {
          // Insert new item
          const [ins] = await connection.query(
            `INSERT INTO schedule_items 
            (schedule_id, title, description, start_time, end_time, item_type, priority, task_id, goal_id, habit_id, completed, action_plan, slot_metadata) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              scheduleId,
              item.title,
              item.description || null,
              sTime,
              eTime,
              safeType,
              item.priority || 'MEDIUM',
              item.task_id || null,
              item.goal_id || null,
              item.habit_id || null,
              isCompleted,
              actionPlanVal,
              slotMetaVal
            ]
          );
          keptItemIds.add(ins.insertId);
        }
      }
    }

    // Remove any items that were deleted by user
    for (const dbItem of currentDbItems) {
      if (!keptItemIds.has(dbItem.id)) {
        await connection.query('DELETE FROM schedule_items WHERE id = ?', [dbItem.id]);
      }
    }

    await connection.commit();
    return this.getScheduleByDate(userId, date);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

exports.getScheduleByDate = async (userId, date) => {
  const [schedules] = await pool.query(
    'SELECT * FROM schedules WHERE user_id = ? AND schedule_date = ?', 
    [userId, date]
  );
  
  if (schedules.length === 0) {
    return { date, schedule_items: [] };
  }
  
  const schedule = schedules[0];
  
  const [items] = await pool.query(
    `SELECT si.*, 
            COUNT(m.id) AS message_count,
            t.title as original_task_title,
            t.due_date as original_task_due_date,
            t.priority as original_task_priority
     FROM schedule_items si
     LEFT JOIN schedule_slot_messages m ON si.id = m.schedule_item_id
     LEFT JOIN tasks t ON si.task_id = t.id
     WHERE si.schedule_id = ? 
     GROUP BY si.id
     ORDER BY si.start_time ASC`, 
    [schedule.id]
  );
  
  const formattedItems = items.map(item => {
    return {
      ...item,
      action_plan: parseJsonSafe(item.action_plan, buildDefaultActionPlan(item.title, item.item_type)),
      slot_metadata: parseJsonSafe(item.slot_metadata, {}),
      completed: Boolean(item.completed),
      message_count: Number(item.message_count || 0)
    };
  });

  return {
    ...schedule,
    recommendations: parseJsonSafe(schedule.recommendations, []),
    schedule_items: formattedItems
  };
};

exports.updateScheduleItem = async (userId, itemId, data) => {
  const [items] = await pool.query(
    'SELECT si.* FROM schedule_items si JOIN schedules s ON si.schedule_id = s.id WHERE si.id = ? AND s.user_id = ?',
    [itemId, userId]
  );
  
  if (items.length === 0) {
    throw new AppError('Schedule item not found', 404);
  }

  const { title, description, start_time, end_time, completed, action_plan, slot_metadata } = data;
  const updates = [];
  const params = [];

  if (title) { updates.push('title = ?'); params.push(title); }
  if (description !== undefined) { updates.push('description = ?'); params.push(description); }
  if (start_time) { updates.push('start_time = ?'); params.push(start_time); }
  if (end_time) { updates.push('end_time = ?'); params.push(end_time); }
  if (completed !== undefined) { updates.push('completed = ?'); params.push(Boolean(completed)); }
  if (action_plan !== undefined) { updates.push('action_plan = ?'); params.push(typeof action_plan === 'string' ? action_plan : JSON.stringify(action_plan)); }
  if (slot_metadata !== undefined) { updates.push('slot_metadata = ?'); params.push(typeof slot_metadata === 'string' ? slot_metadata : JSON.stringify(slot_metadata)); }

  if (updates.length > 0) {
    params.push(itemId);
    await pool.query(`UPDATE schedule_items SET ${updates.join(', ')} WHERE id = ?`, params);
  }

  return { success: true };
};

exports.deleteScheduleByDate = async (userId, date) => {
  const [schedules] = await pool.query('SELECT id FROM schedules WHERE user_id = ? AND schedule_date = ?', [userId, date]);
  if (schedules.length === 0) {
    return { success: true, message: 'No schedule found for this date' };
  }
  const scheduleId = schedules[0].id;
  await pool.query('DELETE FROM schedule_items WHERE schedule_id = ?', [scheduleId]);
  await pool.query('DELETE FROM schedules WHERE id = ?', [scheduleId]);
  return { success: true, message: 'Schedule successfully unsaved' };
};

