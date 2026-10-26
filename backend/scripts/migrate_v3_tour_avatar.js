const pool = require('../src/config/db');

async function migrate() {
  console.log('--- Running Migration V3: Tour State & Avatar Fields ---');
  try {
    // 1. Expand avatar column to TEXT to ensure long Cloudinary secure URLs fit safely
    try {
      await pool.query('ALTER TABLE users MODIFY COLUMN avatar TEXT NULL');
      console.log('✓ users.avatar modified to TEXT');
    } catch (e) {
      console.log('  avatar modify notice:', e.message);
    }

    // 2. Add avatar_public_id to track Cloudinary asset for safe deletions upon replacement
    try {
      await pool.query('ALTER TABLE users ADD COLUMN avatar_public_id VARCHAR(255) NULL');
      console.log('✓ users.avatar_public_id column added');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('  users.avatar_public_id column already exists');
      } else {
        console.error('Error adding avatar_public_id:', e.message);
      }
    }

    // 3. Add tour_completed column (DEFAULT FALSE for new registrations)
    let columnJustAdded = false;
    try {
      await pool.query('ALTER TABLE users ADD COLUMN tour_completed BOOLEAN NOT NULL DEFAULT FALSE');
      console.log('✓ users.tour_completed column added with DEFAULT FALSE');
      columnJustAdded = true;
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('  users.tour_completed column already exists');
      } else {
        console.error('Error adding tour_completed:', e.message);
      }
    }

    // 4. If column was just added, mark all existing users as completed so existing users do not see the tour
    if (columnJustAdded) {
      await pool.query('UPDATE users SET tour_completed = TRUE');
      console.log('✓ Marked all existing users as tour_completed = TRUE (existing users will not see tour)');
    }

    console.log('--- Migration V3 Finished Successfully ---');
    process.exit(0);
  } catch (err) {
    console.error('Migration V3 failed:', err);
    process.exit(1);
  }
}

migrate();
