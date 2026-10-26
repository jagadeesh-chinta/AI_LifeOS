const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');
const pool = require('../config/db');
const AppError = require('../utils/AppError');

/**
 * Categorize a task/slot by title, type, and description.
 */
function detectTaskCategory(title = '', type = '', description = '') {
  const text = `${title} ${type} ${description}`.toLowerCase();
  
  if (text.includes('interview') || text.includes('hr round') || text.includes('mock interview') || text.includes('behavioral')) {
    return 'INTERVIEW_PREP';
  }
  if (text.includes('exam') || text.includes('test') || text.includes('quiz') || text.includes('midterm') || text.includes('final') || text.includes('revise') || text.includes('revision') || text.includes('study')) {
    return 'EXAM_PREP';
  }
  if (text.includes('code') || text.includes('programming') || text.includes('bug') || text.includes('develop') || text.includes('script') || text.includes('api') || text.includes('react') || text.includes('python') || text.includes('sql') || text.includes('database')) {
    return 'PROGRAMMING';
  }
  if (text.includes('project') || text.includes('milestone') || text.includes('architecture') || text.includes('presentation') || text.includes('deck') || text.includes('deliverable')) {
    return 'PROJECT_WORK';
  }
  if (text.includes('meeting') || text.includes('sync') || text.includes('call') || text.includes('standup') || text.includes('appointment')) {
    return 'MEETING_APPOINTMENT';
  }
  if (text.includes('workout') || text.includes('exercise') || text.includes('gym') || text.includes('run') || text.includes('walk') || text.includes('yoga') || text.includes('meditat') || text.includes('stretch') || text.includes('routine')) {
    return 'HEALTH_ROUTINE';
  }
  if (text.includes('read') || text.includes('book') || text.includes('paper') || text.includes('assignment') || text.includes('essay') || text.includes('research') || text.includes('chapter')) {
    return 'READING_LEARNING';
  }
  return 'GENERAL_TASK';
}

/**
 * Returns task-specific prompt chips for the slot.
 */
function getSuggestedPrompts(category) {
  switch (category) {
    case 'EXAM_PREP':
      return [
        'Divide my time into a realistic study plan',
        'Explain normalization in simple words',
        'Give me 10 important questions with answers',
        'Make a short revision sheet',
        'Give me a quiz and check my answers',
        'I have only 30 minutes. Change my preparation plan'
      ];
    case 'INTERVIEW_PREP':
      return [
        'Generate likely interview questions and model answers',
        'Help me practice my self-introduction',
        'How to explain my project with the STAR method?',
        'Conduct a mock interview for this role',
        'Key questions I should ask the interviewer'
      ];
    case 'PROGRAMMING':
      return [
        'Break this into implementation steps',
        'Help me design the architecture & logic',
        'Provide code examples & best practices',
        'Help me troubleshoot and debug edge cases',
        'Generate test cases for this feature'
      ];
    case 'PROJECT_WORK':
      return [
        'Create a step-by-step milestone checklist',
        'Identify potential risks and blockers',
        'Draft testing and validation plan',
        'How should I prioritize sub-tasks?',
        'Draft a progress summary'
      ];
    case 'MEETING_APPOINTMENT':
      return [
        'Prepare agenda and talking points',
        'Review objectives and key questions',
        'Summarize background materials',
        'Action items template'
      ];
    case 'HEALTH_ROUTINE':
      return [
        'Structured warm-up and workout plan',
        'Form cues & pacing technique',
        'Post-routine recovery and hydration tips',
        'Adjust intensity for today'
      ];
    case 'READING_LEARNING':
      return [
        'Structured chapter reading & note-taking plan',
        'Summarize key arguments and takeaways',
        'Generate practice questions & quiz',
        'Draft an outline for my study notes'
      ];
    default:
      return [
        'Create a step-by-step plan for this slot',
        'Explain key concepts I need to know',
        'How should I prioritize my time here?',
        'Give practice exercises with answers',
        'Summarize key takeaways'
      ];
  }
}

/**
 * Call OpenAI Chat Completion
 */
