const pool = require('../src/config/db');

async function migrateV4() {
  console.log('--- Running Migration V4: Admin Console Enhancements ---');
  try {
    // 1. Add block fields to users table if missing
    try {
      await pool.query('ALTER TABLE users ADD COLUMN blocked_until DATETIME NULL');
      console.log('✓ users.blocked_until column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  users.blocked_until exists');
    }

    try {
      await pool.query('ALTER TABLE users ADD COLUMN block_reason TEXT NULL');
      console.log('✓ users.block_reason column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  users.block_reason exists');
    }

    try {
      await pool.query('ALTER TABLE users ADD COLUMN blocked_by INT NULL');
      console.log('✓ users.blocked_by column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  users.blocked_by exists');
    }

    try {
      await pool.query('ALTER TABLE users ADD COLUMN blocked_at TIMESTAMP NULL');
      console.log('✓ users.blocked_at column added');
    } catch (e) {
      if (!e.message.includes('Duplicate column')) console.log('  users.blocked_at exists');
    }

    // 2. Create account_block_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS account_block_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        admin_id INT NULL,
        action ENUM('BLOCK', 'UNBLOCK') NOT NULL,
        duration_days INT NULL,
        block_reason TEXT NULL,
        blocked_until DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_block_hist_user (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    console.log('✓ account_block_history table ready');

    // 3. Create help_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS help_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        request_id VARCHAR(50) NOT NULL UNIQUE,
        user_id INT NULL,
        email VARCHAR(255) NOT NULL,
        username VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        status ENUM('NEW', 'IN_REVIEW', 'RESOLVED', 'CLOSED') DEFAULT 'NEW',
        admin_response TEXT NULL,
        assigned_admin_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        resolved_at TIMESTAMP NULL,
        INDEX idx_help_user (user_id),
        INDEX idx_help_status (status),
        INDEX idx_help_req_id (request_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
    console.log('✓ help_requests table ready');

    console.log('--- Migration V4 Finished Successfully ---');
  } catch (err) {
    console.error('Migration V4 failed:', err);
  } finally {
    process.exit();
  }
}

migrateV4();
