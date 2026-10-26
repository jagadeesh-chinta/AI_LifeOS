const pool = require('../config/db');
const AppError = require('../utils/AppError');

// Normalize any time format (12h AM/PM or 24h) into standard 24h HH:MM
function normalizeTimeTo24h(timeStr) {
  if (!timeStr) return null;
  const str = timeStr.toString().trim().toUpperCase();

  // Match 12-hour AM/PM: e.g. "9:30 AM", "09:30 AM", "1:00 PM", "01:00 PM", "12:00 AM", "12:00 PM"
  const match12 = str.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2];
    const ampm = match12[3];
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  // Match 24-hour: e.g. "09:30", "14:15", "14:15:00"
  const match24 = str.match(/^(\d{1,2}):(\d{2})(:00)?$/);
  if (match24) {
    const hours = String(parseInt(match24[1], 10)).padStart(2, '0');
    const minutes = match24[2];
    return `${hours}:${minutes}`;
  }

  return timeStr;
}

// Format 24-hour HH:MM into clean 12-hour AM/PM (e.g. "09:00 AM", "01:30 PM")
function formatTime12h(timeStr) {
  if (!timeStr) return '';
  const normalized = normalizeTimeTo24h(timeStr);
  if (!normalized) return '';
  const parts = normalized.split(':');
  if (parts.length < 2) return timeStr;

  let hours = parseInt(parts[0], 10);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
}

// Calculate human-friendly duration text (e.g. "1 hour", "1 hour 30 minutes", "2 hours 30 minutes")
function calculateDurationText(startTime, endTime, estMinutes) {
  const s24 = normalizeTimeTo24h(startTime);
  const e24 = normalizeTimeTo24h(endTime);

  if (s24 && e24) {
    const [sh, sm] = s24.split(':').map(Number);
    const [eh, em] = e24.split(':').map(Number);
    let diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff < 0) {
      diff += 24 * 60; // Cross-midnight
    }
    if (diff > 0) {
      const hours = Math.floor(diff / 60);
      const mins = diff % 60;
      if (hours > 0 && mins > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
      }
      if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''}`;
      }
      return `${mins} minute${mins > 1 ? 's' : ''}`;
    }
  }

  if (estMinutes && estMinutes > 0) {
    const hours = Math.floor(estMinutes / 60);
    const mins = estMinutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minute${mins > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    }
    return `${mins} minute${mins > 1 ? 's' : ''}`;
  }

  return null;
}

// Automatic calculation of Pending vs Completed (No Overdue)
function deriveTaskStatus(task) {
  // If user has explicitly marked as completed, always Completed
  if (task.status === 'COMPLETED' || task.is_completed) {
    return 'COMPLETED';
  }

  let dateStr = null;
  if (task.task_date) {
    dateStr = typeof task.task_date === 'string'
      ? task.task_date.substring(0, 10)
      : new Date(task.task_date).toLocaleDateString('en-CA');
  } else if (task.due_date) {
    dateStr = new Date(task.due_date).toLocaleDateString('en-CA');
  }

  // If no date at all, it remains PENDING
  if (!dateStr) {
    return 'PENDING';
  }

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const localToday = `${y}-${m}-${d}`;
  const localNowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // If scheduled task date is in the past, automatically Completed
  if (dateStr < localToday) {
    return 'COMPLETED';
  }

  // If scheduled task date is in the future, automatically Pending
  if (dateStr > localToday) {
    return 'PENDING';
  }

  // If scheduled task date is TODAY, check end_time or start_time
  if (dateStr === localToday) {
    const checkTime = normalizeTimeTo24h(task.end_time || task.start_time);
    if (checkTime) {
      if (checkTime <= localNowTime) {
        return 'COMPLETED';
      } else {
        return 'PENDING';
      }
    }
    return 'PENDING';
  }

  return 'PENDING';
}

function formatTask(task) {
  const derivedStatus = deriveTaskStatus(task);
  const durationText = calculateDurationText(task.start_time, task.end_time, task.estimated_minutes);

  let formattedDate = null;
  const rawDate = task.task_date || (task.due_date ? new Date(task.due_date).toLocaleDateString('en-CA') : null);
  if (rawDate) {
    formattedDate = typeof rawDate === 'string' ? rawDate.substring(0, 10) : new Date(rawDate).toLocaleDateString('en-CA');
  }

  const s24 = normalizeTimeTo24h(task.start_time);
  const e24 = normalizeTimeTo24h(task.end_time);

  return {
    ...task,
    task_date: formattedDate,
    start_time: s24,
    end_time: e24,
    start_time_12h: formatTime12h(s24),
    end_time_12h: formatTime12h(e24),
    raw_status: task.status,
    status: derivedStatus, // Exactly 'PENDING' or 'COMPLETED'
    is_completed: derivedStatus === 'COMPLETED',
    duration: durationText
  };
}

exports.createTask = async (userId, data) => {
  const { title, description, priority, task_date, start_time, end_time, category } = data;

  if (!title || !title.trim()) {
    throw new AppError('Task title is required', 400);
  }

  const s24 = normalizeTimeTo24h(start_time);
  const e24 = normalizeTimeTo24h(end_time);

  let estimated_minutes = data.estimated_minutes || null;
  if (s24 && e24) {
    const [sh, sm] = s24.split(':').map(Number);
    const [eh, em] = e24.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff <= 0) {
      throw new AppError('End time must be later than start time', 400);
    }
    estimated_minutes = diff;
  }

  let due_date = data.due_date || null;
  if (task_date) {
    due_date = e24 ? `${task_date} ${e24}:00` : `${task_date} 23:59:59`;
  }

  // Automatic status calculation upon creation (no manual status choice in form)
  const autoStatus = deriveTaskStatus({
    task_date,
    start_time: s24,
    end_time: e24,
    status: 'TODO'
  });

  const dbStatus = autoStatus === 'COMPLETED' ? 'COMPLETED' : 'TODO';
  const completed_at = autoStatus === 'COMPLETED' ? new Date() : null;

  const [result] = await pool.query(
    `INSERT INTO tasks 
     (user_id, title, task_date, start_time, end_time, description, priority, status, completed_at, due_date, estimated_minutes, category) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      title.trim(),
      task_date || null,
      s24 || null,
      e24 || null,
      description ? description.trim() : null,
      priority || 'MEDIUM',
      dbStatus,
      completed_at,
      due_date,
      estimated_minutes,
      category || null
    ]
  );

  return this.getTaskById(userId, result.insertId);
};