async function callOpenAI(messages, systemInstruction) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
  if (!apiKey || apiKey.startsWith('your_') || apiKey.includes('PASTE_')) {
    throw new Error('OpenAI API key not configured');
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const formattedMessages = [
    { role: 'system', content: systemInstruction },
    ...messages
  ];

  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      messages: formattedMessages,
      temperature: 0.3,
      max_tokens: 1500
    },
    {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 25000
    }
  );

  return response.data.choices[0].message.content;
}

/**
 * Call Gemini Chat Completion
 */
async function callGemini(messages, systemInstruction) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.startsWith('your_') || apiKey.includes('PASTE_')) {
    throw new Error('Gemini API key not configured');
  }

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  const conversationText = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
  const prompt = `${systemInstruction}\n\n--- CONVERSATION ---\n${conversationText}\n\nASSISTANT:`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.3
    }
  });

  return response.text;
}

/**
 * Offline Intelligent Rule-Based Response Generator
 * Provides realistic, tailored assistance if external AI quota is exhausted.
 */
function generateOfflineContextualResponse(category, slotContext, userMessage) {
  const msg = userMessage.toLowerCase();
  const dur = slotContext.duration || 60;
  const title = slotContext.title || 'Focus Task';

  if (category === 'EXAM_PREP') {
    // 1. User provided topics (e.g. normalization, SQL joins, transactions, indexing)
    const looksLikeTopicList = msg.includes(',') || msg.includes(' and ') || msg.includes('topics') || 
                               msg.includes('normalization') || msg.includes('joins') || msg.includes('sql') || 
                               msg.includes('dbms') || msg.includes('transactions') || msg.includes('indexing') ||
                               msg.includes('weak in');
    
    if (looksLikeTopicList && !msg.startsWith('give me') && !msg.includes('explain') && !msg.includes('what is')) {
      const cleanMsg = userMessage.replace(/my topics are|the topics are|i need to prepare|topics:|subject is/gi, '').trim();
      const rawTopics = cleanMsg.split(/[,;\n]| and /i).map(t => t.trim()).filter(t => t.length > 2);
      
      let weakTopic = null;
      if (msg.includes('weak in')) {
        const weakMatch = userMessage.match(/weak in\s+([a-zA-Z0-9\s]+)/i);
        if (weakMatch) weakTopic = weakMatch[1].trim();
      }

      const topics = rawTopics.length > 0 ? rawTopics : ['Transactions', 'SQL Joins', 'Normalization', 'Indexing'];
      
      // If user indicated a weak topic, sort it first
      if (weakTopic) {
        const idx = topics.findIndex(t => t.toLowerCase().includes(weakTopic.toLowerCase()));
        if (idx > -1) {
          const [found] = topics.splice(idx, 1);
          topics.unshift(`${found} (Prioritized: Weak Area)`);
        }
      }

      const minsPerTopic = Math.max(8, Math.floor((dur - 10) / topics.length));

      let res = `### Realistic Topic-Wise Study Plan (${dur} mins allocated)\n\n`;
      res += `I have analyzed your **${topics.length} topics** and tailored the plan to your available **${slotContext.start_time || ''} – ${slotContext.end_time || ''}** window:\n\n`;

      if (weakTopic) {
        res += `> [!IMPORTANT]\n> **Targeted Priority**: We allocated extra dedicated focus to **${weakTopic}** first to build conceptual clarity before moving to broader topics.\n\n`;
      }

      res += `#### ⏱️ Topic-by-Topic Time Breakdown:\n`;
      let currentOffset = 0;
      topics.forEach((tp, idx) => {
        const slotDur = idx === topics.length - 1 ? (dur - 10 - currentOffset) : minsPerTopic;
        currentOffset += slotDur;
        res += `- **${tp}** (~${slotDur} mins): Master core rules, review tricky exam edge cases, and solve 1–2 practical questions.\n`;
      });
      res += `- **Final 10 mins (Active Recall & Quiz)**: Self-test formulas, transaction isolation anomalies, and quick revision sheet.\n\n`;

      res += `*Would you like me to explain any topic simply (e.g. "Explain normalization in simple words"), or generate 10 practice questions with answers?*`;
      return res;
    }

    // 2. Simple concept explanation request
    if (msg.includes('explain') && (msg.includes('normalization') || msg.includes('normal form') || msg.includes('simple'))) {
      return `### Normalization Explained in Simple Words

**What is Normalization?**
Normalization is the process of organizing database tables to **eliminate duplicate data (redundancy)** and prevent anomalies during insert, update, or delete operations.

**Think of it like organizing your desk:**
Instead of writing the student's name, email, department name, and department head on every single grade sheet, you keep:
1. A **Students** table (ID, Name, Email, Dept_ID).
2. A **Departments** table (Dept_ID, Dept_Name, Dept_Head).

#### The 3 Main Normal Forms:
1. **1NF (Atomic Values)**: Each cell must hold only **one single value** (no comma-separated lists of phone numbers).
2. **2NF (No Partial Dependency)**: Must be 1NF + every non-key column must depend on the **whole primary key** (relevant when you have composite keys).
3. **3NF (No Transitive Dependency)**: Must be 2NF + non-key columns must **NOT depend on other non-key columns** (e.g., student grade shouldn't determine department head).

*Would you like an example with SQL table code, or 5 practice exam questions?*`;
    }

    // 3. Practice questions & answers
    if (msg.includes('question') || msg.includes('practice') || msg.includes('test') || msg.includes('quiz') || msg.includes('answer')) {
      return `### High-Yield Practice Questions & Detailed Solutions

1. **Question 1 (Transactions & ACID)**:
   *What is the difference between 'Dirty Read' and 'Non-Repeatable Read'? Which isolation level prevents Non-Repeatable Reads?*
   - **Answer**: 
     - A **Dirty Read** occurs when transaction T1 reads data modified by T2 before T2 commits. If T2 rolls back, T1 read invalid data. Prevented by **Read Committed**.
     - A **Non-Repeatable Read** occurs when T1 reads the same row twice, but T2 modifies and commits the row in between, yielding different values. Prevented by **Repeatable Read**.

2. **Question 2 (SQL Joins)**:
   *Write an SQL query to retrieve employee names who earn more than their direct manager.*
   - **Answer**:
   \`\`\`sql
   SELECT e.emp_name
   FROM Employees e
   JOIN Employees m ON e.manager_id = m.emp_id
   WHERE e.salary > m.salary;
   \`\`\`

3. **Question 3 (Normalization)**:
   *When is a relation in Boyce-Codd Normal Form (BCNF)?*
   - **Answer**: A relation is in BCNF if for every functional dependency \`X -> Y\`, \`X\` is a **superkey**. BCNF is stricter than 3NF because it removes dependencies where a determinant is a non-superkey candidate key component.

4. **Question 4 (Indexing)**:
   *Why might a query using \`LIKE '%abc'\` not use a B-Tree index?*
   - **Answer**: B-Tree indexes are sorted lexicographically from left to right. Leading wildcards prevent binary search traversal, requiring a full table scan.

*Ask for more questions, code explanations, or solutions to any specific problem!*`;
    }

    // 4. Quick Revision Sheet
    if (msg.includes('revision sheet') || msg.includes('summary sheet') || msg.includes('cheatsheet')) {
      return `### Quick Exam Revision Sheet

- **ACID Properties**: 
  - **Atomicity**: All-or-nothing (WAL / undo log).
  - **Consistency**: Database transitions from one valid state to another.
  - **Isolation**: Concurrent transactions do not interfere.
  - **Durability**: Committed transactions persist across crashes (redo log).
- **Isolation Levels (Low to High)**: Read Uncommitted -> Read Committed -> Repeatable Read -> Serializable.
- **Normal Forms**: 
  - 1NF = Atomic values.
  - 2NF = 1NF + No partial dependency.
  - 3NF = 2NF + No transitive dependency.
  - BCNF = Every determinant is a superkey.
- **Joins Quick Formula**:
  - INNER JOIN: Intersection of both tables.
  - LEFT JOIN: All rows from left table + matched rows from right table.

*Tip: Spend 10 minutes testing your recall on these 4 bullet points!*`;
    }

    return `### Intelligent Exam Revision Plan for "${title}" (${dur} mins)

To maximize retention during your **${slotContext.start_time || 'scheduled'} – ${slotContext.end_time || 'time'}** slot:

1. **Phase 1: Rapid Concept Scan (${Math.round(dur * 0.3)} mins)**: Review high-yield definitions, architecture diagrams, and core rules.
2. **Phase 2: Deep Problem Solving (${Math.round(dur * 0.45)} mins)**: Solve 3–5 representative problems or past questions.
3. **Phase 3: Active Recall & Weak Spot Remediation (${Math.round(dur * 0.25)} mins)**: Target doubts and verify formulas.

*Tell me what specific topics you are preparing and which one you feel weakest in!*`;
  }

  if (category === 'INTERVIEW_PREP') {
    if (msg.includes('question') || msg.includes('answer') || msg.includes('star') || msg.includes('intro')) {
      return `### Key Interview Questions & High-Impact Model Answers

1. **"Tell me about a complex technical challenge you solved." (STAR Method)**:
   - **Situation**: In our AI LifeOS project, our constraint scheduler was recalculating entire day schedules even when only a single flexible block changed.
   - **Task**: Optimize schedule updates to execute sub-second while guaranteeing zero overlaps with fixed commitments.
   - **Action**: Implemented an interval-tree reservation check in Python and smart reconciliation in MySQL, avoiding full item wipes.
   - **Result**: Reduced latency by 85% and preserved user chat histories across sessions.

2. **"How do you handle disagreements on technical design with team members?"**:
   - Focus on objective benchmarks, trade-offs (e.g. latency vs. simplicity), and prototype the critical path to make data-driven decisions.

*Would you like me to rehearse answers for a specific job title or company?*`;
    }

    return `### Interview Preparation Roadmap (${dur} mins)

1. **Self-Introduction & Elevator Pitch (${Math.round(dur * 0.2)} mins)**: Polish your 90-second professional story.
2. **Core Technical & Behavioral Rehearsal (${Math.round(dur * 0.55)} mins)**: Practice 4–5 likely questions using the STAR framework.
3. **Questions for the Interviewer (${Math.round(dur * 0.25)} mins)**: Prepare 3 intelligent questions to demonstrate genuine curiosity and depth.

*What role and company are you preparing for?*`;
  }

  if (category === 'PROGRAMMING') {
    return `### Implementation Roadmap for "${title}" (${dur} mins)

1. **Architecture & Requirements (${Math.round(dur * 0.2)} mins)**: Define inputs, outputs, and edge cases.
2. **Core Implementation (${Math.round(dur * 0.5)} mins)**: Scaffold data structures and write clean business logic.
3. **Testing & Validation (${Math.round(dur * 0.3)} mins)**: Run unit tests against happy path and failure cases.

*Tell me what language or framework you are using and what specific function you are building!*`;
  }

  return `### Action Plan for "${title}" (${dur} mins)

1. **Setup & Focus Entry (First 5 mins)**: Gather assets, eliminate distractions, and establish concrete goals.
2. **Deep Work (${Math.round(dur * 0.7)} mins)**: Execute highest-priority items without multitasking.
3. **Review & Wrap-Up (Final 10 mins)**: Verify results against objectives and record notes for your next session.

*Ask any question or request a breakdown of sub-tasks!*`;
}

