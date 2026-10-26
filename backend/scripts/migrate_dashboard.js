const pool = require('../src/config/db');

async function migrate() {
  try {
    const [cols] = await pool.query('SHOW COLUMNS FROM users');
    const colNames = cols.map(c => c.Field);
    
    if (!colNames.includes('current_streak')) {
      console.log('Adding current_streak column to users...');
      await pool.query('ALTER TABLE users ADD COLUMN current_streak INT DEFAULT 0');
    } else {
      console.log('current_streak already exists in users.');
    }

    if (!colNames.includes('last_login_date')) {
      console.log('Adding last_login_date column to users...');
      await pool.query('ALTER TABLE users ADD COLUMN last_login_date DATE DEFAULT NULL');
    } else {
      console.log('last_login_date already exists in users.');
    }

    console.log('Creating user_daily_usage table...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_daily_usage (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        usage_date DATE NOT NULL,
        seconds_tracked INT DEFAULT 0,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_usage_date (user_id, usage_date),
        INDEX idx_usage_date (usage_date),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('Ensuring schedule_items item_type includes ROUTINE...');
    await pool.query(`
      ALTER TABLE schedule_items 
      MODIFY COLUMN item_type ENUM('TASK', 'GOAL', 'HABIT', 'EVENT', 'BREAK', 'FOCUS', 'ROUTINE') DEFAULT 'TASK';
    `);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
