const pool = require('../config/db');
const AppError = require('../utils/AppError');

/**
 * 1. Create Simulation Scenario
 */
exports.createSimulationScenario = async (userId, { title, scenario_type, assumptions = {} }) => {
  if (!scenario_type) {
    throw new AppError('Scenario type is required', 400);
  }

  // 1. Snapshot current authorized state
  const [tasks] = await pool.query(
    "SELECT id, title, priority, estimated_minutes, task_date, due_date FROM tasks WHERE user_id = ? AND status != 'COMPLETED'",
    [userId]
  );
  const [goals] = await pool.query(
    "SELECT id, title, target_date, progress FROM goals WHERE user_id = ? AND status != 'COMPLETED'",
    [userId]
  );
  const [habits] = await pool.query(
    'SELECT id, name, frequency, target_count, preferred_time FROM habits WHERE user_id = ?',
    [userId]
  );

  // Current stats
  const totalWeeklyTaskHours = Math.round(
    tasks.reduce((sum, t) => sum + (Number(t.estimated_minutes) || 45), 0) / 60
  );
  const currentWeeklyFreeHours = Math.max(5, 45 - totalWeeklyTaskHours);

  // 2. Compute Proposed Simulation Impact based on scenario_type
  let proposedImpact = {};
  let scenarioTitle = title || '';

  if (scenario_type === 'study_hours') {
    const studyHoursPerDay = Number(assumptions.daily_hours) || 2;
    const additionalWeeklyHours = studyHoursPerDay * 7;
    const newWeeklyFreeHours = Math.max(0, currentWeeklyFreeHours - additionalWeeklyHours);
    const monthsSaved = (additionalWeeklyHours / 14).toFixed(1);

    scenarioTitle = scenarioTitle || `What if I study ${studyHoursPerDay} hours every day?`;
    proposedImpact = {
      scenario_title: scenarioTitle,
      time_required_weekly: additionalWeeklyHours,
      available_hours_before: currentWeeklyFreeHours,
      available_hours_after: newWeeklyFreeHours,
      workload_status: newWeeklyFreeHours < 10 ? 'Heavy Workload (High Commitment)' : 'Balanced Sustainable',
      milestone_changes: [
        `Career Roadmap completion accelerated by approximately ${monthsSaved} months`,
        `Estimated weekly mastery output increases by ${(studyHoursPerDay * 3.5).toFixed(0)} topic revisions`
      ],
      trade_offs: [
        'Requires strict time blocking between 19:00 and 21:00 on weekdays',
        newWeeklyFreeHours < 10 ? 'Leisure and discretionary free time reduced significantly' : 'Minor reduction in evening unstructured time'
      ]
    };
  } else if (scenario_type === 'part_time_job') {
    const jobHoursPerWeek = Number(assumptions.weekly_hours) || 15;
    const newWeeklyFreeHours = Math.max(0, currentWeeklyFreeHours - jobHoursPerWeek);

    scenarioTitle = scenarioTitle || `What if I add a part-time job (${jobHoursPerWeek} hrs/week)?`;
    proposedImpact = {
      scenario_title: scenarioTitle,
      time_required_weekly: jobHoursPerWeek,
      available_hours_before: currentWeeklyFreeHours,
      available_hours_after: newWeeklyFreeHours,
      workload_status: newWeeklyFreeHours < 12 ? 'High Workload Risk' : 'Manageable with Discipline',
      milestone_changes: [
        'Goal milestones may require 3-4 weeks extension to prevent burnout',
        'Study sessions must shift to early mornings (07:00-08:30)'
      ],
      trade_offs: [
        'Financial independence gains balanced against tighter project deadlines',
        'Weekend rest windows become essential for recovery'
      ]
    };
  } else if (scenario_type === 'career_acceleration') {
    const targetMonths = Number(assumptions.target_months) || 4;
    scenarioTitle = scenarioTitle || `Can I finish my Career Roadmap in ${targetMonths} months?`;
    const requiredDailyHours = (120 / (targetMonths * 30)).toFixed(1);

    proposedImpact = {
      scenario_title: scenarioTitle,
      time_required_weekly: Math.round(requiredDailyHours * 7),
      available_hours_before: currentWeeklyFreeHours,
      available_hours_after: Math.max(0, currentWeeklyFreeHours - Math.round(requiredDailyHours * 7)),
      workload_status: requiredDailyHours > 3 ? 'Intensive Bootcamp Mode' : 'Achievable Steady Pace',
      milestone_changes: [
        `Finish all 6 Career Stages by Month ${targetMonths}`,
        `Requires completing 3 topics and 1 practical project every week`
      ],
      trade_offs: [
        `Must commit ${requiredDailyHours} dedicated hours every single day without prolonged breaks`,
        'Active recall quizzes must be completed concurrently'
      ]
    };
  } else {
    // Custom Scenario
    const addedWeeklyHours = Number(assumptions.weekly_hours) || 10;
    scenarioTitle = scenarioTitle || `Custom Planning Scenario: ${assumptions.custom_name || 'New Project'}`;
    proposedImpact = {
      scenario_title: scenarioTitle,
      time_required_weekly: addedWeeklyHours,
      available_hours_before: currentWeeklyFreeHours,
      available_hours_after: Math.max(0, currentWeeklyFreeHours - addedWeeklyHours),
      workload_status: 'Custom Assessment',
      milestone_changes: ['Integrates additional commitment into weekly schedule'],
      trade_offs: ['Requires re-evaluating low-priority task commitments']
    };
  }

  // 3. Persist scenario in simulation_scenarios with status 'draft'
  const [res] = await pool.query(
    `INSERT INTO simulation_scenarios 
      (user_id, title, scenario_type, assumptions, current_state_snapshot, proposed_plan, impact_metrics, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'draft')`,
    [
      userId,
      scenarioTitle,
      scenario_type,
      JSON.stringify(assumptions),
      JSON.stringify({
        active_tasks_count: tasks.length,
        active_goals_count: goals.length,
        active_habits_count: habits.length,
        current_weekly_free_hours: currentWeeklyFreeHours
      }),
      JSON.stringify(proposedImpact),
      JSON.stringify(proposedImpact)
    ]
  );

  return {
    scenario_id: res.insertId,
    title: scenarioTitle,
    scenario_type,
    status: 'draft',
    current_snapshot: {
      weekly_free_hours: currentWeeklyFreeHours,
      active_tasks: tasks.length,
      active_goals: goals.length
    },
    simulation_result: proposedImpact
  };
};

