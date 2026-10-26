/**
 * Rule-based fallback scheduler that produces a clean, balanced schedule
 * when AI is unavailable, rate-limited, or unconfigured.
 */
exports.generateFallbackSchedule = (tasks = [], goals = [], habits = [], events = [], preferences = {}, context = {}) => {
  const schedule = [];
  const breaks = [];
  const unscheduled = [];

  const isToday = Boolean(context.is_today);
  const currentTime = context.current_time || '09:00';
  const currH = parseInt(currentTime.split(':')[0], 10);

  const wakeTime = preferences.wake_time ? preferences.wake_time.substring(0, 5) : '06:00';
  const sleepTime = preferences.sleep_time ? preferences.sleep_time.substring(0, 5) : '22:00';
  const workStart = preferences.work_start ? preferences.work_start.substring(0, 5) : '09:00';
  const workEnd = preferences.work_end ? preferences.work_end.substring(0, 5) : '17:00';

  const wakeH = parseInt(wakeTime.split(':')[0], 10);
  const sleepH = parseInt(sleepTime.split(':')[0], 10);
  const workStartH = parseInt(workStart.split(':')[0], 10);
  const workEndH = parseInt(workEnd.split(':')[0], 10);

  // 1. Morning Routine (only if planning for future date or early morning today)
  if (!isToday || currH < wakeH + 1) {
    const morningEndH = Math.min(wakeH + 1, workStartH);
    schedule.push({
      title: 'Morning Awakening & Routine',
      description: 'Hydrate, stretch, healthy breakfast, and mental preparation for the day.',
      start: `${String(wakeH).padStart(2, '0')}:00`,
      end: `${String(morningEndH).padStart(2, '0')}:00`,
      start_time: `${String(wakeH).padStart(2, '0')}:00`,
      end_time: `${String(morningEndH).padStart(2, '0')}:00`,
      type: 'ROUTINE',
      priority: 'HIGH'
    });
  }

  // 2. Habits & Calendar Events
  // If calendar events exist (e.g. Exam, Meeting), map them with top priority
  const eventItems = events.map(evt => {
    let sTime = '14:00';
    let eTime = '15:00';
    try {
      const sDate = new Date(evt.start_time);
      const eDate = new Date(evt.end_time);
      sTime = `${String(sDate.getHours()).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;
      eTime = `${String(eDate.getHours()).padStart(2, '0')}:${String(eDate.getMinutes()).padStart(2, '0')}`;
    } catch {}
    return {
      title: evt.title,
      description: evt.description || 'Fixed calendar commitment.',
      start: sTime,
      end: eTime,
      start_time: sTime,
      end_time: eTime,
      type: 'EVENT',
      priority: 'URGENT'
    };
  });

  if (habits.length > 0 && morningEndH < workStartH) {
    const habit = habits[0];
    schedule.push({
      title: `Daily Habit: ${habit.name}`,
      description: habit.description || 'Consistency building block.',
      start: `${String(morningEndH).padStart(2, '0')}:00`,
      end: `${String(workStartH).padStart(2, '0')}:00`,
      start_time: `${String(morningEndH).padStart(2, '0')}:00`,
      end_time: `${String(workStartH).padStart(2, '0')}:00`,
      type: 'HABIT',
      priority: 'MEDIUM'
    });
  }

  // Include fixed events
  eventItems.forEach(e => schedule.push(e));

  // 3. Work Blocks & Task Scheduling
  const priorityScore = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  const sortedTasks = [...tasks].sort((a, b) => (priorityScore[b.priority] || 2) - (priorityScore[a.priority] || 2));

  let currentH = isToday ? Math.max(workStartH, currH) : workStartH;
  let taskIdx = 0;

  while (currentH < workEndH) {
    // Lunch break at 12:00 or 13:00
    if (currentH === 12 || currentH === 13) {
      schedule.push({
        title: 'Nutritious Lunch & Refresh Break',
        description: 'Step away from screens, nourish, and reset your mental energy.',
        start: `${String(currentH).padStart(2, '0')}:00`,
        end: `${String(currentH + 1).padStart(2, '0')}:00`,
        start_time: `${String(currentH).padStart(2, '0')}:00`,
        end_time: `${String(currentH + 1).padStart(2, '0')}:00`,
        type: 'BREAK',
        priority: 'MEDIUM'
      });
      breaks.push({
        title: 'Lunch Break',
        start_time: `${String(currentH).padStart(2, '0')}:00`,
        end_time: `${String(currentH + 1).padStart(2, '0')}:00`
      });
      currentH += 1;
      continue;
    }

    if (taskIdx < sortedTasks.length) {
      const task = sortedTasks[taskIdx];
      const durationHours = Math.max(1, Math.min(Math.round((task.estimated_minutes || 60) / 60), 2));
      const endH = Math.min(currentH + durationHours, workEndH);

      schedule.push({
        title: task.title,
        description: task.description || 'Focused execution block.',
        start: `${String(currentH).padStart(2, '0')}:00`,
        end: `${String(endH).padStart(2, '0')}:00`,
        start_time: `${String(currentH).padStart(2, '0')}:00`,
        end_time: `${String(endH).padStart(2, '0')}:00`,
        duration_minutes: (endH - currentH) * 60,
        type: 'TASK',
        priority: task.priority || 'MEDIUM',
        task_id: task.id
      });

      taskIdx++;
      currentH = endH;
    } else {
      // Free focus block if no more tasks
      const endH = Math.min(currentH + 2, workEndH);
      schedule.push({
        title: goals.length > 0 ? `Deep Work: ${goals[0].title}` : 'Deep Work & Strategic Learning',
        description: 'Dedicated focus block for high-value strategic objectives.',
        start: `${String(currentH).padStart(2, '0')}:00`,
        end: `${String(endH).padStart(2, '0')}:00`,
        start_time: `${String(currentH).padStart(2, '0')}:00`,
        end_time: `${String(endH).padStart(2, '0')}:00`,
        type: 'FOCUS',
        priority: 'MEDIUM'
      });
      currentH = endH;
    }
  }

  // Record any tasks that didn't fit within working hours
  while (taskIdx < sortedTasks.length) {
    unscheduled.push({
      task_id: sortedTasks[taskIdx].id,
      title: sortedTasks[taskIdx].title,
      reason: 'Carried over to subsequent day due to daily work capacity limit'
    });
    taskIdx++;
  }

  // 4. Evening Wrap-up & Wind-down
  schedule.push({
    title: 'Daily Review & Evening Wind-Down',
    description: 'Review accomplishments, prepare tomorrow priorities, and transition to rest.',
    start: `${String(Math.max(workEndH, sleepH - 2)).padStart(2, '0')}:00`,
    end: `${String(sleepH).padStart(2, '0')}:00`,
    start_time: `${String(Math.max(workEndH, sleepH - 2)).padStart(2, '0')}:00`,
    end_time: `${String(sleepH).padStart(2, '0')}:00`,
    type: 'ROUTINE',
    priority: 'LOW'
  });

  return {
    summary: tasks.length > 0
      ? `Structured plan prioritizing your ${sortedTasks.length} task(s) with dedicated focus windows, lunch, and morning/evening routines.`
      : "Balanced daily flow configured with morning awakening, focus blocks, healthy breaks, and evening review.",
    schedule,
    breaks,
    unscheduled_tasks: unscheduled,
    recommendations: [
      "Tackle your highest priority tasks before lunch when focus is highest.",
      "Protect your restorative breaks to maintain consistent energy throughout the day."
    ]
  };
};