/**
 * Fetch slot chat conversation and initialize welcome message if empty
 */
exports.getSlotChat = async (userId, itemId) => {
  const [items] = await pool.query(
    `SELECT si.*, s.schedule_date 
     FROM schedule_items si 
     JOIN schedules s ON si.schedule_id = s.id 
     WHERE si.id = ? AND s.user_id = ?`,
    [itemId, userId]
  );

  if (items.length === 0) {
    throw new AppError('Schedule slot not found or access denied', 404);
  }

  const slot = items[0];
  const category = detectTaskCategory(slot.title, slot.item_type, slot.description);
  const suggestedPrompts = getSuggestedPrompts(category);

  // Fetch messages
  const [messages] = await pool.query(
    `SELECT id, sender, message, meta, created_at 
     FROM schedule_slot_messages 
     WHERE schedule_item_id = ? AND user_id = ? 
     ORDER BY created_at ASC`,
    [itemId, userId]
  );

  // Initialize with contextual assistant question if empty
  if (messages.length === 0) {
    let welcome = `Welcome! I am your dedicated AI Assistant for "${slot.title}". How can I help you make the most of this scheduled window?`;
    
    if (category === 'EXAM_PREP') {
      welcome = `Which subject and topics are included in your exam? Tell me what you need to prepare, and I'll divide your available time into a realistic study plan.`;
    } else if (category === 'INTERVIEW_PREP') {
      welcome = `Welcome to your interview preparation session! What job role, company, or interview type are you preparing for? I can help with technical questions, self-introduction, and mock rehearsals.`;
    } else if (category === 'PROGRAMMING') {
      welcome = `Welcome to your coding block for "${slot.title}"! What specific feature, logic, or bug are you solving today? Let me know your tech stack and goals.`;
    } else if (category === 'PROJECT_WORK') {
      welcome = `Welcome! Which project milestone or deliverable are you focusing on during this session?`;
    } else if (category === 'MEETING_APPOINTMENT') {
      welcome = `Let's prepare for your upcoming session! Do you want to prepare an agenda, review talking points, or draft background questions?`;
    } else if (category === 'HEALTH_ROUTINE') {
      welcome = `Ready for "${slot.title}"! What workout or routine do you have planned? I can help with form cues, warmup, and pacing.`;
    } else if (category === 'READING_LEARNING') {
      welcome = `Welcome! What subject, chapters, or writing goals are you tackling during this study block?`;
    }

    const [ins] = await pool.query(
      `INSERT INTO schedule_slot_messages (schedule_item_id, user_id, sender, message, meta) 
       VALUES (?, ?, 'assistant', ?, ?)`,
      [itemId, userId, welcome, JSON.stringify({ is_initial: true, category })]
    );

    messages.push({
      id: ins.insertId,
      sender: 'assistant',
      message: welcome,
      meta: { is_initial: true, category },
      created_at: new Date()
    });
  }

  return {
    slot,
    category,
    suggested_prompts: suggestedPrompts,
    messages
  };
};

