// Script to generate password hash for admin user
// Run: node scripts/generate_password_hash.js

const bcrypt = require('bcrypt');

async function generateHash() {
  const password = process.argv[2] || 'admin123';
  const hash = await bcrypt.hash(password, 10);
  console.log('\n========================================');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('========================================\n');
  console.log('Use this hash in your SQL:');
  console.log(`INSERT INTO users (name, email, password_hash, role)`);
  console.log(`VALUES ('Admin', 'admin@vishnu.edu.in', '${hash}', 'incharge');`);
  console.log('\n');
}

generateHash().catch(console.error);
