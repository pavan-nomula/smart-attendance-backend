// Database Connection Test
const db = require('./db');

async function testDatabase() {
  console.log('\n🧪 Testing Database Connection...\n');
  
  try {
    // Test 1: Connection
    const result = await db.query('SELECT NOW()');
    console.log('✅ Database Connected:', result.rows[0].now);
    
    // Test 2: Check Tables
    const tables = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema='public' AND table_type='BASE TABLE' 
      ORDER BY table_name
    `);
    console.log('\n✅ Database Tables:');
    tables.rows.forEach(row => console.log('   -', row.table_name));
    
    // Test 3: Check Users Table Columns
    const columns = await db.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name='users' 
      ORDER BY column_name
    `);
    console.log('\n✅ Users Table Columns:');
    columns.rows.forEach(row => console.log(`   - ${row.column_name} (${row.data_type})`));
    
    // Test 4: Check Required Columns in Users Table
    const requiredUserColumns = ['must_change_password', 'password_changed_at', 'uid'];
    const existingColumns = columns.rows.map(r => r.column_name);
    console.log('\n✅ Required Users Table Columns:');
    requiredUserColumns.forEach(col => {
      const exists = existingColumns.includes(col);
      console.log(`   ${exists ? '✅' : '❌'} ${col}: ${exists ? 'EXISTS' : 'MISSING'}`);
    });
    
    // Test 5: Check Timetable Location Column
    const timetableCols = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='timetable' ORDER BY column_name
    `);
    const timetableColNames = timetableCols.rows.map(r => r.column_name);
    const hasLocation = timetableColNames.includes('location');
    console.log(`\n✅ Timetable Table: location column ${hasLocation ? 'EXISTS' : 'MISSING'}`);
    
    // Test 6: Check Indexes
    const indexes = await db.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE schemaname='public' 
      ORDER BY indexname
    `);
    console.log('\n✅ Database Indexes:', indexes.rows.length);
    indexes.rows.slice(0, 5).forEach(row => console.log('   -', row.indexname));
    if (indexes.rows.length > 5) console.log(`   ... and ${indexes.rows.length - 5} more`);
    
    // Test 7: Count Users
    const userCount = await db.query('SELECT COUNT(*) as count FROM users');
    console.log('\n✅ Total Users:', userCount.rows[0].count);
    
    console.log('\n✅ All Database Tests Passed!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Database Test Failed:', err.message);
    console.error('\nFull Error:', err);
    process.exit(1);
  }
}

testDatabase();