/**
 * Send message to contextual slot chatbot with Dual AI (OpenAI + Gemini)
 */
exports.sendSlotMessage = async (userId, itemId, userMessage, clientContext = null) => {
  if (!userMessage || !userMessage.trim()) {
    throw new AppError('Message is required', 400);
  }

  const [items] = await pool.query(
    `SELECT si.*, s.schedule_date 
     FROM schedule_items si 
     JOIN schedules s ON si.schedule_id = s.id 
     WHERE si.id = ? AND s.user_id = ?`,
    [itemId, userId]
  );

  if (items.length === 0) {
    throw new AppError('Schedule slot not found or access denied', 404);
  }

  const slot = items[0];
  const category = detectTaskCategory(slot.title, slot.item_type, slot.description);

  let dur = 60;
  if (slot.start_time && slot.end_time) {
    const sParts = String(slot.start_time).split(':');
    const eParts = String(slot.end_time).split(':');
    const sM = parseInt(sParts[0], 10) * 60 + parseInt(sParts[1], 10);
    const eM = parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10);
    if (eM > sM) dur = eM - sM;
  }

  const slotContext = {
    title: slot.title,
    description: slot.description || '',
    start_time: slot.start_time,
    end_time: slot.end_time,
    duration: dur,
    category,
    schedule_date: slot.schedule_date,
    action_plan: slot.action_plan,
    ...(clientContext || {})
  };

  // Persist user message
  await pool.query(
    `INSERT INTO schedule_slot_messages (schedule_item_id, user_id, sender, message, meta) 
     VALUES (?, ?, 'user', ?, ?)`,
    [itemId, userId, userMessage.trim(), JSON.stringify({ category })]
  );

  // Retrieve recent history
  const [history] = await pool.query(
    `SELECT sender, message 
     FROM schedule_slot_messages 
     WHERE schedule_item_id = ? AND user_id = ? 
     ORDER BY created_at DESC LIMIT 10`,
    [itemId, userId]
  );

  const formattedHistory = history.reverse().map(h => ({
    role: h.sender === 'user' ? 'user' : 'assistant',
    content: h.message
  }));

  // Build System Instructions
  const systemInstruction = `
You are the AI LifeOS Intelligent Schedule & Task Assistant dedicated exclusively to this specific scheduled time slot.

SLOT CONTEXT:
- Activity Title: "${slotContext.title}"
- Allocated Time: ${slotContext.start_time} to ${slotContext.end_time} (${slotContext.duration} minutes total)
- Date: ${slotContext.schedule_date}
- Category: ${category}
- Details: ${slotContext.description || 'None provided'}

RESPONSIBILITIES & TASK BEHAVIOR:
1. Contextual Focus: You are working WITH the user right now during this specific ${slotContext.duration}-minute block.
2. Dynamic Task Adaptation:
   - EXAM PREPARATION: If the user provides topics (e.g. normalization, SQL joins, transactions, indexing, weak in transactions):
     a) Identify all topics and prioritize weak/difficult areas first.
     b) Estimate time needed per topic.
     c) Divide the available ${slotContext.duration} minutes into a practical topic-wise plan with realistic times.
     d) Clearly state if requested topics cannot reasonably fit within the available time.
     e) Answer follow-ups like "Explain normalization in simple words", "Give me 10 important questions with answers", "Explain with an example", "Make a short revision sheet", "Give me a quiz and check my answers", "I have only 30 minutes. Change my preparation plan".
   - INTERVIEW PREPARATION: Provide job role/company context, generate likely interview questions and model answers using the STAR method, help practice self-introductions and project explanations, and conduct mock interview questions.
   - PROGRAMMING: Help break features into implementation steps, debug code, design database schemas or API endpoints, and provide test cases.
   - PROJECT WORK: Break milestones into actionable sub-tasks, prioritize deliverables, suggest testing and documentation.
   - MEETINGS / APPOINTMENTS: Formulate agendas, talking points, and action items.
   - HEALTH / ROUTINES: Provide structured routine steps, technique cues, and pacing.
3. Realistic Time Allocation: Always respect the available duration of ${slotContext.duration} minutes.
4. Output Style: Professional, encouraging, structured, using markdown headings, bold points, and bulleted lists.
`;

  let assistantResponse = '';
  let providerUsed = 'openai';

  // Dual AI Execution: Primary OpenAI -> Fallback Gemini -> Offline Contextual Engine
  try {
    assistantResponse = await callOpenAI(formattedHistory, systemInstruction);
    providerUsed = 'openai (gpt-4o-mini)';
  } catch (openAiErr) {
    console.warn('OpenAI slot chat failed, trying Gemini:', openAiErr.message);
    try {
      assistantResponse = await callGemini(formattedHistory, systemInstruction);
      providerUsed = 'gemini (gemini-2.5-flash)';
    } catch (geminiErr) {
      console.warn('Gemini slot chat failed, using contextual fallback engine:', geminiErr.message);
      assistantResponse = generateOfflineContextualResponse(category, slotContext, userMessage);
      providerUsed = 'contextual_engine';
    }
  }

  // Persist assistant reply
  const [insertRes] = await pool.query(
    `INSERT INTO schedule_slot_messages (schedule_item_id, user_id, sender, message, meta) 
     VALUES (?, ?, 'assistant', ?, ?)`,
    [itemId, userId, assistantResponse, JSON.stringify({ provider: providerUsed, category })]
  );

  const replyObj = {
    id: insertRes.insertId,
    sender: 'assistant',
    message: assistantResponse,
    meta: { provider: providerUsed, category },
    created_at: new Date().toISOString()
  };

  return {
    success: true,
    message_id: insertRes.insertId,
    reply: replyObj,
    message: assistantResponse,
    provider: providerUsed,
    suggested_prompts: getSuggestedPrompts(category)
  };
};

