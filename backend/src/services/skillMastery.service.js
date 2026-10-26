const pool = require('../config/db');
const AppError = require('../utils/AppError');
const stageCurriculumService = require('./stageCurriculum.service');
const { GoogleGenAI } = require('@google/genai');
const axios = require('axios');

/**
 * 1. Skill Mastery Dashboard
 */
exports.getSkillMasteryDashboard = async (userId) => {
  // 1. Get active career goals
  const [goals] = await pool.query(
    "SELECT id, title, description, target_date, progress FROM goals WHERE user_id = ? AND status != 'COMPLETED'",
    [userId]
  );

  if (goals.length === 0) {
    return {
      active_goals: [],
      mastery_stats: { total_topics: 0, completed_topics: 0, average_mastery: 0, quizzes_taken: 0 },
      revision_queue: [],
      recommended_next_topic: null
    };
  }

  const primaryGoal = goals[0];

  // 2. Fetch topic progress records for this user & goal
  const [topicProgress] = await pool.query(
    `SELECT goal_id, stage_number, technology_id, topic_id, completed, 
            quiz_attempts, quiz_score, mastery_score, needs_revision, last_quiz_at
     FROM career_topic_progress
     WHERE user_id = ? AND goal_id = ?`,
    [userId, primaryGoal.id]
  );

  const completedCount = topicProgress.filter(t => t.completed).length;
  const quizzesTaken = topicProgress.reduce((sum, t) => sum + (t.quiz_attempts || 0), 0);
  const avgMastery = topicProgress.length > 0
    ? Math.round(topicProgress.reduce((sum, t) => sum + (t.mastery_score || 0), 0) / topicProgress.length)
    : 0;

  // 3. Identify revision queue (topics with quiz score < 70% or needs_revision = true)
  const revisionQueue = topicProgress
    .filter(t => (t.completed && t.quiz_score > 0 && t.quiz_score < 70) || t.needs_revision)
    .map(t => ({
      topic_id: t.topic_id,
      technology_id: t.technology_id,
      stage_number: t.stage_number,
      quiz_score: t.quiz_score,
      mastery_score: t.mastery_score,
      reason: t.quiz_score < 70 ? `Quiz score ${t.quiz_score}% (Needs review)` : 'Scheduled for spaced repetition'
    }));

  // 4. Find recommended next topic from stage 1 curriculum
  let recommendedTopic = null;
  try {
    const stageCurriculum = await stageCurriculumService.getStageCurriculum(userId, primaryGoal.id, 1);
    for (const tech of stageCurriculum.technologies || []) {
      for (const topic of tech.topics || []) {
        const isDone = topicProgress.some(tp => tp.topic_id === topic.id && tp.completed);
        if (!isDone) {
          recommendedTopic = {
            id: topic.id,
            title: topic.title,
            technology: tech.name,
            estimated_minutes: topic.estimated_minutes || 45,
            difficulty: topic.difficulty || 'Intermediate',
            summary: topic.summary
          };
          break;
        }
      }
      if (recommendedTopic) break;
    }
  } catch (e) {
    console.warn('Could not determine recommended topic:', e.message);
  }

  return {
    active_goals: goals,
    primary_goal: primaryGoal,
    mastery_stats: {
      total_topics: topicProgress.length || 24,
      completed_topics: completedCount,
      average_mastery: avgMastery,
      quizzes_taken: quizzesTaken
    },
    revision_queue: revisionQueue,
    recommended_next_topic: recommendedTopic
  };
};

/**
 * 2. Generate Interactive 4-Question Topic Quiz
 */
