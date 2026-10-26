const pool = require('../config/db');
const AppError = require('../utils/AppError');
const taskService = require('./task.service');
const taskDecomposer = require('./taskDecomposer.service');
const skillMastery = require('./skillMastery.service');
const commandCenter = require('./commandCenter.service');
const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');

/**
 * 1. Process User Query with Full Project & User Context
 */
exports.handleAssistantMessage = async (userId, { message, session_id = 'default', context = {} }) => {
  if (!message || !message.trim()) {
    throw new AppError('Message is required', 400);
  }

  const sessionId = session_id || 'default';
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Gather Authorized User Data for Context
  const [tasks] = await pool.query(
    "SELECT id, title, priority, status, task_date, due_date, estimated_minutes FROM tasks WHERE user_id = ? AND status != 'COMPLETED' LIMIT 8",
    [userId]
  );
  const [goals] = await pool.query(
    "SELECT id, title, progress FROM goals WHERE user_id = ? AND status != 'COMPLETED' LIMIT 3",
    [userId]
  );
  const [habits] = await pool.query(
    'SELECT id, name, frequency FROM habits WHERE user_id = ? LIMIT 5',
    [userId]
  );
  const [scheduleItems] = await pool.query(
    `SELECT si.title, si.start_time, si.end_time, si.item_type
     FROM schedule_items si
     JOIN schedules s ON si.schedule_id = s.id
     WHERE s.user_id = ? AND s.schedule_date = ?
     ORDER BY si.start_time ASC`,
    [userId, todayStr]
  );

  // 2. Fetch Recent Conversation History (last 6 messages)
  const [history] = await pool.query(
    'SELECT role, message FROM ai_assistant_chats WHERE user_id = ? AND session_id = ? ORDER BY id DESC LIMIT 6',
    [userId, sessionId]
  );
  const conversationHistory = history.reverse();

  // 3. Persist User Message
  await pool.query(
    'INSERT INTO ai_assistant_chats (user_id, session_id, role, message) VALUES (?, ?, ?, ?)',
    [userId, sessionId, 'user', message.trim()]
  );

  // 4. Formulate System Prompt with Real Authorized Data
  const systemPrompt = `You are the AI LifeOS Universal Intelligence Assistant. You are friendly, concise, highly capable, and understand the user's real productivity data.
Current User Context:
- Active Incomplete Tasks (${tasks.length}): ${tasks.map(t => `#${t.id} ${t.title} (${t.priority})`).join(', ') || 'None'}
- Today's Schedule (${todayStr}): ${scheduleItems.map(s => `${s.start_time}-${s.end_time} ${s.title}`).join(', ') || 'No scheduled items yet'}
- Active Goals: ${goals.map(g => `${g.title} (${g.progress}%)`).join(', ') || 'None'}
- Habits: ${habits.map(h => h.name).join(', ') || 'None'}

Supported Safe Actions:
If the user asks to create a task, break down a task, schedule a study block, or generate a weekly report, generate a structured action proposal:
- "CREATE_TASK": { "title": string, "priority": "High"|"Medium"|"Low", "estimated_minutes": number }
- "DECOMPOSE_TASK": { "task_id": number, "task_title": string }
- "SCHEDULE_STUDY": { "title": string, "date": string, "start_time": string, "end_time": string }
- "OPTIMIZE_DAY": {}

Return a JSON object with:
"reply": string (supportive markdown response),
"proposed_action": null or object with {
  "type": "CREATE_TASK" | "DECOMPOSE_TASK" | "SCHEDULE_STUDY" | "OPTIMIZE_DAY",
  "description": string (plain English description of what will be done upon confirmation),
  "payload": object with necessary action parameters
}`;

  let assistantResponse = null;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'PASTE_YOUR_NEW_GEMINI_API_KEY_HERE') {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const fullPrompt = `${systemPrompt}\n\nUser Question: "${message}"`;
      const resp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: { responseMimeType: 'application/json' }
      });
      assistantResponse = JSON.parse(resp.text.trim());
    }
  } catch (e) {
    console.warn('Gemini assistant query failed, using OpenAI or fallback:', e.message);
  }

  if (!assistantResponse && process.env.OPENAI_API_KEY) {
    try {
      const resp = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: process.env.AI_MODEL || 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversationHistory.map(h => ({ role: h.role, content: h.message })),
            { role: 'user', content: message }
          ],
          response_format: { type: 'json_object' }
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      assistantResponse = JSON.parse(resp.data.choices[0].message.content);
    } catch (err) {
      console.warn('OpenAI assistant query failed:', err.message);
    }
  }

  // Deterministic fallback if external LLMs are unavailable
  if (!assistantResponse) {
    const lower = message.toLowerCase();
    let replyText = `I have reviewed your active LifeOS workspace. You currently have **${tasks.length} pending tasks** and **${goals.length} active goals**.`;
    let action = null;

    if (lower.includes('task') && (lower.includes('create') || lower.includes('add'))) {
      replyText = `I can help you add that task to your LifeOS board. Would you like me to create it for you?`;
      action = {
        type: 'CREATE_TASK',
        description: `Create task from your message`,
        payload: { title: message.replace(/create task|add task/i, '').trim() || 'New Productivity Task', priority: 'Medium', estimated_minutes: 45 }
      };
    } else if (lower.includes('break down') || lower.includes('decompose')) {
      replyText = `I can break this task into actionable 30-minute milestones for you.`;
      action = {
        type: 'DECOMPOSE_TASK',
        description: `Break down task with AI Task Decomposer`,
        payload: { task_title: message }
      };
    } else if (lower.includes('focus') || lower.includes('today')) {
      replyText = tasks.length > 0 
        ? `Your highest leverage focus today is **${tasks[0].title}** (${tasks[0].priority} priority). Would you like me to optimize your day's schedule?`
        : `Your schedule is clear! It is a great time to advance your active goals or review your career roadmap.`;
    }

    assistantResponse = {
      reply: replyText,
      proposed_action: action
    };
  }

  // Persist Assistant Reply & Action Proposal
  const hasAction = !!assistantResponse.proposed_action;
  const actionStatus = hasAction ? 'pending' : 'none';

  const [res] = await pool.query(
    `INSERT INTO ai_assistant_chats (user_id, session_id, role, message, action_proposal, action_status)
     VALUES (?, ?, 'assistant', ?, ?, ?)`,
    [
      userId,
      sessionId,
      assistantResponse.reply,
      hasAction ? JSON.stringify(assistantResponse.proposed_action) : null,
      actionStatus
    ]
  );

  return {
    id: res.insertId,
    session_id: sessionId,
    reply: assistantResponse.reply,
    action_proposal: assistantResponse.proposed_action,
    action_status: actionStatus
  };
};