/**
 * 2. List User's Saved Simulation Scenarios
 */
exports.listSimulationScenarios = async (userId) => {
  const [rows] = await pool.query(
    `SELECT id, title, scenario_type, status, assumptions, impact_metrics, created_at, updated_at
     FROM simulation_scenarios
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [userId]
  );

  return rows.map(r => {
    let assumptions = r.assumptions;
    let impact = r.impact_metrics;
    if (typeof assumptions === 'string') {
      try { assumptions = JSON.parse(assumptions); } catch (e) { assumptions = {}; }
    }
    if (typeof impact === 'string') {
      try { impact = JSON.parse(impact); } catch (e) { impact = {}; }
    }
    return {
      ...r,
      assumptions: assumptions || {},
      impact_metrics: impact || {}
    };
  });
};

/**
 * 3. Apply Scenario (Explicit Confirmed Action)
 */
exports.applySimulationScenario = async (userId, scenarioId) => {
  const [rows] = await pool.query(
    'SELECT * FROM simulation_scenarios WHERE id = ? AND user_id = ?',
    [scenarioId, userId]
  );

  if (rows.length === 0) {
    throw new AppError('Scenario not found or unauthorized', 404);
  }

  const scenario = rows[0];
  let impact = scenario.impact_metrics;
  if (typeof impact === 'string') {
    try { impact = JSON.parse(impact); } catch (e) { impact = {}; }
  }

  // Update status to 'applied'
  await pool.query(
    "UPDATE simulation_scenarios SET status = 'applied', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [scenarioId]
  );

  // Create an explicit task representing the adopted scenario commitment
  await pool.query(
    `INSERT INTO tasks (user_id, title, description, priority, category, estimated_minutes, status)
     VALUES (?, ?, ?, 'High', 'Strategy', ?, 'TODO')`,
    [
      userId,
      `Adopted Scenario: ${scenario.title}`,
      `Committed to scenario "${scenario.title}". Target: ${impact.time_required_weekly || 10} hours/week dedicated.`,
      (Number(impact.time_required_weekly) || 10) * 60
    ]
  );

  return {
    success: true,
    message: `Scenario "${scenario.title}" has been successfully applied to your active LifeOS plan.`,
    scenario_id: scenarioId,
    status: 'applied'
  };
};