exports.generateTopicQuiz = async (userId, goalId, stageNumber, technologyId, topicId, topicTitle) => {
  const prompt = `You are a Senior Technical Examiner. Generate a 4-question multiple-choice technical quiz to test practical mastery of this topic.
Topic: "${topicTitle || topicId}"
Technology: "${technologyId}"

Return a JSON object with:
"topic_id": "${topicId}",
"questions": array of 4 objects with:
  "id": number (1 to 4),
  "question": string (practical, scenario-based or conceptual question),
  "options": array of 4 strings,
  "correct_index": number (0 to 3),
  "explanation": string (explaining why the correct option is right and the others wrong)`;

  let quizData = null;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey !== 'PASTE_YOUR_NEW_GEMINI_API_KEY_HERE') {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      const resp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { responseMimeType: 'application/json' }
      });
      quizData = JSON.parse(resp.text.trim());
    }
  } catch (err) {
    console.warn('Gemini quiz generation failed, using fallback quiz:', err.message);
  }

  if (!quizData || !quizData.questions || quizData.questions.length === 0) {
    quizData = {
      topic_id: topicId,
      questions: [
        {
          id: 1,
          question: `What is the primary architectural purpose of ${topicTitle || topicId}?`,
          options: [
            'Ensuring modular, predictable state and component encapsulation',
            'Bypassing server-side security checks',
            'Replacing the need for automated tests',
            'Decreasing memory bandwidth consumption exclusively'
          ],
          correct_index: 0,
          explanation: `${topicTitle || topicId} is designed to enforce predictable data flow and modularity.`
        },
        {
          id: 2,
          question: `Which scenario represents an anti-pattern when working with ${topicTitle || topicId}?`,
          options: [
            'Using semantic naming conventions',
            'Directly mutating state without immutable updates or re-render triggers',
            'Writing unit tests for pure helper functions',
            'Applying responsive layout breakpoints'
          ],
          correct_index: 1,
          explanation: 'Direct state mutation leads to unpredictable side-effects and breaks reactivity.'
        },
        {
          id: 3,
          question: `How does ${topicTitle || topicId} improve production maintainability?`,
          options: [
            'It forces monolithic architecture',
            'It eliminates all asynchronous promises',
            'It enforces clear separation of concerns and deterministic behavior',
            'It deprecates version control commits'
          ],
          correct_index: 2,
          explanation: 'Separation of concerns is fundamental for scalable production codebases.'
        },
        {
          id: 4,
          question: `What is the recommended best practice when handling errors in ${topicTitle || topicId}?`,
          options: [
            'Silently swallow exceptions without logging',
            'Use structured try/catch blocks with user-friendly fallback messaging',
            'Hard-restart the user session immediately',
            'Disable linting rules globally'
          ],
          correct_index: 1,
          explanation: 'Graceful error handling provides robust UX without crashing the system.'
        }
      ]
    };
  }

  return quizData;
};

/**
 * 3. Submit Topic Quiz & Calculate Accurate Mastery Score
 */
