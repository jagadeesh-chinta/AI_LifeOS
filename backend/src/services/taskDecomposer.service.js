const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');

/**
 * 1. AI Task Decomposition
 */
exports.decomposeTask = async (userId, taskId, customTitle = null) => {
  let taskTitle = customTitle;
  let taskDescription = '';
  let taskPriority = 'Medium';
  let taskCategory = 'General';

  if (taskId) {
    const [tasks] = await pool.query(
      'SELECT id, title, description, priority, category FROM tasks WHERE id = ? AND user_id = ?',
      [taskId, userId]
    );
    if (tasks.length === 0) {
      throw new AppError('Task not found or access denied', 404);
    }
    taskTitle = tasks[0].title;
    taskDescription = tasks[0].description || '';
    taskPriority = tasks[0].priority || 'Medium';
    taskCategory = tasks[0].category || 'General';
  }

  if (!taskTitle || !taskTitle.trim()) {
    throw new AppError('Task title or description is required for decomposition', 400);
  }

  // Decompose prompt
  const prompt = `You are an elite productivity engineer. Break down the following task into 4 to 6 actionable, logically ordered subtasks.
Task: "${taskTitle}"
Description: "${taskDescription}"
Priority: "${taskPriority}"
Category: "${taskCategory}"

Return a JSON object with:
"task_title": string,
"estimated_total_minutes": number,
"subtasks": array of objects with:
  "title": string (action-oriented starting with an active verb),
  "description": string (clear instructions),
  "estimated_minutes": number (between 15 and 90),
  "priority": "High" | "Medium" | "Low",
  "suggested_order": number (1-based index),
  "dependencies": array of string (e.g. ["Research core topics"]),
  "completion_criteria": string (verifiable standard for done)`;

  let decomposed = null;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'PASTE_YOUR_NEW_GEMINI_API_KEY_HERE') {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const resp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      decomposed = JSON.parse(resp.text.trim());
    }
  } catch (err) {
    console.warn('Gemini decomposition failed, trying OpenAI or deterministic fallback:', err.message);
  }

  // OpenAI fallback if Gemini failed
  if (!decomposed && process.env.OPENAI_API_KEY) {
    try {
      const resp = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      decomposed = JSON.parse(resp.data.choices[0].message.content);
    } catch (e) {
      console.warn('OpenAI decomposition failed:', e.message);
    }
  }

  // Deterministic fallback if external AI unavailable
  if (!decomposed || !decomposed.subtasks || decomposed.subtasks.length === 0) {
    decomposed = {
      task_title: taskTitle,
      estimated_total_minutes: 180,
      subtasks: [
        {
          title: `Define core scope & requirements for ${taskTitle}`,
          description: 'Document key deliverables, required resources, and target milestones.',
          estimated_minutes: 30,
          priority: 'High',
          suggested_order: 1,
          dependencies: [],
          completion_criteria: 'Bullet list of goals and constraints finalized.'
        },
        {
          title: `Research best practices & gather reference materials`,
          description: 'Collate documentation, prior work, and technical references.',
          estimated_minutes: 45,
          priority: 'Medium',
          suggested_order: 2,
          dependencies: ['Define core scope & requirements'],
          completion_criteria: 'All necessary reference materials collected in notes.'
        },
        {
          title: `Execute foundational phase & draft primary component`,
          description: 'Implement core functionality or complete first draft.',
          estimated_minutes: 60,
          priority: 'High',
          suggested_order: 3,
          dependencies: ['Research best practices'],
          completion_criteria: 'Initial implementation working end to end.'
        },
        {
          title: `Review, test edge cases & polish deliverables`,
          description: 'Refactor, verify quality, and ensure completion standards are met.',
          estimated_minutes: 45,
          priority: 'Medium',
          suggested_order: 4,
          dependencies: ['Execute foundational phase'],
          completion_criteria: 'Zero unresolved bugs or incomplete items.'
        }
      ]
    };
  }

  return {
    task_id: taskId || null,
    task_title: taskTitle,
    estimated_total_minutes: decomposed.estimated_total_minutes || 180,
    subtasks: decomposed.subtasks
  };
};

/**
 * 2. Save Approved Subtasks to MySQL
 */
