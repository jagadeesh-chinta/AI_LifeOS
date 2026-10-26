const pool = require('../src/config/db');

async function migrate() {
  console.log('--- Running Migration V2 ---');
  try {
    // 1. admin_users
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✓ admin_users table ready');

    // 2. user_login_logs (accurate login/logout session tracking)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_login_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        logout_time TIMESTAMP NULL,
        ip_address VARCHAR(100) NULL,
        user_agent VARCHAR(255) NULL,
        is_active BOOLEAN DEFAULT TRUE,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ user_login_logs table ready');

    // 3. Add columns to users if missing
    try {
      await pool.query('ALTER TABLE users ADD COLUMN last_logout_date TIMESTAMP NULL');
      console.log('✓ users.last_logout_date column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  users.last_logout_date exists');
    }

    try {
      await pool.query("ALTER TABLE users ADD COLUMN account_status VARCHAR(50) DEFAULT 'ACTIVE'");
      console.log('✓ users.account_status column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  users.account_status exists');
    }

    // 4. Add duration and roadmap fields to goals table if missing
    try {
      await pool.query('ALTER TABLE goals ADD COLUMN duration_value INT NULL');
      console.log('✓ goals.duration_value column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  goals.duration_value exists');
    }

    try {
      await pool.query("ALTER TABLE goals ADD COLUMN duration_unit VARCHAR(20) DEFAULT 'Months'");
      console.log('✓ goals.duration_unit column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  goals.duration_unit exists');
    }

    try {
      await pool.query('ALTER TABLE goals ADD COLUMN custom_duration VARCHAR(100) NULL');
      console.log('✓ goals.custom_duration column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  goals.custom_duration exists');
    }

    try {
      await pool.query('ALTER TABLE goals ADD COLUMN career_roadmap JSON NULL');
      console.log('✓ goals.career_roadmap column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  goals.career_roadmap exists');
    }

    // 5. notifications
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'INFO',
        is_read BOOLEAN DEFAULT FALSE,
        link VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ notifications table ready');

    // 6. timetables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS timetables (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        title VARCHAR(255) NOT NULL,
        day_of_week VARCHAR(20) NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) NOT NULL,
        activity_type VARCHAR(50) DEFAULT 'STUDY',
        color VARCHAR(50) DEFAULT '#06b6d4',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ timetables table ready');

    // 7. travel_plans
    await pool.query(`
      CREATE TABLE IF NOT EXISTS travel_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        destination VARCHAR(255) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        budget DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        preferences TEXT NULL,
        itinerary JSON NULL,
        estimated_expenses JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ travel_plans table ready');

    // 8. budget_entries
    await pool.query(`
      CREATE TABLE IF NOT EXISTS budget_entries (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        type VARCHAR(20) NOT NULL,
        category VARCHAR(100) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        period VARCHAR(50) DEFAULT 'Monthly',
        description VARCHAR(255) NULL,
        entry_date DATE NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ budget_entries table ready');

    console.log('--- Migration V2 Finished Successfully ---');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit();
  }
}

migrate();
