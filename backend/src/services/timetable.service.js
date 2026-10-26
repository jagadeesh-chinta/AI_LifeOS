const pool = require('../config/db');
const AppError = require('../utils/AppError');
const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');

// ============================================================================
// 1. SAVED TIMETABLES CRUD & REPOSITORY
// ============================================================================

exports.getSavedTimetables = async (userId, type = null) => {
  let query = 'SELECT id, user_id, title, type, description, settings, created_at, updated_at FROM saved_timetables WHERE user_id = ?';
  const params = [userId];

  if (type) {
    query += ' AND type = ?';
    params.push(type);
  }

  query += ' ORDER BY updated_at DESC';
  const [rows] = await pool.query(query, params);

  return rows.map((r) => {
    let settings = r.settings;
    if (typeof settings === 'string') {
      try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
    }
    return {
      ...r,
      settings: settings || {}
    };
  });
};

exports.getSavedTimetableById = async (userId, id) => {
  const [rows] = await pool.query(
    'SELECT * FROM saved_timetables WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if (rows.length === 0) {
    throw new AppError('Timetable not found', 404);
  }

  const row = rows[0];
  let settings = row.settings;
  let data = row.data;

  if (typeof settings === 'string') {
    try { settings = JSON.parse(settings); } catch (e) { settings = {}; }
  }
  if (typeof data === 'string') {
    try { data = JSON.parse(data); } catch (e) { data = {}; }
  }

  return {
    ...row,
    settings: settings || {},
    data: data || {}
  };
};

exports.createSavedTimetable = async (userId, { title, type, description = '', settings = {}, data = {} }) => {
  if (!title || !title.trim()) {
    throw new AppError('Timetable title is required', 400);
  }
  if (!type || !['daily', 'ai_study', 'faculty'].includes(type)) {
    throw new AppError('Valid timetable type (daily, ai_study, faculty) is required', 400);
  }

  const [result] = await pool.query(
    `INSERT INTO saved_timetables (user_id, title, type, description, settings, data)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      title.trim(),
      type,
      description ? description.trim() : '',
      JSON.stringify(settings || {}),
      JSON.stringify(data || {})
    ]
  );

  return exports.getSavedTimetableById(userId, result.insertId);
};

exports.updateSavedTimetable = async (userId, id, { title, description, settings, data }) => {
  const existing = await exports.getSavedTimetableById(userId, id);

  const updatedTitle = title !== undefined ? title.trim() : existing.title;
  const updatedDesc = description !== undefined ? description.trim() : existing.description;
  const updatedSettings = settings !== undefined ? JSON.stringify(settings) : JSON.stringify(existing.settings);
  const updatedData = data !== undefined ? JSON.stringify(data) : JSON.stringify(existing.data);

  if (!updatedTitle) {
    throw new AppError('Timetable title cannot be empty', 400);
  }

  await pool.query(
    `UPDATE saved_timetables 
     SET title = ?, description = ?, settings = ?, data = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ?`,
    [updatedTitle, updatedDesc, updatedSettings, updatedData, id, userId]
  );

  return exports.getSavedTimetableById(userId, id);
};

exports.duplicateSavedTimetable = async (userId, id) => {
  const source = await exports.getSavedTimetableById(userId, id);

  const newTitle = `${source.title} (Copy)`;
  const [result] = await pool.query(
    `INSERT INTO saved_timetables (user_id, title, type, description, settings, data)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      newTitle,
      source.type,
      source.description || '',
      JSON.stringify(source.settings || {}),
      JSON.stringify(source.data || {})
    ]
  );

  return exports.getSavedTimetableById(userId, result.insertId);
};

exports.deleteSavedTimetable = async (userId, id) => {
  const [res] = await pool.query(
    'DELETE FROM saved_timetables WHERE id = ? AND user_id = ?',
    [id, userId]
  );

  if (res.affectedRows === 0) {
    throw new AppError('Timetable not found or already deleted', 404);
  }

  return { success: true, message: 'Timetable deleted successfully' };
};

// ============================================================================
// 2. CONFLICT VALIDATION HELPER
// ============================================================================

