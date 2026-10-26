const pool = require('../config/db');
const AppError = require('../utils/AppError');

/**
 * 1. Synchronize & Evaluate Cross-Module Insights
 */
exports.generateAndSyncInsights = async (userId) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Check Tasks: Approaching deadlines within 3 days that are incomplete
  const [urgentTasks] = await pool.query(
    `SELECT id, title, priority, DATE_FORMAT(due_date, '%Y-%m-%d') as due_date 
     FROM tasks 
     WHERE user_id = ? 
       AND status != 'COMPLETED' 
       AND due_date IS NOT NULL 
       AND due_date BETWEEN ? AND DATE_ADD(?, INTERVAL 3 DAY)`,
    [userId, todayStr, todayStr]
  );

  for (const t of urgentTasks) {
    const key = `deadline_${t.id}_${t.due_date}`;
    await pool.query(
      `INSERT INTO lifeos_insights 
        (user_id, module, insight_key, title, explanation, supporting_data, priority, action_type, action_payload)
       VALUES (?, 'tasks', ?, ?, ?, ?, 'high', 'VIEW_TASK', ?)
       ON DUPLICATE KEY UPDATE 
         explanation = VALUES(explanation),
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        key,
        `Approaching Deadline: "${t.title}"`,
        `This ${t.priority}-priority task is due on ${t.due_date}. Schedule a focused sprint to avoid last-minute rush.`,
        JSON.stringify({ task_id: t.id, due_date: t.due_date, priority: t.priority }),
        JSON.stringify({ task_id: t.id })
      ]
    );
  }

  // 2. Check Career Roadmap: Topics with quiz score < 70% needing revision
  const [weakTopics] = await pool.query(
    `SELECT topic_id, technology_id, quiz_score, mastery_score 
     FROM career_topic_progress 
     WHERE user_id = ? AND quiz_score > 0 AND quiz_score < 70 LIMIT 2`,
    [userId]
  );

  for (const wt of weakTopics) {
    const key = `weak_topic_${wt.topic_id}`;
    await pool.query(
      `INSERT INTO lifeos_insights 
        (user_id, module, insight_key, title, explanation, supporting_data, priority, action_type, action_payload)
       VALUES (?, 'career', ?, ?, ?, ?, 'medium', 'SCHEDULE_REVISION', ?)
       ON DUPLICATE KEY UPDATE 
         explanation = VALUES(explanation),
         updated_at = CURRENT_TIMESTAMP`,
      [
        userId,
        key,
        `Skill Retention Alert: "${wt.topic_id}"`,
        `Your recent quiz score was ${wt.quiz_score}%. Re-attempting a revision quiz now will solidify your mastery.`,
        JSON.stringify({ topic_id: wt.topic_id, quiz_score: wt.quiz_score }),
        JSON.stringify({ topic_id: wt.topic_id, technology_id: wt.technology_id })
      ]
    );
  }

  // 3. Check Habits: Consecutive misses
  const [habits] = await pool.query('SELECT id, name FROM habits WHERE user_id = ?', [userId]);
  for (const h of habits) {
    const [hLogs] = await pool.query(
      'SELECT completed FROM habit_logs WHERE habit_id = ? ORDER BY completed_date DESC LIMIT 2',
      [h.id]
    );
    const missedLastTwo = hLogs.length === 2 && hLogs.every(l => !l.completed);
    if (missedLastTwo) {
      const key = `habit_missed_${h.id}`;
      await pool.query(
        `INSERT INTO lifeos_insights 
          (user_id, module, insight_key, title, explanation, supporting_data, priority, action_type, action_payload)
         VALUES (?, 'habits', ?, ?, ?, ?, 'medium', 'RECOVER_HABIT', ?)
         ON DUPLICATE KEY UPDATE 
           explanation = VALUES(explanation),
           updated_at = CURRENT_TIMESTAMP`,
        [
          userId,
          key,
          `Habit Recovery: "${h.name}"`,
          `You missed "${h.name}" recently. Try a 5-minute micro-version today to kickstart your momentum!`,
          JSON.stringify({ habit_id: h.id }),
          JSON.stringify({ habit_id: h.id })
        ]
      );
    }
  }

  // 4. Return active (non-dismissed, non-resolved) insights
  const [activeInsights] = await pool.query(
    `SELECT id, module, insight_key, title, explanation, supporting_data, priority, action_type, action_payload, is_dismissed, is_resolved, created_at
     FROM lifeos_insights
     WHERE user_id = ? AND is_dismissed = 0 AND is_resolved = 0
     ORDER BY CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, updated_at DESC
     LIMIT 10`,
    [userId]
  );

  return activeInsights.map(ai => {
    let support = ai.supporting_data;
    let payload = ai.action_payload;
    if (typeof support === 'string') { try { support = JSON.parse(support); } catch (e) { support = {}; } }
    if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch (e) { payload = {}; } }
    return {
      ...ai,
      supporting_data: support || {},
      action_payload: payload || {}
    };
  });
};

/**
 * 2. Dismiss or Resolve Insight
 */
exports.updateInsightStatus = async (userId, insightId, payload = {}) => {
  const { is_dismissed, is_resolved, status } = payload;
  const updates = [];
  const params = [];

  if (is_dismissed !== undefined) {
    updates.push('is_dismissed = ?');
    params.push(is_dismissed ? 1 : 0);
  }
  if (is_resolved !== undefined) {
    updates.push('is_resolved = ?');
    params.push(is_resolved ? 1 : 0);
  }
  if (status === 'DISMISSED') {
    updates.push('is_dismissed = 1');
  }
  if (status === 'RESOLVED') {
    updates.push('is_resolved = 1');
  }

  if (updates.length === 0) {
    throw new AppError('No status updates provided', 400);
  }

  params.push(insightId, userId);
  const [res] = await pool.query(
    `UPDATE lifeos_insights SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?`,
    params
  );

  if (res.affectedRows === 0) {
    throw new AppError('Insight not found or unauthorized', 404);
  }

  return { success: true, message: 'Insight updated' };
};
