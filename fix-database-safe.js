// Fix Database Schema - Add Missing Columns (Safe Version)
const db = require('./db');

async function fixDatabase() {
  console.log('\n🔧 Fixing Database Schema (Safe Mode)...\n');
  
  try {
    // Check and add missing columns to users table
    console.log('📋 Checking users table...');
    const userColumns = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='users'
    `);
    const userColNames = userColumns.rows.map(r => r.column_name);
    
    if (!userColNames.includes('must_change_password')) {
      await db.query('ALTER TABLE users ADD COLUMN must_change_password BOOLEAN DEFAULT false');
      console.log('  ✅ Added must_change_password column');
    } else {
      console.log('  ✅ must_change_password already exists');
    }
    
    if (!userColNames.includes('password_changed_at')) {
      await db.query('ALTER TABLE users ADD COLUMN password_changed_at TIMESTAMP WITH TIME ZONE');
      console.log('  ✅ Added password_changed_at column');
    } else {
      console.log('  ✅ password_changed_at already exists');
    }
    
    // Check and add location to timetable
    console.log('\n📋 Checking timetable table...');
    const timetableColumns = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='timetable'
    `);
    const timetableColNames = timetableColumns.rows.map(r => r.column_name);
    
    if (!timetableColNames.includes('location')) {
      await db.query('ALTER TABLE timetable ADD COLUMN location TEXT');
      console.log('  ✅ Added location column');
    } else {
      console.log('  ✅ location already exists');
    }
    
    // Check permissions table for faculty_id
    console.log('\n📋 Checking permissions table...');
    const permColumns = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='permissions'
    `);
    const permColNames = permColumns.rows.map(r => r.column_name);
    
    if (!permColNames.includes('faculty_id')) {
      await db.query(`
        ALTER TABLE permissions 
        ADD COLUMN faculty_id INTEGER REFERENCES users(id) ON DELETE SET NULL
      `);
      console.log('  ✅ Added faculty_id column');
    } else {
      console.log('  ✅ faculty_id already exists');
    }
    
    // Create indexes if they don't exist
    console.log('\n📋 Creating indexes...');
    try {
      await db.query('CREATE INDEX IF NOT EXISTS idx_attendance_period ON attendance(period_id)');
      console.log('  ✅ idx_attendance_period');
    } catch (e) {
      console.log('  ⚠️  idx_attendance_period (may already exist)');
    }
    
    try {
      await db.query('CREATE INDEX IF NOT EXISTS idx_permissions_faculty ON permissions(faculty_id)');
      console.log('  ✅ idx_permissions_faculty');
    } catch (e) {
      console.log('  ⚠️  idx_permissions_faculty (may already exist)');
    }
    
    try {
      await db.query('CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid)');
      console.log('  ✅ idx_users_uid');
    } catch (e) {
      console.log('  ⚠️  idx_users_uid (may already exist)');
    }
    
    try {
      await db.query('CREATE INDEX IF NOT EXISTS idx_timetable_day ON timetable(day_of_week)');
      console.log('  ✅ idx_timetable_day');
    } catch (e) {
      console.log('  ⚠️  idx_timetable_day (may already exist)');
    }
    
    try {
      await db.query('CREATE INDEX IF NOT EXISTS idx_complaints_student ON complaints(student_id)');
      console.log('  ✅ idx_complaints_student');
    } catch (e) {
      console.log('  ⚠️  idx_complaints_student (may already exist)');
    }
    
    try {
      await db.query('CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status)');
      console.log('  ✅ idx_complaints_status');
    } catch (e) {
      console.log('  ⚠️  idx_complaints_status (may already exist)');
    }
    
    // Verify
    console.log('\n✅ Verification:');
    const finalUserCols = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='users' ORDER BY column_name
    `);
    const finalUserColNames = finalUserCols.rows.map(r => r.column_name);
    
    const required = ['must_change_password', 'password_changed_at'];
    required.forEach(col => {
      const exists = finalUserColNames.includes(col);
      console.log(`   ${exists ? '✅' : '❌'} users.${col}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
    const finalTimetableCols = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='timetable' ORDER BY column_name
    `);
    const finalTimetableColNames = finalTimetableCols.rows.map(r => r.column_name);
    console.log(`   ${finalTimetableColNames.includes('location') ? '✅' : '❌'} timetable.location: ${finalTimetableColNames.includes('location') ? 'EXISTS' : 'MISSING'}`);
    
    console.log('\n✅ Database schema fixed successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error fixing database:', err.message);
    console.error('\nFull Error:', err);
    process.exit(1);
  }
}

fixDatabase();