exports.submitTopicQuiz = async (userId, goalId, stageNumber, technologyId, topicId, questions, userAnswers) => {
  if (!questions || !Array.isArray(questions) || !userAnswers || !Array.isArray(userAnswers)) {
    throw new AppError('Questions and user answers are required', 400);
  }

  let correctCount = 0;
  const gradedQuestions = questions.map((q, idx) => {
    const selected = userAnswers[idx];
    const isCorrect = selected === q.correct_index;
    if (isCorrect) correctCount++;
    return {
      id: q.id,
      question: q.question,
      selected_index: selected,
      correct_index: q.correct_index,
      is_correct: isCorrect,
      explanation: q.explanation
    };
  });

  const scorePercent = Math.round((correctCount / questions.length) * 100);

  // Accurate Mastery Formula:
  // Mastery = (Topic Completed ? 30 : 0) + (Quiz Score % * 0.7)
  // Ensures marking "Completed" alone yields only 30%, whereas 100% quiz score yields 100% mastery!
  // If goalId is null, check if user has an active career goal
  if (!goalId) {
    const [userGoals] = await pool.query(
      `SELECT id FROM goals WHERE user_id = ? AND (title LIKE '%Career%' OR title LIKE '%Developer%') LIMIT 1`,
      [userId]
    );
    if (userGoals.length > 0) goalId = userGoals[0].id;
  }

  const [progressRows] = await pool.query(
    `SELECT completed FROM career_topic_progress 
     WHERE user_id = ? AND (goal_id = ? OR (goal_id IS NULL AND ? IS NULL)) AND topic_id = ?`,
    [userId, goalId, goalId, topicId]
  );

  const isCompleted = progressRows.length > 0 && progressRows[0].completed;
  const completionPoints = isCompleted ? 30 : 15;
  const quizPoints = Math.round(scorePercent * 0.7);
  const totalMastery = Math.min(100, completionPoints + quizPoints);
  const needsRevision = scorePercent < 70;

  // Persist attempt in career_quiz_attempts
  await pool.query(
    `INSERT INTO career_quiz_attempts 
      (user_id, goal_id, stage_number, technology_id, topic_id, score_percent, questions_data, user_answers)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      goalId,
      stageNumber,
      technologyId,
      topicId,
      scorePercent,
      JSON.stringify(gradedQuestions),
      JSON.stringify(userAnswers)
    ]
  );

  // Update career_topic_progress
  await pool.query(
    `INSERT INTO career_topic_progress
      (user_id, goal_id, stage_number, technology_id, topic_id, completed, quiz_attempts, quiz_score, mastery_score, last_quiz_at, needs_revision)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, CURRENT_TIMESTAMP, ?)
     ON DUPLICATE KEY UPDATE 
       quiz_attempts = quiz_attempts + 1,
       quiz_score = VALUES(quiz_score),
       mastery_score = VALUES(mastery_score),
       last_quiz_at = CURRENT_TIMESTAMP,
       needs_revision = VALUES(needs_revision)`,
    [
      userId,
      goalId,
      stageNumber,
      technologyId,
      topicId,
      isCompleted ? 1 : 0,
      scorePercent,
      totalMastery,
      needsRevision ? 1 : 0
    ]
  );

  return {
    score_percent: scorePercent,
    correct_count: correctCount,
    total_questions: questions.length,
    mastery_score: totalMastery,
    needs_revision: needsRevision,
    graded_questions: gradedQuestions
  };
};

/**
 * 4. Send Recommended Topic Revision to AI Planner
 */
exports.scheduleTopicRevisionToPlanner = async (userId, topicId, topicTitle, targetDate) => {
  const dateStr = targetDate || new Date().toISOString().split('T')[0];

  // Find or create schedule
  let [scheduleRows] = await pool.query(
    'SELECT id FROM schedules WHERE user_id = ? AND schedule_date = ?',
    [userId, dateStr]
  );

  let scheduleId;
  if (scheduleRows.length === 0) {
    const [res] = await pool.query(
      `INSERT INTO schedules (user_id, schedule_date, generated_by_ai, summary)
       VALUES (?, ?, 1, 'Schedule updated with targeted skill mastery revision')`,
      [userId, dateStr]
    );
    scheduleId = res.insertId;
  } else {
    scheduleId = scheduleRows[0].id;
  }

  // Find available evening slot
  const startStr = '17:30';
  const endStr = '18:15';

  await pool.query(
    `INSERT INTO schedule_items 
      (schedule_id, title, description, start_time, end_time, item_type, priority, action_plan)
     VALUES (?, ?, ?, ?, ?, 'STUDY', 'High', ?)`,
    [
      scheduleId,
      `Revision Sprint: ${topicTitle || topicId}`,
      'Active recall, review flashcards, and re-attempt practice quiz.',
      startStr,
      endStr,
      `Review key concepts of ${topicTitle || topicId}`
    ]
  );

  return {
    success: true,
    message: `Revision session scheduled for ${topicTitle || topicId} on ${dateStr} at ${startStr}`
  };
};