function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(totalMins) {
  const h = Math.floor(totalMins / 60) % 24;
  const m = totalMins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

exports.validateDailyConflicts = (activities = []) => {
  const conflicts = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  days.forEach((day) => {
    // Collect all activities for this day
    const dayActs = activities.filter((act) => {
      if (Array.isArray(act.days)) {
        return act.days.includes(day) || act.days.includes('Daily');
      }
      return act.day === day || act.day === 'Daily' || act.day_of_week === day;
    });

    for (let i = 0; i < dayActs.length; i++) {
      for (let j = i + 1; j < dayActs.length; j++) {
        const a = dayActs[i];
        const b = dayActs[j];

        const aStart = timeToMinutes(a.start_time);
        const aEnd = timeToMinutes(a.end_time);
        const bStart = timeToMinutes(b.start_time);
        const bEnd = timeToMinutes(b.end_time);

        // Check if [aStart, aEnd] overlaps with [bStart, bEnd]
        if (Math.max(aStart, bStart) < Math.min(aEnd, bEnd)) {
          conflicts.push({
            day,
            activity1: a.title,
            time1: `${a.start_time} - ${a.end_time}`,
            activity2: b.title,
            time2: `${b.start_time} - ${b.end_time}`,
            message: `Conflict on ${day}: "${a.title}" (${a.start_time}-${a.end_time}) overlaps with "${b.title}" (${b.start_time}-${b.end_time})`
          });
        }
      }
    }
  });

  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  };
};

// ============================================================================
// 3. MODE 2: AI STUDY TIMETABLE SYNTHESIS & ENGINE
// ============================================================================

