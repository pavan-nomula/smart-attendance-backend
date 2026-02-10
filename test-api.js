// API Endpoints Test
const express = require('express');
const app = express();
const db = require('./db');

async function testAPI() {
  console.log('\n🧪 Testing API Endpoints...\n');
  
  const tests = [];
  
  // Test 1: Health Check
  try {
    const result = await db.query('SELECT NOW()');
    tests.push({ name: 'Health Check', status: '✅', message: 'Database connected' });
  } catch (err) {
    tests.push({ name: 'Health Check', status: '❌', message: err.message });
  }
  
  // Test 2: Users Table Structure
  try {
    const columns = await db.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name='users' ORDER BY column_name
    `);
    const hasRequired = ['id', 'name', 'email', 'password_hash', 'role'].every(col => 
      columns.rows.some(r => r.column_name === col)
    );
    tests.push({ 
      name: 'Users Table Structure', 
      status: hasRequired ? '✅' : '❌', 
      message: hasRequired ? 'All required columns exist' : 'Missing required columns' 
    });
  } catch (err) {
    tests.push({ name: 'Users Table Structure', status: '❌', message: err.message });
  }
  
  // Test 3: Email Validation Pattern
  try {
    const pattern = /^(24pa|25pa)[a-z0-9]+$/i;
    const testEmails = [
      { email: '24pa1a0250@vishnu.edu.in', expected: true },
      { email: '25pa2b1234@vishnu.edu.in', expected: true },
      { email: '24pa12345@vishnu.edu.in', expected: true },
      { email: 'invalid@vishnu.edu.in', expected: false }
    ];
    
    let passed = 0;
    testEmails.forEach(test => {
      const prefix = test.email.split('@')[0];
      const result = pattern.test(prefix);
      if (result === test.expected) passed++;
    });
    
    tests.push({ 
      name: 'Email Validation', 
      status: passed === testEmails.length ? '✅' : '❌', 
      message: `${passed}/${testEmails.length} tests passed` 
    });
  } catch (err) {
    tests.push({ name: 'Email Validation', status: '❌', message: err.message });
  }
  
  // Test 4: Check Foreign Keys
  try {
    const fks = await db.query(`
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_name
    `);
    tests.push({ 
      name: 'Foreign Keys', 
      status: '✅', 
      message: `${fks.rows.length} foreign key constraints found` 
    });
  } catch (err) {
    tests.push({ name: 'Foreign Keys', status: '❌', message: err.message });
  }
  
  // Test 5: Check Indexes
  try {
    const indexes = await db.query(`
      SELECT COUNT(*) as count FROM pg_indexes WHERE schemaname='public'
    `);
    tests.push({ 
      name: 'Database Indexes', 
      status: '✅', 
      message: `${indexes.rows[0].count} indexes created` 
    });
  } catch (err) {
    tests.push({ name: 'Database Indexes', status: '❌', message: err.message });
  }
  
  // Print Results
  console.log('Test Results:');
  console.log('─'.repeat(50));
  tests.forEach(test => {
    console.log(`${test.status} ${test.name.padEnd(30)} ${test.message}`);
  });
  console.log('─'.repeat(50));
  
  const passed = tests.filter(t => t.status === '✅').length;
  const total = tests.length;
  
  console.log(`\n✅ Passed: ${passed}/${total}`);
  if (passed === total) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please check the errors above.\n');
    process.exit(1);
  }
}

testAPI();