exports.saveApprovedSubtasks = async (userId, taskId, subtasks) => {
  if (!subtasks || !Array.isArray(subtasks) || subtasks.length === 0) {
    throw new AppError('No subtasks provided to save', 400);
  }

  // Verify task ownership
  const [tasks] = await pool.query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);
  if (tasks.length === 0) {
    throw new AppError('Task not found or unauthorized', 404);
  }

  const savedList = [];
  for (let i = 0; i < subtasks.length; i++) {
    const s = subtasks[i];
    const [res] = await pool.query(
      `INSERT INTO task_subtasks 
        (task_id, user_id, title, description, estimated_minutes, priority, suggested_order, dependencies, completion_criteria, completed)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        taskId,
        userId,
        s.title.trim(),
        s.description || '',
        Number(s.estimated_minutes) || 30,
        s.priority || 'Medium',
        s.suggested_order || i + 1,
        JSON.stringify(s.dependencies || []),
        s.completion_criteria || '',
        s.completed ? 1 : 0
      ]
    );

    savedList.push({
      id: res.insertId,
      task_id: taskId,
      title: s.title,
      estimated_minutes: s.estimated_minutes || 30,
      priority: s.priority || 'Medium',
      completed: !!s.completed
    });
  }

  return {
    success: true,
    message: `${savedList.length} subtasks saved successfully`,
    subtasks: savedList
  };
};

/**
 * 3. Retrieve Subtasks for a Task
 */
exports.getSubtasks = async (userId, taskId) => {
  const [rows] = await pool.query(
    `SELECT id, task_id, title, description, estimated_minutes, priority, suggested_order, 
            dependencies, completion_criteria, completed, completed_at, 
            DATE_FORMAT(scheduled_date, '%Y-%m-%d') as scheduled_date, 
            scheduled_start_time, scheduled_end_time, created_at
     FROM task_subtasks
     WHERE task_id = ? AND user_id = ?
     ORDER BY suggested_order ASC, id ASC`,
    [taskId, userId]
  );

  return rows.map(r => {
    let deps = r.dependencies;
    if (typeof deps === 'string') {
      try { deps = JSON.parse(deps); } catch (e) { deps = []; }
    }
    return {
      ...r,
      dependencies: deps || []
    };
  });
};

/**
 * 4. Toggle Subtask Completion
 */
exports.toggleSubtask = async (userId, subtaskId, completed) => {
  const isCompleted = completed ? 1 : 0;
  const completedAt = isCompleted ? new Date() : null;

  const [res] = await pool.query(
    'UPDATE task_subtasks SET completed = ?, completed_at = ? WHERE id = ? AND user_id = ?',
    [isCompleted, completedAt, subtaskId, userId]
  );

  if (res.affectedRows === 0) {
    throw new AppError('Subtask not found or unauthorized', 404);
  }

  // Check if all subtasks for the parent task are completed
  const [subtasks] = await pool.query(
    'SELECT task_id, completed FROM task_subtasks WHERE task_id = (SELECT task_id FROM task_subtasks WHERE id = ?)',
    [subtaskId]
  );

  const parentTaskId = subtasks[0]?.task_id;
  const allDone = subtasks.length > 0 && subtasks.every(s => s.completed);

  return {
    success: true,
    subtask_id: subtaskId,
    completed: !!isCompleted,
    parent_task_id: parentTaskId,
    all_subtasks_completed: allDone
  };
};

/**
 * 5. Delete Subtask
 */
exports.deleteSubtask = async (userId, subtaskId) => {
  const [res] = await pool.query('DELETE FROM task_subtasks WHERE id = ? AND user_id = ?', [subtaskId, userId]);
  if (res.affectedRows === 0) {
    throw new AppError('Subtask not found or unauthorized', 404);
  }
  return { success: true, message: 'Subtask deleted' };
};

/**
 * 6. Send Subtasks to AI Planner Schedule
 */
exports.scheduleSubtasksToPlanner = async (userId, taskId, subtaskIds, targetDate) => {
  const dateStr = targetDate || new Date().toISOString().split('T')[0];

  const [subtasks] = await pool.query(
    `SELECT id, title, description, estimated_minutes, priority 
     FROM task_subtasks 
     WHERE task_id = ? AND user_id = ? AND id IN (?) AND completed = 0`,
    [taskId, userId, subtaskIds]
  );

  if (subtasks.length === 0) {
    throw new AppError('No eligible subtasks found to schedule', 400);
  }

  // Find or create schedule for the date
  let [scheduleRows] = await pool.query(
    'SELECT id FROM schedules WHERE user_id = ? AND schedule_date = ?',
    [userId, dateStr]
  );

  let scheduleId;
  if (scheduleRows.length === 0) {
    const [res] = await pool.query(
      `INSERT INTO schedules (user_id, schedule_date, generated_by_ai, summary)
       VALUES (?, ?, 1, 'Schedule updated with decomposed task subtasks')`,
      [userId, dateStr]
    );
    scheduleId = res.insertId;
  } else {
    scheduleId = scheduleRows[0].id;
  }

  // Find existing slots to calculate non-overlapping start times
  const [existingItems] = await pool.query(
    'SELECT start_time, end_time FROM schedule_items WHERE schedule_id = ? ORDER BY end_time DESC',
    [scheduleId]
  );

  let curMins = 14 * 60; // default afternoon start at 14:00 if empty
  if (existingItems.length > 0) {
    const lastEnd = existingItems[0].end_time || '14:00';
    const [eh, em] = lastEnd.split(':').map(Number);
    curMins = Math.max(curMins, eh * 60 + em + 15);
  }

  const scheduled = [];
  for (const sub of subtasks) {
    const duration = Number(sub.estimated_minutes) || 30;
    const endMins = curMins + duration;

    const startStr = `${String(Math.floor(curMins / 60)).padStart(2, '0')}:${String(curMins % 60).padStart(2, '0')}`;
    const endStr = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;

    await pool.query(
      `INSERT INTO schedule_items 
        (schedule_id, title, description, start_time, end_time, item_type, priority, task_id, action_plan)
       VALUES (?, ?, ?, ?, ?, 'TASK', ?, ?, ?)`,
      [
        scheduleId,
        sub.title,
        sub.description || '',
        startStr,
        endStr,
        sub.priority || 'Medium',
        taskId,
        `Subtask: ${sub.title}`
      ]
    );

    // Update subtask scheduled times
    await pool.query(
      'UPDATE task_subtasks SET scheduled_date = ?, scheduled_start_time = ?, scheduled_end_time = ? WHERE id = ?',
      [dateStr, startStr, endStr, sub.id]
    );

    scheduled.push({ id: sub.id, title: sub.title, start_time: startStr, end_time: endStr });
    curMins = endMins + 15; // 15m rest
  }

  return {
    success: true,
    message: `${scheduled.length} subtasks scheduled to AI Planner for ${dateStr}`,
    scheduled
  };
};
