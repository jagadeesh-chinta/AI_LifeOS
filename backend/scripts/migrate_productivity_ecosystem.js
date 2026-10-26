const pool = require('../src/config/db');

async function migrate() {
  console.log('--- Running Productivity Ecosystem Migration ---');
  try {
    // 1. task_subtasks
    await pool.query(`
      CREATE TABLE IF NOT EXISTS task_subtasks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        task_id INT NOT NULL,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NULL,
        estimated_minutes INT DEFAULT 30,
        priority VARCHAR(20) DEFAULT 'Medium',
        suggested_order INT DEFAULT 1,
        dependencies JSON NULL,
        completion_criteria TEXT NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP NULL,
        scheduled_date DATE NULL,
        scheduled_start_time VARCHAR(10) NULL,
        scheduled_end_time VARCHAR(10) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_subtask_user_task (task_id, user_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ task_subtasks table ready');

    // 2. Add columns to career_topic_progress if missing
    try {
      await pool.query('ALTER TABLE career_topic_progress ADD COLUMN quiz_attempts INT DEFAULT 0');
      console.log('✓ career_topic_progress.quiz_attempts column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  career_topic_progress.quiz_attempts exists');
    }

    try {
      await pool.query('ALTER TABLE career_topic_progress ADD COLUMN quiz_score INT DEFAULT 0');
      console.log('✓ career_topic_progress.quiz_score column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  career_topic_progress.quiz_score exists');
    }

    try {
      await pool.query('ALTER TABLE career_topic_progress ADD COLUMN mastery_score INT DEFAULT 0');
      console.log('✓ career_topic_progress.mastery_score column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  career_topic_progress.mastery_score exists');
    }

    try {
      await pool.query('ALTER TABLE career_topic_progress ADD COLUMN last_quiz_at TIMESTAMP NULL');
      console.log('✓ career_topic_progress.last_quiz_at column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  career_topic_progress.last_quiz_at exists');
    }

    try {
      await pool.query('ALTER TABLE career_topic_progress ADD COLUMN needs_revision BOOLEAN DEFAULT FALSE');
      console.log('✓ career_topic_progress.needs_revision column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  career_topic_progress.needs_revision exists');
    }

    // 3. career_quiz_attempts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS career_quiz_attempts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        goal_id INT NULL,
        stage_number INT NOT NULL,
        technology_id VARCHAR(100) NOT NULL,
        topic_id VARCHAR(150) NOT NULL,
        score_percent INT NOT NULL,
        questions_data JSON NOT NULL,
        user_answers JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_quiz_user_topic (user_id, topic_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ career_quiz_attempts table ready');

    // 4. simulation_scenarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS simulation_scenarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        scenario_type VARCHAR(100) NOT NULL,
        assumptions JSON NOT NULL,
        current_state_snapshot JSON NOT NULL,
        proposed_plan JSON NOT NULL,
        impact_metrics JSON NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_scenario_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ simulation_scenarios table ready');

    // 5. weekly_reviews
    await pool.query(`
      CREATE TABLE IF NOT EXISTS weekly_reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        week_start_date DATE NOT NULL,
        week_end_date DATE NOT NULL,
        report_data JSON NOT NULL,
        insights JSON NOT NULL,
        next_week_plan JSON NOT NULL,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_week (user_id, week_start_date),
        INDEX idx_weekly_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ weekly_reviews table ready');

    // 6. ai_assistant_chats
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_assistant_chats (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        session_id VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        action_proposal JSON NULL,
        action_status VARCHAR(50) DEFAULT 'none',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_chat_user_session (user_id, session_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ ai_assistant_chats table ready');

    // 7. lifeos_insights
    await pool.query(`
      CREATE TABLE IF NOT EXISTS lifeos_insights (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        module VARCHAR(50) NOT NULL,
        insight_key VARCHAR(150) NOT NULL,
        title VARCHAR(255) NOT NULL,
        explanation TEXT NOT NULL,
        supporting_data JSON NULL,
        priority VARCHAR(20) DEFAULT 'medium',
        action_type VARCHAR(100) NULL,
        action_payload JSON NULL,
        is_dismissed BOOLEAN DEFAULT FALSE,
        is_resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_insight (user_id, insight_key),
        INDEX idx_insight_user (user_id, is_dismissed, is_resolved),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✓ lifeos_insights table ready');

    console.log('--- Migration completed successfully! ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
