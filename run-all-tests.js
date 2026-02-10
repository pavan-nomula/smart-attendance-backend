// Run All Tests
const { exec } = require('child_process');
const path = require('path');

console.log('\n🚀 Running All Tests for Smart Attendance System\n');
console.log('='.repeat(60));

const tests = [
  { name: 'Database Connection', file: 'test-db.js' },
  { name: 'Email Validation', file: 'test-email-validation.js' },
  { name: 'API Structure', file: 'test-api.js' }
];

let currentTest = 0;

function runNextTest() {
  if (currentTest >= tests.length) {
    console.log('\n' + '='.repeat(60));
    console.log('✅ All tests completed!\n');
    return;
  }
  
  const test = tests[currentTest];
  console.log(`\n📋 Running: ${test.name}...`);
  console.log('─'.repeat(60));
  
  exec(`node ${test.file}`, { cwd: __dirname }, (error, stdout, stderr) => {
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    
    if (error) {
      console.error(`❌ ${test.name} failed with exit code ${error.code}`);
    }
    
    currentTest++;
    setTimeout(runNextTest, 500);
  });
}

runNextTest();
