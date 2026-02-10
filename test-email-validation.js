// Email Validation Test
const pattern = /^(24pa|25pa)[a-z0-9]+$/i;

console.log('\n🧪 Testing Email Validation Pattern...\n');

const testCases = [
  { email: '24pa1a0250@vishnu.edu.in', expected: true, description: 'Valid student email with letters' },
  { email: '25pa2b1234@vishnu.edu.in', expected: true, description: 'Valid student email 25pa' },
  { email: '24pa12345@vishnu.edu.in', expected: true, description: 'Valid student email numbers only' },
  { email: '24PA1A0250@vishnu.edu.in', expected: true, description: 'Valid student email uppercase' },
  { email: 'invalid@vishnu.edu.in', expected: false, description: 'Invalid - no 24pa/25pa' },
  { email: '24pa@vishnu.edu.in', expected: false, description: 'Invalid - no characters after 24pa' },
  { email: 'naveen.m@vishnu.edu.in', expected: false, description: 'Invalid - faculty pattern' },
];

let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
  const prefix = test.email.split('@')[0];
  const result = pattern.test(prefix);
  const status = result === test.expected ? '✅' : '❌';
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status} Test ${index + 1}: ${test.email}`);
  console.log(`   Expected: ${test.expected ? 'VALID' : 'INVALID'}, Got: ${result ? 'VALID' : 'INVALID'}`);
  console.log(`   ${test.description}\n`);
});

console.log('─'.repeat(50));
console.log(`✅ Passed: ${passed}/${testCases.length}`);
console.log(`❌ Failed: ${failed}/${testCases.length}`);

if (failed === 0) {
  console.log('🎉 All email validation tests passed!\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed!\n');
  process.exit(1);
}