exports.getTasks = async (userId, filters = {}) => {
  let query = `
    SELECT 
      id, 
      user_id, 
      title, 
      DATE_FORMAT(task_date, '%Y-%m-%d') AS task_date, 
      start_time, 
      end_time, 
      description, 
      priority, 
      status, 
      completed_at, 
      due_date, 
      estimated_minutes, 
      category, 
      created_at, 
      updated_at 
    FROM tasks 
    WHERE user_id = ?
  `;
  const params = [userId];

  if (filters.priority) {
    query += ' AND priority = ?';
    params.push(filters.priority);
  }

  if (filters.date) {
    query += ' AND (task_date = ? OR (task_date IS NULL AND DATE(due_date) = ?))';
    params.push(filters.date, filters.date);
  }

  // Sort: Incomplete tasks first, then by date, start time, created_at
  query += ` ORDER BY 
    CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END ASC,
    COALESCE(task_date, DATE(due_date)) ASC, 
    COALESCE(start_time, '00:00') ASC, 
    created_at DESC`;

  const [tasks] = await pool.query(query, params);
  const formattedTasks = [];

  for (const t of tasks) {
    const formatted = formatTask(t);
    // If auto-completed but DB still has 'TODO', sync back to DB
    if (formatted.status === 'COMPLETED' && t.status !== 'COMPLETED') {
      pool.query(
        "UPDATE tasks SET status = 'COMPLETED', completed_at = COALESCE(completed_at, NOW()) WHERE id = ?",
        [t.id]
      ).catch(() => {});
    }
    formattedTasks.push(formatted);
  }

  // Exactly three filter options: ALL, PENDING, COMPLETED
  if (filters.status) {
    const filterStatus = filters.status.toUpperCase();
    if (filterStatus === 'ALL') {
      return formattedTasks;
    }
    if (filterStatus === 'PENDING') {
      return formattedTasks.filter(t => t.status === 'PENDING');
    }
    if (filterStatus === 'COMPLETED') {
      return formattedTasks.filter(t => t.status === 'COMPLETED');
    }
  }

  return formattedTasks;
};

