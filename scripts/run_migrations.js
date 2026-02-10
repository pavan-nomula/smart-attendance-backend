const fs = require('fs');
const path = require('path');
const db = require('../db');

async function run() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const full = path.join(migrationsDir, file);
    console.log('Running migration:', file);
    const sql = fs.readFileSync(full, 'utf8');
    try {
      await db.query(sql);
      console.log('Applied:', file);
    } catch (err) {
      console.error('Failed applying', file, err && err.message ? err.message : err);
      process.exit(1);
    }
  }

  console.log('All migrations applied.');
  process.exit(0);
}

run().catch(err => {
  console.error('Migration runner failed:', err);
  process.exit(1);
});