/**
 * Update slot action plan checklist
 */
exports.updateActionPlan = async (userId, itemId, actionPlan) => {
  const [items] = await pool.query(
    `SELECT si.id 
     FROM schedule_items si 
     JOIN schedules s ON si.schedule_id = s.id 
     WHERE si.id = ? AND s.user_id = ?`,
    [itemId, userId]
  );

  if (items.length === 0) {
    throw new AppError('Schedule slot not found or access denied', 404);
  }

  await pool.query(
    'UPDATE schedule_items SET action_plan = ? WHERE id = ?',
    [JSON.stringify(actionPlan || []), itemId]
  );

  return { success: true, action_plan: actionPlan };
};

/**
 * Extend, shorten, or edit timing of a schedule item with conflict validation
 */
exports.adjustSlotTiming = async (userId, itemId, payload = {}) => {
  const startTime = payload.startTime || payload.start_time;
  const endTime = payload.endTime || payload.end_time;
  const extendMinutes = payload.extendMinutes !== undefined ? payload.extendMinutes : (payload.duration_delta !== undefined ? payload.duration_delta : payload.extend_minutes);

  const [items] = await pool.query(
    `SELECT si.*, s.id as schedule_id, s.schedule_date 
     FROM schedule_items si 
     JOIN schedules s ON si.schedule_id = s.id 
     WHERE si.id = ? AND s.user_id = ?`,
    [itemId, userId]
  );

  if (items.length === 0) {
    throw new AppError('Schedule slot not found or access denied', 404);
  }

  const currentItem = items[0];
  const scheduleId = currentItem.schedule_id;

  // Retrieve all other items in this schedule
  const [otherItems] = await pool.query(
    `SELECT si.*, t.start_time as task_fixed_start 
     FROM schedule_items si 
     LEFT JOIN tasks t ON si.task_id = t.id 
     WHERE si.schedule_id = ? AND si.id != ? 
     ORDER BY si.start_time ASC`,
    [scheduleId, itemId]
  );

  const toMinutes = (timeStr) => {
    if (!timeStr) return null;
    const parts = String(timeStr).split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  const toTimeStr = (totalM) => {
    const clamped = Math.max(0, Math.min(totalM, 1439));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  let newStartM = startTime ? toMinutes(startTime) : toMinutes(currentItem.start_time);
  let newEndM = endTime ? toMinutes(endTime) : toMinutes(currentItem.end_time);

  if (extendMinutes) {
    newEndM = Math.min(newEndM + parseInt(extendMinutes, 10), 1439);
  }

  if (newEndM <= newStartM) {
    throw new AppError('End time must be after start time', 400);
  }

  // Check conflicts with locked commitments and other slots
  const conflicts = [];
  for (const other of otherItems) {
    const oStartM = toMinutes(other.start_time);
    const oEndM = toMinutes(other.end_time);

    if (newStartM < oEndM && oStartM < newEndM) {
      let isFixed = Boolean(other.item_type === 'EVENT' || other.task_fixed_start);
      if (!isFixed && other.slot_metadata) {
        try {
          const meta = typeof other.slot_metadata === 'string' ? JSON.parse(other.slot_metadata) : other.slot_metadata;
          if (meta && meta.is_fixed) isFixed = true;
        } catch {}
      }

      if (isFixed) {
        conflicts.push({
          other_title: other.title,
          other_time: `${other.start_time} - ${other.end_time}`,
          type: 'LOCKED_COMMITMENT',
          message: `Cannot overlap with fixed commitment "${other.title}" (${other.start_time} – ${other.end_time}). Fixed events cannot be moved.`
        });
      } else {
        conflicts.push({
          other_title: other.title,
          other_time: `${other.start_time} - ${other.end_time}`,
          type: 'FLEXIBLE_SLOT',
          message: `Overlaps with flexible slot "${other.title}" (${other.start_time} – ${other.end_time}).`
        });
      }
    }
  }

  const lockedConflict = conflicts.find(c => c.type === 'LOCKED_COMMITMENT');
  if (lockedConflict) {
    throw new AppError(lockedConflict.message, 409);
  }

  const newStartStr = toTimeStr(newStartM);
  const newEndStr = toTimeStr(newEndM);

  await pool.query(
    'UPDATE schedule_items SET start_time = ?, end_time = ? WHERE id = ?',
    [newStartStr, newEndStr, itemId]
  );

  // Add system message to slot conversation
  await pool.query(
    `INSERT INTO schedule_slot_messages (schedule_item_id, user_id, sender, message, meta) 
     VALUES (?, ?, 'system', ?, ?)`,
    [
      itemId,
      userId,
      `Schedule timing updated to ${newStartStr} – ${newEndStr} (${newEndM - newStartM} mins).`,
      JSON.stringify({ event: 'TIMING_UPDATED', new_duration: newEndM - newStartM })
    ]
  );

  const updatedItem = {
    ...currentItem,
    start_time: newStartStr,
    end_time: newEndStr,
    start: newStartStr,
    end: newEndStr,
    duration_minutes: newEndM - newStartM
  };

  return {
    success: true,
    start_time: newStartStr,
    end_time: newEndStr,
    duration_minutes: newEndM - newStartM,
    item: updatedItem,
    conflicts: conflicts.length > 0 ? conflicts : undefined
  };
};

/**
 * Split a slot into two sub-activities
 */
exports.splitSlot = async (userId, itemId, payload = {}) => {
  const splitMinutes = payload.splitMinutes || payload.split_minutes;
  const title1 = payload.title1 || payload.part1_title;
  const title2 = payload.title2 || payload.part2_title;

  const [items] = await pool.query(
    `SELECT si.*, s.id as schedule_id 
     FROM schedule_items si 
     JOIN schedules s ON si.schedule_id = s.id 
     WHERE si.id = ? AND s.user_id = ?`,
    [itemId, userId]
  );

  if (items.length === 0) {
    throw new AppError('Schedule slot not found or access denied', 404);
  }

  const slot = items[0];
  const toMinutes = (timeStr) => {
    const parts = String(timeStr).split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };
  const toTimeStr = (totalM) => {
    const clamped = Math.max(0, Math.min(totalM, 1439));
    const h = Math.floor(clamped / 60);
    const m = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  };

  const startM = toMinutes(slot.start_time);
  const endM = toMinutes(slot.end_time);
  const totalDur = endM - startM;

  const splitDur = splitMinutes ? parseInt(splitMinutes, 10) : Math.floor(totalDur / 2);

  if (splitDur <= 10 || splitDur >= totalDur - 10) {
    throw new AppError('Split duration must allow at least 10 minutes per activity', 400);
  }

  const midM = startM + splitDur;
  const t1 = title1 || `${slot.title} - Part 1`;
  const t2 = title2 || `${slot.title} - Part 2`;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(
      'UPDATE schedule_items SET title = ?, end_time = ? WHERE id = ?',
      [t1, toTimeStr(midM), itemId]
    );

    const [insertRes] = await connection.query(
      `INSERT INTO schedule_items 
       (schedule_id, title, description, start_time, end_time, item_type, priority, task_id, goal_id, habit_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        slot.schedule_id,
        t2,
        slot.description,
        toTimeStr(midM),
        toTimeStr(endM),
        slot.item_type || 'TASK',
        slot.priority || 'MEDIUM',
        slot.task_id,
        slot.goal_id,
        slot.habit_id
      ]
    );

    await connection.commit();
    return {
      success: true,
      item1: { id: itemId, title: t1, start_time: slot.start_time, end_time: toTimeStr(midM) },
      item2: { id: insertRes.insertId, title: t2, start_time: toTimeStr(midM), end_time: slot.end_time }
    };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

exports.detectTaskCategory = detectTaskCategory;
exports.getSuggestedPrompts = getSuggestedPrompts;