exports.getTaskById = async (userId, taskId) => {
  const [tasks] = await pool.query(
    `SELECT 
      id, 
      user_id, 
      title, 
      DATE_FORMAT(task_date, '%Y-%m-%d') AS task_date, 
      start_time, 
      end_time, 
      description, 
      priority, 
      status, 
      completed_at, 
      due_date, 
      estimated_minutes, 
      category, 
      created_at, 
      updated_at 
    FROM tasks 
    WHERE id = ? AND user_id = ?`,
    [taskId, userId]
  );

  if (tasks.length === 0) {
    throw new AppError('Task not found', 404);
  }

  return formatTask(tasks[0]);
};

exports.updateTask = async (userId, taskId, data) => {
  const existing = await this.getTaskById(userId, taskId);

  const title = data.title !== undefined ? data.title.trim() : existing.title;
  if (data.title !== undefined && !title) {
    throw new AppError('Task title cannot be empty', 400);
  }

  const task_date = data.task_date !== undefined ? data.task_date : existing.task_date;
  const s24 = data.start_time !== undefined ? normalizeTimeTo24h(data.start_time) : existing.start_time;
  const e24 = data.end_time !== undefined ? normalizeTimeTo24h(data.end_time) : existing.end_time;
  const description = data.description !== undefined ? data.description : existing.description;
  const priority = data.priority !== undefined ? data.priority : existing.priority;
  const category = data.category !== undefined ? data.category : existing.category;

  if (s24 && e24) {
    const [sh, sm] = s24.split(':').map(Number);
    const [eh, em] = e24.split(':').map(Number);
    if (eh * 60 + em <= sh * 60 + sm) {
      throw new AppError('End time must be later than start time', 400);
    }
  }

  let dbStatus = existing.raw_status;
  let completed_at = existing.completed_at;

  // Manual completion toggle from task list
  if (data.status !== undefined) {
    if (data.status === 'COMPLETED' || data.status === true) {
      dbStatus = 'COMPLETED';
      completed_at = new Date();
    } else {
      // Reopening task
      dbStatus = 'TODO';
      completed_at = null;
    }
  } else {
    // If times or date were edited, re-evaluate automatic status
    const autoStatus = deriveTaskStatus({
      task_date,
      start_time: s24,
      end_time: e24,
      status: dbStatus
    });
    if (autoStatus === 'COMPLETED') {
      dbStatus = 'COMPLETED';
      if (!completed_at) completed_at = new Date();
    }
  }

  let estimated_minutes = data.estimated_minutes !== undefined ? data.estimated_minutes : existing.estimated_minutes;
  if (s24 && e24) {
    const [sh, sm] = s24.split(':').map(Number);
    const [eh, em] = e24.split(':').map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    if (diff > 0) estimated_minutes = diff;
  }

  let due_date = data.due_date !== undefined ? data.due_date : existing.due_date;
  if (task_date) {
    due_date = e24 ? `${task_date} ${e24}:00` : `${task_date} 23:59:59`;
  }

  await pool.query(
    `UPDATE tasks SET 
       title = ?, 
       task_date = ?, 
       start_time = ?, 
       end_time = ?, 
       description = ?, 
       priority = ?, 
       status = ?, 
       completed_at = ?, 
       due_date = ?, 
       estimated_minutes = ?, 
       category = ?
     WHERE id = ? AND user_id = ?`,
    [
      title,
      task_date || null,
      s24 || null,
      e24 || null,
      description || null,
      priority || 'MEDIUM',
      dbStatus,
      completed_at,
      due_date || null,
      estimated_minutes || null,
      category || null,
      taskId,
      userId
    ]
  );

  return this.getTaskById(userId, taskId);
};

exports.deleteTask = async (userId, taskId) => {
  const [result] = await pool.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [taskId, userId]);

  if (result.affectedRows === 0) {
    throw new AppError('Task not found', 404);
  }

  return true;
};

exports.normalizeTimeTo24h = normalizeTimeTo24h;
exports.formatTime12h = formatTime12h;
exports.calculateDurationText = calculateDurationText;
exports.deriveTaskStatus = deriveTaskStatus;