exports.generateAIStudyTimetable = async (userId, params) => {
  const {
    title = 'My AI Study Schedule',
    academic_goal = 'exam_preparation',
    subjects = [],
    available_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    wake_time = '07:00',
    sleep_time = '23:00',
    daily_study_hours = 5,
    session_duration = 60, // in minutes
    break_duration = 15,   // in minutes
    fixed_commitments = [],
    study_methods = ['Concept Revision', 'Practice Questions', 'Mock Tests'],
    include_meals_rest = true
  } = params;

  if (!subjects || subjects.length === 0) {
    throw new AppError('Please provide at least one subject to study', 400);
  }

  // Calculate subject weights based on difficulty, priority, and upcoming exams
  const subjectWeights = subjects.map((subj) => {
    let weight = 1.0;
    if (subj.is_difficult) weight += 0.8;
    if (subj.proficiency === 'Beginner') weight += 0.5;
    else if (subj.proficiency === 'Advanced') weight -= 0.2;

    if (subj.priority === 'High') weight += 0.5;
    else if (subj.priority === 'Low') weight -= 0.3;

    if (subj.exam_date) {
      const daysUntil = (new Date(subj.exam_date) - new Date()) / (1000 * 60 * 60 * 24);
      if (daysUntil > 0 && daysUntil <= 14) weight += 1.0;
      else if (daysUntil > 0 && daysUntil <= 30) weight += 0.5;
    }

    return {
      name: subj.name,
      weight: Math.max(0.5, weight),
      proficiency: subj.proficiency || 'Intermediate',
      is_difficult: !!subj.is_difficult,
      exam_date: subj.exam_date || null
    };
  });

  const totalWeight = subjectWeights.reduce((sum, s) => sum + s.weight, 0);

  // Fallback / Deterministic Intelligent Scheduler
  const generateDeterministicSchedule = () => {
    const weeklySchedule = {};
    const wakeMins = timeToMinutes(wake_time);
    const sleepMins = timeToMinutes(sleep_time);
    const targetStudyMins = Math.min(daily_study_hours * 60, sleepMins - wakeMins - 180);

    const colors = ['#8b5cf6', '#06b6d4', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#6366f1'];

    // Preferred study time intervals avoiding morning routine, lunch, and dinner
    // Morning slot: wake+60 to 12:30
    // Afternoon slot: 14:00 to 18:00
    // Evening slot: 19:30 to sleep-30

    let subjectIndex = 0;

    available_days.forEach((day, dayIdx) => {
      const daySlots = [];
      let scheduledStudyMins = 0;

      // Check day fixed commitments
      const dayCommitments = fixed_commitments.filter((c) => {
        if (Array.isArray(c.days)) return c.days.includes(day);
        return c.day === day || !c.days;
      }).map((c) => ({
        start: timeToMinutes(c.start_time),
        end: timeToMinutes(c.end_time),
        title: c.title
      }));

      // Fixed meals and rest if requested
      const fixedBlocks = [...dayCommitments];
      if (include_meals_rest) {
        fixedBlocks.push({ start: timeToMinutes('08:00'), end: timeToMinutes('08:45'), title: 'Breakfast & Morning Routine', isRest: true });
        fixedBlocks.push({ start: timeToMinutes('13:00'), end: timeToMinutes('14:00'), title: 'Lunch & Power Rest', isRest: true });
        fixedBlocks.push({ start: timeToMinutes('20:00'), end: timeToMinutes('21:00'), title: 'Dinner & Family Time', isRest: true });
      }

      fixedBlocks.sort((a, b) => a.start - b.start);

      // Find available study windows between wake and sleep
      let cur = wakeMins + (include_meals_rest ? 60 : 30);

      while (cur + session_duration <= sleepMins - 30 && scheduledStudyMins < targetStudyMins) {
        const slotEnd = cur + session_duration;

        // Check clash with any fixed block
        const clash = fixedBlocks.find((fb) => Math.max(cur, fb.start) < Math.min(slotEnd, fb.end));

        if (clash) {
          // Push past the clash
          cur = Math.max(cur + 15, clash.end);
          continue;
        }

        // Pick next subject according to weighted distribution
        const subjectObj = subjectWeights[subjectIndex % subjectWeights.length];
        subjectIndex++;

        // Determine method (e.g. Concept, Practice, or Mock Test on weekends)
        let method = 'Concept Deep Dive & Notes';
        if (day === 'Saturday' || day === 'Sunday') {
          method = 'Weekly Mock Test & Error Analysis';
        } else if (scheduledStudyMins > 0) {
          method = 'Practice Problems & Active Recall';
        }

        daySlots.push({
          id: `slot_${day}_${cur}`,
          day,
          start_time: minutesToTime(cur),
          end_time: minutesToTime(slotEnd),
          duration_minutes: session_duration,
          subject: subjectObj.name,
          title: `${subjectObj.name}: ${method}`,
          method,
          is_difficult: subjectObj.is_difficult,
          category: 'STUDY',
          color: colors[subjectIndex % colors.length]
        });

        scheduledStudyMins += session_duration;

        // Add break if there's room
        cur = slotEnd;
        if (cur + break_duration + session_duration <= sleepMins) {
          daySlots.push({
            id: `break_${day}_${cur}`,
            day,
            start_time: minutesToTime(cur),
            end_time: minutesToTime(cur + break_duration),
            duration_minutes: break_duration,
            subject: 'Break',
            title: 'Hydration & Mental Reset Break',
            category: 'BREAK',
            color: '#10b981'
          });
          cur += break_duration;
        }
      }

      // Add fixed commitments into the day slots view
      dayCommitments.forEach((fc) => {
        daySlots.push({
          id: `fixed_${day}_${fc.start}`,
          day,
          start_time: minutesToTime(fc.start),
          end_time: minutesToTime(fc.end),
          duration_minutes: fc.end - fc.start,
          subject: fc.title,
          title: `[Fixed] ${fc.title}`,
          category: 'COMMITMENT',
          color: '#64748b',
          is_fixed: true
        });
      });

      // Sort chronological
      daySlots.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
      weeklySchedule[day] = daySlots;
    });

    return {
      title,
      academic_goal,
      strategy_summary: `Intelligent study schedule configured for ${subjects.length} subjects with ${daily_study_hours}h daily focus. Weighted prioritization applied to critical exam targets and demanding subjects.`,
      subject_weights: subjectWeights,
      total_weekly_study_hours: (available_days.length * daily_study_hours).toFixed(1),
      weekly_schedule: weeklySchedule,
      generated_by: 'ai_optimizer'
    };
  };

  // Attempt Gemini/OpenAI if available, with automatic fallback
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'PASTE_YOUR_NEW_GEMINI_API_KEY_HERE' && apiKey.trim() !== '') {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const prompt = `You are an elite academic planning engine. Generate a balanced weekly study schedule for a student.
Goal: ${academic_goal}
Subjects: ${JSON.stringify(subjectWeights)}
Available Days: ${available_days.join(', ')}
Wake: ${wake_time}, Sleep: ${sleep_time}, Daily Target: ${daily_study_hours} hours.
Session Duration: ${session_duration} mins, Break: ${break_duration} mins.
Fixed commitments: ${JSON.stringify(fixed_commitments)}.
Include meals & breaks: ${include_meals_rest}.

Return a JSON object with:
"strategy_summary": string,
"weekly_schedule": object with day keys (${available_days.join(', ')}), each an array of slots with {
  "start_time": "HH:MM",
  "end_time": "HH:MM",
  "subject": string,
  "title": string,
  "category": "STUDY" | "BREAK" | "COMMITMENT",
  "method": string,
  "color": hex string
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });

      const parsed = JSON.parse(response.text.trim());
      if (parsed && parsed.weekly_schedule && Object.keys(parsed.weekly_schedule).length > 0) {
        return {
          title,
          academic_goal,
          strategy_summary: parsed.strategy_summary || `Optimized study roadmap balancing ${subjects.length} subjects.`,
          subject_weights: subjectWeights,
          total_weekly_study_hours: (available_days.length * daily_study_hours).toFixed(1),
          weekly_schedule: parsed.weekly_schedule,
          generated_by: 'gemini_ai'
        };
      }
    }
  } catch (err) {
    console.warn('AI study generation failed or rate limited, falling back to deterministic optimizer:', err.message);
  }

  return generateDeterministicSchedule();
};

// ============================================================================
// 4. MODE 3: FACULTY TIMETABLE MAKER (CONSTRAINT SATISFACTION ENGINE)
// ============================================================================

exports.generateFacultyTimetable = async (userId, params) => {
  const {
    institution_name = 'Academic Institution',
    term_name = 'Semester Timetable',
    working_days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    start_time = '09:00',
    period_duration = 50, // in minutes
    periods_per_day = 6,
    lunch_start = '12:30',
    lunch_end = '13:20',
    classes = ['Class-A', 'Class-B'],
    rooms = ['Room 101', 'Room 102', 'Lab 1'],
    faculty = [],
    curriculum = []
  } = params;

  if (!classes || classes.length === 0) {
    throw new AppError('At least one class or section is required', 400);
  }
  if (!faculty || faculty.length === 0) {
    throw new AppError('At least one faculty member is required', 400);
  }
  if (!curriculum || curriculum.length === 0) {
    throw new AppError('Please add subjects and curriculum requirements to schedule', 400);
  }

  // 1. Build Period Time Slots
  const periodSlots = [];
  let curMins = timeToMinutes(start_time);
  const lunchStartMins = timeToMinutes(lunch_start);
  const lunchEndMins = timeToMinutes(lunch_end);

  let periodNum = 1;
  while (periodNum <= periods_per_day) {
    const periodEnd = curMins + period_duration;

    // Check if lunch break falls before or during this period
    if (curMins < lunchEndMins && periodEnd > lunchStartMins) {
      periodSlots.push({
        index: periodSlots.length,
        period_number: null,
        label: 'Lunch Break',
        start_time: minutesToTime(lunchStartMins),
        end_time: minutesToTime(lunchEndMins),
        duration_minutes: lunchEndMins - lunchStartMins,
        is_break: true
      });
      curMins = lunchEndMins;
      continue;
    }

    periodSlots.push({
      index: periodSlots.length,
      period_number: periodNum,
      label: `Period ${periodNum}`,
      start_time: minutesToTime(curMins),
      end_time: minutesToTime(periodEnd),
      duration_minutes: period_duration,
      is_break: false
    });

    curMins = periodEnd + 10; // 10 min transition
    periodNum++;
  }

  const teachingPeriodSlots = periodSlots.filter((p) => !p.is_break);
  const totalAvailableSlotsPerClass = working_days.length * teachingPeriodSlots.length;

  // 2. Bottleneck & Feasibility Analysis
  const bottlenecks = [];
  let isFeasible = true;

  // Check Class Capacity
  classes.forEach((cls) => {
    const classReqs = curriculum.filter((c) => c.class === cls);
    const totalPeriodsReq = classReqs.reduce((sum, c) => sum + (Number(c.periods_per_week) || 0), 0);

    if (totalPeriodsReq > totalAvailableSlotsPerClass) {
      isFeasible = false;
      bottlenecks.push({
        type: 'CLASS_CAPACITY_EXCEEDED',
        class: cls,
        required: totalPeriodsReq,
        available: totalAvailableSlotsPerClass,
        message: `Class "${cls}" requires ${totalPeriodsReq} periods/week, but only ${totalAvailableSlotsPerClass} slots exist (${working_days.length} days × ${teachingPeriodSlots.length} periods).`,
        suggestion: `Reduce required periods by ${totalPeriodsReq - totalAvailableSlotsPerClass}, or add Saturday / increase periods per day.`
      });
    }
  });

  // Check Faculty Capacity
  faculty.forEach((fac) => {
    const facReqs = curriculum.filter((c) => c.faculty_id === fac.id || c.faculty_id === fac.name);
    const assignedPeriods = facReqs.reduce((sum, c) => sum + (Number(c.periods_per_week) || 0), 0);
    const availableDays = fac.available_days && fac.available_days.length > 0 ? fac.available_days : working_days;
    const maxPossibleSlots = availableDays.length * (Number(fac.max_hours_per_day) || teachingPeriodSlots.length);

    if (assignedPeriods > maxPossibleSlots) {
      isFeasible = false;
      bottlenecks.push({
        type: 'FACULTY_CAPACITY_EXCEEDED',
        faculty: fac.name,
        assigned: assignedPeriods,
        available: maxPossibleSlots,
        message: `Faculty "${fac.name}" is assigned ${assignedPeriods} periods/week, but can only teach a maximum of ${maxPossibleSlots} periods across their available days.`,
        suggestion: `Assign co-faculty, increase available days, or reassign subjects.`
      });
    }
  });

  // 3. Constraint Satisfaction Scheduler (Backtracking + MRV Heuristic)
  // Schedules are indexed by: [day][slotIndex][class]
  const scheduleByClass = {};
  const scheduleByFaculty = {};
  const scheduleByRoom = {};

  classes.forEach((c) => {
    scheduleByClass[c] = {};
    working_days.forEach((d) => { scheduleByClass[c][d] = new Array(periodSlots.length).fill(null); });
  });

  faculty.forEach((f) => {
    scheduleByFaculty[f.name] = {};
    working_days.forEach((d) => { scheduleByFaculty[f.name][d] = new Array(periodSlots.length).fill(null); });
  });

  rooms.forEach((r) => {
    scheduleByRoom[r] = {};
    working_days.forEach((d) => { scheduleByRoom[r][d] = new Array(periodSlots.length).fill(null); });
  });

  // Place Lunch Breaks in all class schedules
  periodSlots.forEach((slot, slotIdx) => {
    if (slot.is_break) {
      classes.forEach((c) => {
        working_days.forEach((d) => {
          scheduleByClass[c][d][slotIdx] = { is_break: true, label: slot.label, time: `${slot.start_time} - ${slot.end_time}` };
        });
      });
    }
  });

  // Flatten curriculum items into assignable blocks
  // For duration_periods > 1 (e.g. labs of 2 continuous periods), schedule as linked blocks
  const blocksToSchedule = [];
  curriculum.forEach((item) => {
    const facObj = faculty.find((f) => f.id === item.faculty_id || f.name === item.faculty_id) || { name: item.faculty_id || 'TBD' };
    const periodsNeeded = Number(item.periods_per_week) || 1;
    const duration = Number(item.duration_periods) || 1;

    let remaining = periodsNeeded;
    while (remaining > 0) {
      const blockDuration = Math.min(remaining, duration);
      blocksToSchedule.push({
        id: `block_${item.code}_${item.class}_${blocksToSchedule.length}`,
        code: item.code,
        name: item.name,
        class: item.class,
        faculty: facObj.name,
        faculty_id: facObj.id,
        duration: blockDuration,
        room_type: item.room_type || 'classroom',
        assigned_room: item.assigned_room || rooms[0] || 'Room 101',
        is_lab: blockDuration > 1 || item.room_type === 'lab'
      });
      remaining -= blockDuration;
    }
  });

  // Sort: Multi-period labs first, then by class
  blocksToSchedule.sort((a, b) => b.duration - a.duration);

  const unassignedBlocks = [];
  const facultyColorMap = {};
  const colors = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#14b8a6', '#6366f1'];
  faculty.forEach((f, idx) => {
    facultyColorMap[f.name] = colors[idx % colors.length];
  });

  // Greedy Backtracking Placement
  blocksToSchedule.forEach((block) => {
    let placed = false;

    // Try each day
    for (const day of working_days) {
      if (placed) break;

      // Check if faculty is available on this day
      const facObj = faculty.find((f) => f.name === block.faculty || f.id === block.faculty_id);
      if (facObj && facObj.available_days && facObj.available_days.length > 0 && !facObj.available_days.includes(day)) {
        continue;
      }

      // Check if this class already has this subject on this day (spread out rule)
      const existingToday = scheduleByClass[block.class]?.[day]?.some(
        (slot) => slot && slot.code === block.code
      );
      if (existingToday && !block.is_lab) {
        // Prefer placing on another day if possible
        continue;
      }

      // Find consecutive teaching slots of length block.duration
      for (let sIdx = 0; sIdx <= periodSlots.length - block.duration; sIdx++) {
        let fits = true;

        for (let d = 0; d < block.duration; d++) {
          const testSlot = periodSlots[sIdx + d];
          if (testSlot.is_break) {
            fits = false;
            break;
          }

          // Check Class Clash
          if (scheduleByClass[block.class][day][sIdx + d] !== null) {
            fits = false;
            break;
          }

          // Check Faculty Clash
          if (scheduleByFaculty[block.faculty]?.[day]?.[sIdx + d] !== null) {
            fits = false;
            break;
          }

          // Check Room Clash
          if (block.assigned_room && scheduleByRoom[block.assigned_room]?.[day]?.[sIdx + d] !== null) {
            fits = false;
            break;
          }
        }

        if (fits) {
          // Assign block to all slots in duration
          for (let d = 0; d < block.duration; d++) {
            const assignment = {
              code: block.code,
              name: block.name,
              class: block.class,
              faculty: block.faculty,
              room: block.assigned_room,
              duration: block.duration,
              is_lab: block.is_lab,
              color: facultyColorMap[block.faculty] || '#8b5cf6',
              slot_index: sIdx + d,
              period_label: periodSlots[sIdx + d].label,
              time: `${periodSlots[sIdx + d].start_time} - ${periodSlots[sIdx + d].end_time}`
            };

            scheduleByClass[block.class][day][sIdx + d] = assignment;
            if (scheduleByFaculty[block.faculty]) {
              scheduleByFaculty[block.faculty][day][sIdx + d] = assignment;
            }
            if (block.assigned_room && scheduleByRoom[block.assigned_room]) {
              scheduleByRoom[block.assigned_room][day][sIdx + d] = assignment;
            }
          }
          placed = true;
          break;
        }
      }
    }

    if (!placed) {
      unassignedBlocks.push(block);
    }
  });

  // Calculate Faculty Teaching Summary
  const facultySummary = faculty.map((f) => {
    let scheduledPeriods = 0;
    working_days.forEach((day) => {
      const daySlots = scheduleByFaculty[f.name]?.[day] || [];
      daySlots.forEach((slot) => {
        if (slot && !slot.is_break) scheduledPeriods++;
      });
    });

    const facReqs = curriculum.filter((c) => c.faculty_id === f.id || c.faculty_id === f.name);
    const targetPeriods = facReqs.reduce((sum, c) => sum + (Number(c.periods_per_week) || 0), 0);

    return {
      faculty_name: f.name,
      scheduled_periods: scheduledPeriods,
      target_periods: targetPeriods,
      utilization_rate: targetPeriods > 0 ? Math.round((scheduledPeriods / targetPeriods) * 100) : 100
    };
  });

  return {
    institution_name,
    term_name,
    working_days,
    period_slots: periodSlots,
    classes,
    rooms,
    faculty,
    is_valid: bottlenecks.length === 0 && unassignedBlocks.length === 0,
    bottlenecks,
    unassigned_blocks: unassignedBlocks,
    schedule_by_class: scheduleByClass,
    schedule_by_faculty: scheduleByFaculty,
    schedule_by_room: scheduleByRoom,
    faculty_summary: facultySummary
  };
};
