/**
 * Validates, reconciles, and cleans schedule items against real database records.
 * STRICT REQUIREMENT: Fixed commitments (tasks with explicit start_time and events)
 * MUST NEVER be shifted, moved, shortened, or duplicated.
 */

function parseTimeToMinutes(timeStr) {
  if (!timeStr) return null;
  const s = timeStr.toString().trim().toUpperCase();

  // 12-hour AM/PM: e.g. "2:00 PM", "02:00 PM", "9:30 AM"
  const match12 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const ampm = match12[3];
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // 24-hour: e.g. "14:00", "09:30", "14:00:00"
  const match24 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = parseInt(match24[2], 10);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  // ISO / DateTime format
  const matchIso = s.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (matchIso) {
    const hours = parseInt(matchIso[1], 10);
    const minutes = parseInt(matchIso[2], 10);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return hours * 60 + minutes;
    }
  }

  return null;
}

function formatMinutesToTime(totalMinutes) {
  const clamped = Math.max(0, Math.min(totalMinutes, 1439));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function formatMinutesTo12h(totalMinutes) {
  const clamped = Math.max(0, Math.min(totalMinutes, 1439));
  let hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

function formatTimeRange(startM, endM) {
  const s = formatMinutesTo12h(startM);
  const e = formatMinutesTo12h(endM);
  return s === e ? s : `${s} – ${e}`;
}

exports.validateAndReconcileSchedule = (rawSchedule, realTasks = [], realEvents = [], preferences = {}, context = {}) => {
  if (!rawSchedule || typeof rawSchedule !== 'object') {
    throw new Error('Invalid schedule structure: expected object');
  }

  const isToday = Boolean(context.is_today);
  const currentM = context.current_time ? parseTimeToMinutes(context.current_time) : null;

  const rawItems = Array.isArray(rawSchedule.schedule) ? rawSchedule.schedule : [];
  const validTaskMap = new Map();
  realTasks.forEach(t => validTaskMap.set(Number(t.id), t));

  // Identify all real fixed commitments from tasks and events
  const lockedCommitments = [];
  const conflicts = Array.isArray(rawSchedule.conflicts) ? [...rawSchedule.conflicts] : [];

  // 1. Real tasks with explicit start_time
  realTasks.forEach(t => {
    if (t.start_time) {
      const sM = parseTimeToMinutes(t.start_time);
      let eM = parseTimeToMinutes(t.end_time);
      if (sM !== null) {
        if (eM === null || eM <= sM) {
          const dur = t.estimated_minutes && t.estimated_minutes > 0 ? t.estimated_minutes : 60;
          eM = Math.min(sM + dur, 1439);
        }
        lockedCommitments.push({
          task_id: Number(t.id),
          title: t.title,
          description: t.description || 'User fixed commitment',
          startM: sM,
          endM: eM,
          priority: t.priority || 'HIGH',
          category: t.category || 'TASK',
          is_fixed: true,
          activity_type: 'FIXED_COMMITMENT'
        });
      }
    }
  });

  // 2. Real events
  realEvents.forEach(evt => {
    let sM = parseTimeToMinutes(evt.start_time);
    let eM = parseTimeToMinutes(evt.end_time);
    if (sM !== null) {
      if (eM === null || eM <= sM) {
        eM = Math.min(sM + 60, 1439);
      }
      lockedCommitments.push({
        task_id: null,
        title: evt.title,
        description: evt.description || `Fixed event: ${evt.event_type || 'Calendar'}`,
        startM: sM,
        endM: eM,
        priority: 'URGENT',
        category: evt.event_type || 'EVENT',
        is_fixed: true,
        activity_type: 'FIXED_COMMITMENT'
      });
    }
  });

  // Check for internal overlaps among locked commitments
  for (let i = 0; i < lockedCommitments.length; i++) {
    for (let j = i + 1; j < lockedCommitments.length; j++) {
      const c1 = lockedCommitments[i];
      const c2 = lockedCommitments[j];
      if (c1.startM < c2.endM && c2.startM < c1.endM) {
        conflicts.push({
          type: 'OVERLAPPING_FIXED_COMMITMENTS',
          title_a: c1.title,
          title_b: c2.title,
          time_a: formatTimeRange(c1.startM, c1.endM),
          time_b: formatTimeRange(c2.startM, c2.endM),
          message: `Conflicting commitments: '${c1.title}' (${formatMinutesTo12h(c1.startM)}) overlaps with '${c2.title}' (${formatMinutesTo12h(c2.startM)}). Both are preserved.`
        });
      }
    }
  }

  // Build the list of final items
  const finalItems = [];
  const scheduledTaskIds = new Set();

  // First, always insert all locked commitments at their EXACT times
  lockedCommitments.forEach(lc => {
    finalItems.push({
      title: lc.title,
      description: lc.description,
      start_time: formatMinutesToTime(lc.startM),
      end_time: formatMinutesToTime(lc.endM),
      start: formatMinutesToTime(lc.startM),
      end: formatMinutesToTime(lc.endM),
      time_range: formatTimeRange(lc.startM, lc.endM),
      duration_minutes: lc.endM - lc.startM,
      type: 'TASK',
      activity_type: 'FIXED_COMMITMENT',
      is_fixed: true,
      priority: lc.priority,
      task_id: lc.task_id,
      startM: lc.startM,
      endM: lc.endM
    });
    if (lc.task_id) scheduledTaskIds.add(lc.task_id);
  });

  // Next, process non-fixed items from rawSchedule
  for (const item of rawItems) {
    if (!item || !item.title) continue;

    // If this item represents an already added locked commitment, skip to prevent duplicates
    if (item.task_id && scheduledTaskIds.has(Number(item.task_id))) {
      continue;
    }

    // Check if title matches a locked commitment
    if (lockedCommitments.some(lc => lc.title.trim().toLowerCase() === String(item.title).trim().toLowerCase() && lc.startM === parseTimeToMinutes(item.start_time || item.start))) {
      continue;
    }

    let startM = parseTimeToMinutes(item.start_time || item.start);
    let endM = parseTimeToMinutes(item.end_time || item.end);

    if (startM === null || endM === null || endM <= startM) {
      continue;
    }

    // Exclude any NEW flexible slot whose end time has already passed today
    if (isToday && currentM !== null && !item.is_fixed && endM <= currentM) {
      continue;
    }

    let taskId = null;
    let validatedPriority = item.priority || 'MEDIUM';
    if (item.task_id && validTaskMap.has(Number(item.task_id))) {
      taskId = Number(item.task_id);
      validatedPriority = validTaskMap.get(taskId).priority || validatedPriority;
      scheduledTaskIds.add(taskId);
    }

    // Verify non-fixed item does NOT overlap any locked commitment
    let hasConflictWithLocked = false;
    for (const lc of lockedCommitments) {
      if (startM < lc.endM && lc.startM < endM) {
        hasConflictWithLocked = true;
        break;
      }
    }

    if (hasConflictWithLocked) {
      // If it overlaps a locked commitment, do NOT move the locked commitment!
      // Truncate or drop the suggested activity
      continue;
    }

    // Determine status
    let status = 'UPCOMING';
    if (item.completed) {
      status = 'COMPLETED';
    } else if (isToday && currentM !== null) {
      if (endM < currentM) {
        status = 'MISSED';
      } else if (startM <= currentM && currentM <= endM) {
        status = 'IN_PROGRESS';
      } else {
        status = 'UPCOMING';
      }
    }

    finalItems.push({
      title: String(item.title).trim(),
      description: item.description || '',
      start_time: formatMinutesToTime(startM),
      end_time: formatMinutesToTime(endM),
      start: formatMinutesToTime(startM),
      end: formatMinutesToTime(endM),
      time_range: item.time_range || formatTimeRange(startM, endM),
      duration_minutes: endM - startM,
      type: item.type || (taskId ? 'TASK' : 'ROUTINE'),
      activity_type: item.activity_type || 'AI_SUGGESTION',
      is_fixed: false,
      priority: validatedPriority,
      task_id: taskId,
      completed: Boolean(item.completed),
      status: status,
      startM,
      endM
    });
  }

  // Also tag status for locked commitments
  for (const item of finalItems) {
    if (item.is_fixed) {
      if (item.completed) {
        item.status = 'COMPLETED';
      } else if (isToday && currentM !== null) {
        if (item.endM < currentM) {
          item.status = 'MISSED';
        } else if (item.startM <= currentM && currentM <= item.endM) {
          item.status = 'IN_PROGRESS';
        } else {
          item.status = 'UPCOMING';
        }
      } else {
        item.status = 'UPCOMING';
      }
    }
  }

  // Sort chronologically by startM
  finalItems.sort((a, b) => a.startM - b.startM);


  // Identify any unscheduled tasks
  const unscheduledTasks = [];
  if (Array.isArray(rawSchedule.unscheduled_tasks)) {
    rawSchedule.unscheduled_tasks.forEach(ut => {
      if (ut && ut.task_id && validTaskMap.has(Number(ut.task_id))) {
        unscheduledTasks.push({
          task_id: Number(ut.task_id),
          title: validTaskMap.get(Number(ut.task_id)).title,
          reason: ut.reason || 'Insufficient available time in current day schedule'
        });
      }
    });
  }

  realTasks.forEach(task => {
    if (!scheduledTaskIds.has(task.id) && !unscheduledTasks.some(u => u.task_id === task.id)) {
      unscheduledTasks.push({
        task_id: task.id,
        title: task.title,
        reason: 'Carried over due to time capacity limits'
      });
    }
  });

  return {
    date: rawSchedule.date || new Date().toISOString().split('T')[0],
    summary: rawSchedule.summary || 'Personalized schedule generated for your day.',
    schedule: finalItems,
    breaks: Array.isArray(rawSchedule.breaks) ? rawSchedule.breaks : [],
    unscheduled_tasks: unscheduledTasks,
    recommendations: Array.isArray(rawSchedule.recommendations) ? rawSchedule.recommendations : [],
    conflicts: conflicts,
    generated_by_ai: rawSchedule.generated_by_ai ?? true,
    ai_provider: rawSchedule.ai_provider || 'hybrid'
  };
};
