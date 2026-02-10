// Fix Database Schema - Add Missing Columns
const db = require('./db');
const fs = require('fs');
const path = require('path');

async function fixDatabase() {
  console.log('\n🔧 Fixing Database Schema...\n');
  
  try {
    // Read the fix schema SQL
    const sqlFile = path.join(__dirname, 'migrations', 'fix_schema.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    // Execute the SQL
    await db.query(sql);
    
    console.log('✅ Database schema fixed successfully!\n');
    
    // Verify the fix
    const columns = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='users' ORDER BY column_name
    `);
    
    const requiredColumns = ['must_change_password', 'password_changed_at'];
    console.log('✅ Verification:');
    requiredColumns.forEach(col => {
      const exists = columns.rows.some(r => r.column_name === col);
      console.log(`   ${exists ? '✅' : '❌'} ${col}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
    // Check timetable location column
    const timetableColumns = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='timetable' ORDER BY column_name
    `);
    const hasLocation = timetableColumns.rows.some(r => r.column_name === 'location');
    console.log(`   ${hasLocation ? '✅' : '❌'} timetable.location: ${hasLocation ? 'EXISTS' : 'MISSING'}`);
    
    console.log('\n✅ All columns added successfully!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error fixing database:', err.message);
    console.error('\nFull Error:', err);
    process.exit(1);
  }
}

fixDatabase();
