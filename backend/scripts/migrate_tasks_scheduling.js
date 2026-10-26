const pool = require('../src/config/db');

async function migrate() {
  try {
    const [cols] = await pool.query('DESCRIBE tasks');
    const existingColNames = cols.map(c => c.Field);

    if (!existingColNames.includes('task_date')) {
      await pool.query('ALTER TABLE tasks ADD COLUMN task_date DATE NULL AFTER title');
      console.log('Added task_date column');
    }
    if (!existingColNames.includes('start_time')) {
      await pool.query('ALTER TABLE tasks ADD COLUMN start_time VARCHAR(8) NULL AFTER task_date');
      console.log('Added start_time column');
    }
    if (!existingColNames.includes('end_time')) {
      await pool.query('ALTER TABLE tasks ADD COLUMN end_time VARCHAR(8) NULL AFTER start_time');
      console.log('Added end_time column');
    }
    if (!existingColNames.includes('completed_at')) {
      await pool.query('ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP NULL AFTER status');
      console.log('Added completed_at column');
    }

    console.log('Tasks table migration complete.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    process.exit(0);
  }
}

migrate();
