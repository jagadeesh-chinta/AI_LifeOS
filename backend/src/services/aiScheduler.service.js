const pythonBridge = require('./pythonBridge.service');
const geminiService = require('./gemini.service');
const aiProvider = require('./aiProvider.service');
const fallbackScheduler = require('./fallbackScheduler.service');
const scheduleValidator = require('./scheduleValidator.service');
const pool = require('../config/db');

exports.generateSchedule = async (userId, date) => {
  const scheduleDate = date || new Date().toISOString().split('T')[0];

  // 1. Retrieve all scoped data for authenticated user only
  const [tasks] = await pool.query(
    `SELECT id, title, description, priority, status, 
            DATE_FORMAT(task_date, '%Y-%m-%d') as task_date, 
            start_time, end_time, due_date, estimated_minutes, category 
     FROM tasks 
     WHERE user_id = ? 
       AND status != 'COMPLETED' 
       AND (task_date = ? OR (task_date IS NULL AND (due_date IS NULL OR DATE(due_date) = ?)))
     ORDER BY COALESCE(task_date, DATE(due_date)) ASC, start_time ASC`,
    [userId, scheduleDate, scheduleDate]
  );
  const [goals] = await pool.query(
    "SELECT id, title, description, target_date, priority, progress, status FROM goals WHERE user_id = ? AND status != 'COMPLETED'",
    [userId]
  );
  const [habits] = await pool.query(
    "SELECT id, name, description, frequency, target_count, preferred_time FROM habits WHERE user_id = ?",
    [userId]
  );
  const [events] = await pool.query(
    "SELECT id, title, description, start_time, end_time, event_type, location FROM events WHERE user_id = ? AND DATE(start_time) = ? ORDER BY start_time ASC",
    [userId, scheduleDate]
  );
  const [preferences] = await pool.query(
    "SELECT * FROM user_preferences WHERE user_id = ?",
    [userId]
  );
  const [users] = await pool.query(
    "SELECT timezone FROM users WHERE id = ?",
    [userId]
  );

  const prefs = preferences.length > 0 ? preferences[0] : {};
  // Requirement: Use Asia/Kolkata when the user's timezone is India, unless their saved timezone specifies otherwise
  let userTimezone = users.length > 0 && users[0].timezone ? users[0].timezone : (prefs.timezone || 'Asia/Kolkata');
  if (!userTimezone || userTimezone === 'UTC') {
    userTimezone = 'Asia/Kolkata';
  }

  // Obtain current date and time in user's configured timezone
  const now = new Date();
  let todayDateStr = scheduleDate;
  let currentTimeStr = '10:00';
  try {
    todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: userTimezone }).format(now);
    const timeParts = now.toLocaleTimeString('en-GB', { timeZone: userTimezone, hour12: false });
    currentTimeStr = timeParts.substring(0, 5); // "HH:MM"
  } catch (tzErr) {
    console.warn('Timezone calculation error, defaulting to Asia/Kolkata:', tzErr.message);
    todayDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
    currentTimeStr = now.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false }).substring(0, 5);
  }

  const isToday = (scheduleDate === todayDateStr);

  const context = {
    date: scheduleDate,
    timezone: userTimezone,
    current_time: currentTimeStr,
    is_today: isToday,
    preferences: prefs,
    tasks: tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      task_date: t.task_date || (t.due_date ? new Date(t.due_date).toLocaleDateString('en-CA') : null),
      due_date: t.task_date || (t.due_date ? new Date(t.due_date).toLocaleDateString('en-CA') : null),
      start_time: t.start_time,
      end_time: t.end_time,
      estimated_minutes: t.estimated_minutes || 60,
      category: t.category
    })),
    goals: goals.map(g => ({
      id: g.id,
      title: g.title,
      progress: g.progress,
      priority: g.priority
    })),
    habits: habits.map(h => ({
      id: h.id,
      name: h.name,
      frequency: h.frequency,
      preferred_time: h.preferred_time
    })),
    events: events.map(e => ({
      id: e.id,
      title: e.title,
      start_time: e.start_time,
      end_time: e.end_time,
      event_type: e.event_type
    }))
  };

  let rawSchedule = null;
  let generatedByAi = false;
  let providerUsed = 'rule_based_fallback';

  // 2. Primary: Invoke Python Hybrid Scheduling Engine (OpenAI + Gemini + Deterministic Constraint Scheduling)
  try {
    const pyResult = await pythonBridge.generateScheduleWithPython(context);
    if (pyResult && pyResult.success && Array.isArray(pyResult.schedule)) {
      rawSchedule = pyResult;
      generatedByAi = pyResult.generated_by_ai ?? true;
      providerUsed = pyResult.ai_provider || 'hybrid';
    }
  } catch (pyError) {
    console.warn('Python hybrid scheduler error, falling back to Node AI services:', pyError.message);
  }

  // 3. Fallback to Gemini if Python was unavailable
  if (!rawSchedule || !rawSchedule.schedule || rawSchedule.schedule.length === 0) {
    const geminiKey = process.env.GEMINI_API_KEY;
    const isGeminiConfigured = geminiKey && geminiKey !== 'PASTE_YOUR_NEW_GEMINI_API_KEY_HERE' && geminiKey.trim() !== '';

    if (isGeminiConfigured) {
      try {
        rawSchedule = await geminiService.generateScheduleWithGemini(context);
        generatedByAi = true;
        providerUsed = 'gemini';
      } catch (geminiError) {
        console.warn('Gemini scheduling failed:', geminiError.message);
      }
    }
  }

  // 4. Fallback to OpenAI direct if configured
  if (!rawSchedule || !rawSchedule.schedule || rawSchedule.schedule.length === 0) {
    const openAiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
    if (openAiKey && !openAiKey.startsWith('your_')) {
      try {
        const prompt = `Generate realistic daily schedule in JSON for ${scheduleDate}. Current Time: ${currentTimeStr}, is_today: ${isToday}. Tasks: ${JSON.stringify(context.tasks)}, Events: ${JSON.stringify(context.events)}. Prioritize actual tasks and pre-commitment preparation (e.g. for interview/exam). Do NOT generate past slots for today.`;
        rawSchedule = await aiProvider.callAI(prompt);
        generatedByAi = true;
        providerUsed = 'openai';
      } catch (openAiError) {
        console.warn('OpenAI direct failed:', openAiError.message);
      }
    }
  }

  // 5. Final fallback to deterministic rule-based scheduler
  if (!rawSchedule || !rawSchedule.schedule || rawSchedule.schedule.length === 0) {
    rawSchedule = fallbackScheduler.generateFallbackSchedule(tasks, goals, habits, events, prefs, context);
    generatedByAi = false;
    providerUsed = 'rule_based_fallback';
  }

  // 6. Enforce rigorous validation and exact-time preservation
  const validatedSchedule = scheduleValidator.validateAndReconcileSchedule(
    rawSchedule,
    tasks,
    events,
    prefs,
    context
  );

  return {
    success: true,
    data: validatedSchedule,
    generated_by_ai: generatedByAi,
    ai_provider: providerUsed,
    date: scheduleDate
  };
};

exports.parseNaturalLanguage = async (text) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const isGeminiConfigured = geminiKey && geminiKey !== 'PASTE_YOUR_NEW_GEMINI_API_KEY_HERE' && geminiKey.trim() !== '';

  if (isGeminiConfigured) {
    try {
      return await geminiService.parseTextWithGemini(text);
    } catch (err) {
      console.warn('Gemini parse failed, falling back:', err.message);
    }
  }

  // Fallback to OpenAI if available
  if (process.env.AI_API_KEY) {
    try {
      const prompt = `
        Extract structured task information from the following natural language text:
        "${text}"
        Output ONLY a valid JSON object matching: { "tasks": [{ "title": "Task name", "due_date": "YYYY-MM-DD", "duration_minutes": 120, "priority": "HIGH|MEDIUM|LOW" }] }
      `;
      return await aiProvider.callAI(prompt);
    } catch (e) {
      console.warn('OpenAI parse failed:', e.message);
    }
  }

  // Basic regex fallback if no AI is available
  return {
    tasks: [
      {
        title: text.length > 50 ? text.substring(0, 50) + '...' : text,
        due_date: null,
        duration_minutes: 60,
        priority: 'MEDIUM'
      }
    ]
  };
};
