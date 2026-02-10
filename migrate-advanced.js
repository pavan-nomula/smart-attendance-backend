const { pool } = require('./db');

async function updateSchema() {
    try {
        console.log('Updating schema for advanced features...');

        // Add columns to users table
        await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
      ADD COLUMN IF NOT EXISTS department TEXT,
      ADD COLUMN IF NOT EXISTS class_name TEXT;
    `);
        console.log('Updated users table columns.');

        // Create activation_codes table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS activation_codes (
        code TEXT PRIMARY KEY,
        is_used BOOLEAN DEFAULT false,
        role TEXT DEFAULT 'faculty',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
    `);
        console.log('Created activation_codes table.');

        // Seed some activation codes
        await pool.query(`
      INSERT INTO activation_codes (code) 
      VALUES ('VIT-FACULTY-2026'), ('VIT-ALPHA-789')
      ON CONFLICT DO NOTHING;
    `);
        console.log('Seeded activation codes.');

        process.exit(0);
    } catch (err) {
        console.error('Error updating schema:', err);
        process.exit(1);
    }
}

updateSchema();
