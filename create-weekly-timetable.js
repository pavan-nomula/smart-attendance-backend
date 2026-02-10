const db = require('./db');

async function createTable() {
    try {
        console.log('Creating weekly_timetable table...');
        await db.query(`
      CREATE TABLE IF NOT EXISTS weekly_timetable (
        id SERIAL PRIMARY KEY,
        day_of_week TEXT NOT NULL, 
        subject TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        faculty_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        faculty_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

        // Add index for fast lookups
        await db.query(`CREATE INDEX IF NOT EXISTS idx_weekly_timetable_day ON weekly_timetable(day_of_week);`);
        await db.query(`CREATE INDEX IF NOT EXISTS idx_weekly_timetable_faculty ON weekly_timetable(faculty_id);`);

        console.log('✅ weekly_timetable table created successfully.');
    } catch (err) {
        console.error('❌ Error creating table:', err);
    } finally {
        process.exit();
    }
}

createTable();