/**
 * 2. Confirm & Execute Proposed Assistant Action
 */
exports.confirmAssistantAction = async (userId, chatId, isApproved) => {
  const [rows] = await pool.query(
    'SELECT * FROM ai_assistant_chats WHERE id = ? AND user_id = ?',
    [chatId, userId]
  );

  if (rows.length === 0) {
    throw new AppError('Chat action not found or unauthorized', 404);
  }

  const chat = rows[0];
  if (chat.action_status !== 'pending') {
    throw new AppError(`Action is already ${chat.action_status}`, 400);
  }

  if (!isApproved) {
    await pool.query("UPDATE ai_assistant_chats SET action_status = 'rejected' WHERE id = ?", [chatId]);
    return { success: true, message: 'Action rejected by user', action_status: 'rejected' };
  }

  let proposal = chat.action_proposal;
  if (typeof proposal === 'string') {
    try { proposal = JSON.parse(proposal); } catch (e) { proposal = {}; }
  }

  let executionResult = null;

  // Execute validated backend functions safely
  if (proposal.type === 'CREATE_TASK') {
    const p = proposal.payload || {};
    const task = await taskService.createTask(userId, {
      title: p.title || 'New AI Assistant Task',
      priority: p.priority || 'Medium',
      estimated_minutes: p.estimated_minutes || 45,
      description: 'Created via AI LifeOS Universal Assistant'
    });
    executionResult = { created_task_id: task.id, title: task.title };
  } else if (proposal.type === 'DECOMPOSE_TASK') {
    const p = proposal.payload || {};
    const result = await taskDecomposer.decomposeTask(userId, p.task_id, p.task_title);
    executionResult = { decomposed: true, subtasks_count: result.subtasks.length };
  } else if (proposal.type === 'OPTIMIZE_DAY') {
    const todayStr = new Date().toISOString().split('T')[0];
    const preview = await commandCenter.optimizeMyDayPreview(userId, todayStr);
    await commandCenter.applyOptimizedSchedule(userId, todayStr, preview.proposed_items);
    executionResult = { optimized: true, items_count: preview.proposed_items.length };
  }

  await pool.query(
    "UPDATE ai_assistant_chats SET action_status = 'executed' WHERE id = ?",
    [chatId]
  );

  return {
    success: true,
    message: 'Action confirmed and executed successfully through validated backend service',
    action_status: 'executed',
    result: executionResult
  };
};

/**
 * 3. Get Chat History
 */
exports.getAssistantChatHistory = async (userId, sessionId = 'default') => {
  const [rows] = await pool.query(
    `SELECT id, role, message, action_proposal, action_status, created_at
     FROM ai_assistant_chats
     WHERE user_id = ? AND session_id = ?
     ORDER BY id ASC
     LIMIT 50`,
    [userId, sessionId]
  );

  return rows.map(r => {
    let proposal = r.action_proposal;
    if (typeof proposal === 'string') {
      try { proposal = JSON.parse(proposal); } catch (e) { proposal = null; }
    }
    return {
      ...r,
      action_proposal: proposal
    };
  });
};
